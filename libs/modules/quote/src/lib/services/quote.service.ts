import { Injectable, Logger } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { randomBytes } from 'node:crypto';
import { ClientSession, Connection, Model, QueryFilter, Types, UpdateQuery } from 'mongoose';
import { readFiniteNumber, readTrimmedString } from '@vt/common-utils';
import { computeCheckoutPricing } from '@vt/ecommerce-core/pricing';
import {
  createMongoTransactionSupportResolver,
  GHS_CATALOG_TOPICS,
  OutboxService,
  type GhsQuotePayload,
  withMongoTransaction,
} from '@vt/platform-events';
import {
  DomainBadRequestException,
  DomainException,
  DomainNotFoundException,
} from '@vt/platform-error';
import { buildApplicationScopeEventMetadata, GHS_APPLICATION_SCOPE_ID } from '@gomhoasen/core';
import { RfqService, RfqStatus } from '@gomhoasen/rfq';
import { CreateQuoteDto, QuoteLineItemDto, UpdateQuoteDto } from '../dto/quote.dto';
import { Counter, CounterDocument } from '../schemas/counter.schema';
import { Quote, QuoteDocument, QuoteStatus } from '../schemas/quote.schema';
import { QUOTE_ERRORS } from '../constants/quote.constants';
import { assertQuoteTransition } from '../constants/quote-transitions';
import { buildInitialQuoteValues } from '../constants/quote-writer-initial-values';

function yyyymmdd(date = new Date()) {
  return date.toISOString().slice(0, 10).replace(/-/g, '');
}

function rejectInvalidQuoteLine(message: string): never {
  throw new DomainBadRequestException(QUOTE_ERRORS.QUOTE_INVALID_LINE_ITEM, message);
}

function readRequiredPositiveQuoteNumber(value: unknown, fieldName: string): number {
  const parsed = readFiniteNumber(value);
  if (parsed === undefined || parsed <= 0) {
    rejectInvalidQuoteLine(`${fieldName} must be a positive finite number.`);
  }

  return parsed;
}

function readRequiredNonNegativeQuoteNumber(value: unknown, fieldName: string): number {
  const parsed = readFiniteNumber(value);
  if (parsed === undefined || parsed < 0) {
    rejectInvalidQuoteLine(`${fieldName} must be a non-negative finite number.`);
  }

  return parsed;
}

function readQuoteDiscount(value: unknown): number {
  if (value === null || value === undefined) {
    return 0;
  }

  return readRequiredNonNegativeQuoteNumber(value, 'discount');
}

const DEFAULT_QUOTE_TERMS = 'Thanh toán 30% đặt cọc, phần còn lại trước khi bàn giao.';

function readQuoteTerms(value: unknown): string {
  return readTrimmedString(value) ?? DEFAULT_QUOTE_TERMS;
}

const PUBLIC_QUOTE_LINK_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const MAX_QUOTE_SEARCH_LENGTH = 120;

function escapeRegexLiteral(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function isFutureDate(value: unknown): value is Date {
  return value instanceof Date && Number.isFinite(value.getTime()) && value.getTime() > Date.now();
}

function createPublicShareToken(): string {
  return randomBytes(18).toString('hex');
}

@Injectable()
export class QuoteService {
  private readonly logger = new Logger(QuoteService.name);
  private readonly transactionSupportResolver = createMongoTransactionSupportResolver({
    db: () => this.connection.db,
    warn: (message) => this.logger.warn(message),
    warnContext: 'quote.create',
  });

  constructor(
    @InjectModel(Quote.name) private quoteModel: Model<QuoteDocument>,
    @InjectModel(Counter.name) private counterModel: Model<CounterDocument>,
    private rfqService: RfqService,
    @InjectConnection() private readonly connection: Connection,
    private readonly outbox: OutboxService,
  ) {}

  async findAll(query: { status?: QuoteStatus; search?: string }) {
    const filter: QueryFilter<QuoteDocument> = {};
    if (query.status) filter.status = query.status;
    const normalizedSearch = readTrimmedString(query.search)?.slice(0, MAX_QUOTE_SEARCH_LENGTH);
    if (normalizedSearch) {
      const safePattern = new RegExp(escapeRegexLiteral(normalizedSearch), 'i');
      filter.$or = [
        { code: safePattern },
        { customerName: safePattern },
        { customerPhone: safePattern },
      ];
    }
    return this.quoteModel.find(filter).sort({ createdAt: -1 });
  }

  async findById(id: string) {
    const quote = await this.quoteModel.findById(id);
    if (!quote) throw new DomainNotFoundException(QUOTE_ERRORS.QUOTE_NOT_FOUND, 'Báo giá không tồn tại');
    return quote;
  }

  async findPublicByShareToken(token: string) {
    const normalizedToken = readTrimmedString(token);
    if (normalizedToken === undefined) {
      throw new DomainNotFoundException(QUOTE_ERRORS.QUOTE_NOT_FOUND, 'BÃ¡o giÃ¡ khÃ´ng tá»“n táº¡i');
    }

    const quote = await this.quoteModel.findOne({
      publicShareToken: normalizedToken,
      status: QuoteStatus.SENT,
    });

    if (
      !quote ||
      !quote.sentAt ||
      readTrimmedString(quote.publicShareToken) === undefined ||
      quote.publicShareRevokedAt instanceof Date ||
      !isFutureDate(quote.publicShareExpiresAt)
    ) {
      throw new DomainNotFoundException(QUOTE_ERRORS.QUOTE_NOT_FOUND, 'BÃ¡o giÃ¡ khÃ´ng tá»“n táº¡i');
    }

    return quote;
  }

  async create(dto: CreateQuoteDto, createdBy?: string) {
    const rfq = await this.rfqService.findById(dto.rfqId);
    const totals = this.buildItems(dto.items, dto.discount);

    const persistQuote = async (session: ClientSession | null) => {
      const draft = buildInitialQuoteValues({
        code: await this.nextCode(session),
        rfqId: new Types.ObjectId(dto.rfqId),
        customerName: rfq.customerName,
        customerPhone: rfq.customerPhone,
        customerEmail: rfq.customerEmail,
        ...totals,
        terms: readQuoteTerms(dto.terms),
        validUntil: dto.validUntil,
        createdBy: createdBy && Types.ObjectId.isValid(createdBy) ? new Types.ObjectId(createdBy) : undefined,
      });
      const [quote] = session
        ? await this.quoteModel.create([draft], { session })
        : await this.quoteModel.create([draft]);

      await this.rfqService.updateStatus(dto.rfqId, RfqStatus.QUOTED, undefined, { session });
      const eventPayload = {
        quoteId: quote.id,
        quoteCode: quote.code,
        rfqId: dto.rfqId,
        total: quote.total,
        status: quote.status,
      } satisfies GhsQuotePayload;

      await this.outbox.stage(
        GHS_CATALOG_TOPICS.QUOTE_CREATED,
        eventPayload,
        session,
        buildApplicationScopeEventMetadata({
          scopeId: GHS_APPLICATION_SCOPE_ID,
          aggregateType: 'quote',
          aggregateId: quote.id,
          correlationId: dto.rfqId,
        }),
      );
      return quote;
    };

    if (await this.canUseTransactions()) {
      return withMongoTransaction(this.connection, async (session) => persistQuote(session));
    }

    this.logger.warn('MongoDB transaction support unavailable; creating quote without session.');
    return persistQuote(null);
  }

  async update(id: string, dto: UpdateQuoteDto) {
    const update: UpdateQuery<QuoteDocument> = { ...dto };
    if (dto.status || dto.items !== undefined || dto.discount !== undefined) {
      const current = await this.findById(id);
      if (dto.status) {
        assertQuoteTransition(current.status, dto.status);
        if (dto.status === QuoteStatus.SENT && !current.sentAt) {
          update.sentAt = new Date();
        }
        if (dto.status === QuoteStatus.SENT) {
          Object.assign(update, this.buildPublicShareAccess(current));
        }
      }
      if (dto.items !== undefined || dto.discount !== undefined) {
        const nextItems = dto.items !== undefined ? dto.items : this.toDtoItems(current.items);
        Object.assign(update, this.buildItems(nextItems, dto.discount ?? current.discount));
      }
    }
    const quote = await this.quoteModel.findByIdAndUpdate(id, { $set: update }, { returnDocument: 'after' });
    if (!quote) throw new DomainNotFoundException(QUOTE_ERRORS.QUOTE_NOT_FOUND, 'Báo giá không tồn tại');
    return quote;
  }

  async setPdfUrl(id: string, pdfUrl: string) {
    const quote = await this.quoteModel.findByIdAndUpdate(id, { $set: { pdfUrl } }, { returnDocument: 'after' });
    if (!quote) throw new DomainNotFoundException(QUOTE_ERRORS.QUOTE_NOT_FOUND, 'Báo giá không tồn tại');
    return quote;
  }

  async markSent(id: string, pdfUrl?: string) {
    const current = await this.findById(id);
    assertQuoteTransition(current.status, QuoteStatus.SENT);
    const update: UpdateQuery<QuoteDocument> = {
      status: QuoteStatus.SENT,
      sentAt: new Date(),
      ...this.buildPublicShareAccess(current),
    };
    const normalizedPdfUrl = readTrimmedString(pdfUrl);
    if (normalizedPdfUrl !== undefined) update.pdfUrl = normalizedPdfUrl;
    const quote = await this.quoteModel.findByIdAndUpdate(id, { $set: update }, { returnDocument: 'after' });
    if (!quote) throw new DomainNotFoundException(QUOTE_ERRORS.QUOTE_NOT_FOUND, 'Báo giá không tồn tại');
    return quote;
  }

  private buildItems(items: QuoteLineItemDto[], discountValue: unknown) {
    if (!Array.isArray(items) || !items.length) {
      throw new DomainBadRequestException(QUOTE_ERRORS.QUOTE_ITEMS_REQUIRED, 'Báo giá cần ít nhất 1 dòng sản phẩm');
    }
    const discount = readQuoteDiscount(discountValue);
    const normalized = items.map(item => {
      const quantity = readRequiredPositiveQuoteNumber(item.quantity, 'quantity');
      const unitPrice = readRequiredNonNegativeQuoteNumber(item.unitPrice, 'unitPrice');
      return {
        productId: new Types.ObjectId(item.productId),
        productName: item.productName,
        glaze: item.glaze,
        size: item.size,
        quantity,
        unitPrice,
        customization: item.customization,
        lineTotal: quantity * unitPrice,
      };
    });
    const subtotal = normalized.reduce((sum, item) => sum + item.lineTotal, 0);
    const total = computeCheckoutPricing({
      cartTotal: subtotal,
      discountVoucher: discount,
      clampDiscounts: true,
    }).totalPayment;
    return { items: normalized, subtotal, discount, total };
  }

  private toDtoItems(items: Quote['items']): QuoteLineItemDto[] {
    return items.map(item => ({
      productId: item.productId.toString(),
      productName: item.productName,
      glaze: item.glaze,
      size: item.size,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      customization: item.customization,
    }));
  }

  private buildPublicShareAccess(
    quote: Pick<Quote, 'publicShareToken' | 'publicShareExpiresAt' | 'publicShareRevokedAt' | 'validUntil'>,
  ) {
    const hasActiveShareToken =
      readTrimmedString(quote.publicShareToken) !== undefined &&
      quote.publicShareRevokedAt === undefined &&
      isFutureDate(quote.publicShareExpiresAt);

    return {
      publicShareToken: hasActiveShareToken ? quote.publicShareToken : createPublicShareToken(),
      publicShareExpiresAt: hasActiveShareToken
        ? quote.publicShareExpiresAt
        : this.resolvePublicShareExpiry(quote.validUntil),
      publicShareRevokedAt: undefined,
    };
  }

  private resolvePublicShareExpiry(validUntil?: Date) {
    if (isFutureDate(validUntil)) {
      return new Date(validUntil);
    }

    return new Date(Date.now() + PUBLIC_QUOTE_LINK_TTL_MS);
  }

  private async nextCode(session: ClientSession | null) {
    const datePart = yyyymmdd();
    const prefix = `QUO-${datePart}-`;
    const key = `quote:${datePart}`;
    const counter = await this.counterModel.findOneAndUpdate(
      { key },
      { $setOnInsert: { key }, $inc: { seq: 1 } },
      { returnDocument: 'after', upsert: true, session: session ?? undefined },
    );
    if (!counter) {
      throw new DomainException(QUOTE_ERRORS.QUOTE_COUNTER_FAILED, 'Quote counter allocation failed', 500);
    }
    return `${prefix}${String(counter.seq).padStart(3, '0')}`;
  }

  private async canUseTransactions(): Promise<boolean> {
    if (!this.connection.db) {
      return true;
    }

    try {
      return await this.transactionSupportResolver.hasSupport();
    } catch {
      return true;
    }
  }
}
