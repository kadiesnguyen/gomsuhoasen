// Task card: P1-SPEC
// Ref read:
// - /Users/bonbon177tb/Documents/zalominiapp/v2/libs/catalog/src/lib/services/brand.service.spec.ts
// Adapted: Quote domain — create, update, findById, error codes

import { HttpException } from '@nestjs/common';
import { Types } from 'mongoose';
import { GHS_CATALOG_TOPICS } from '@vt/platform-events';
import { getMongooseSchemaPathDefault } from '@vt/platform-mongoose';
import { RfqStatus } from '@gomhoasen/rfq';
import { QuoteService } from './quote.service';
import { QUOTE_ERRORS } from '../constants/quote.constants';
import { buildInitialQuoteValues } from '../constants/quote-writer-initial-values';
import { CounterSchema } from '../schemas/counter.schema';
import { QuoteSchema, QuoteStatus } from '../schemas/quote.schema';

describe('QuoteService', () => {
  function createService() {
    const mongoSession = {
      withTransaction: jest.fn(async (work: () => Promise<unknown>) => work()),
      endSession: jest.fn(async () => undefined),
    };
    const quoteModel = {
      find: jest.fn(),
      findById: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      findByIdAndUpdate: jest.fn(),
    };
    const counterModel = {
      findOneAndUpdate: jest.fn(),
    };
    const rfqService = {
      findById: jest.fn(),
      updateStatus: jest.fn(),
    };
    const connection = {
      startSession: jest.fn(async () => mongoSession),
    };
    const outbox = {
      stage: jest.fn(async () => ({ eventType: 'stub' })),
    };
    return {
      quoteModel,
      counterModel,
      rfqService,
      connection,
      outbox,
      mongoSession,
      service: new QuoteService(
        quoteModel as never,
        counterModel as never,
        rfqService as never,
        connection as never,
        outbox as never,
      ),
    };
  }

  it('throws QUOTE_NOT_FOUND when findById returns null', async () => {
    const { service, quoteModel } = createService();
    quoteModel.findById.mockResolvedValue(null);

    await expect(service.findById('missing')).rejects.toMatchObject({
      response: expect.objectContaining({
        code: QUOTE_ERRORS.QUOTE_NOT_FOUND,
      }),
    });
  });

  it('throws QUOTE_NOT_FOUND as NotFoundException', async () => {
    const { service, quoteModel } = createService();
    quoteModel.findById.mockResolvedValue(null);

    await expect(service.findById('missing')).rejects.toBeInstanceOf(HttpException);
  });

  it('throws QUOTE_ITEMS_REQUIRED when creating with empty items', async () => {
    const { service, rfqService, counterModel } = createService();
    rfqService.findById.mockResolvedValue({
      customerName: 'A',
      customerPhone: '09',
    });
    counterModel.findOneAndUpdate.mockResolvedValue({ seq: 1 });

    await expect(service.create({
      rfqId: 'rfq-1',
      items: [],
    } as never)).rejects.toMatchObject({
      response: expect.objectContaining({
        code: QUOTE_ERRORS.QUOTE_ITEMS_REQUIRED,
      }),
    });
  });

  it('throws QUOTE_ITEMS_REQUIRED as BadRequestException', async () => {
    const { service, rfqService } = createService();
    rfqService.findById.mockResolvedValue({
      customerName: 'A',
      customerPhone: '09',
    });

    await expect(service.create({
      rfqId: 'rfq-1',
      items: [],
    } as never)).rejects.toBeInstanceOf(HttpException);
  });

  it('throws QUOTE_NOT_FOUND when markSent on missing quote', async () => {
    const { service, quoteModel } = createService();
    quoteModel.findById.mockResolvedValue(null);

    await expect(service.markSent('missing')).rejects.toMatchObject({
      response: expect.objectContaining({
        code: QUOTE_ERRORS.QUOTE_NOT_FOUND,
      }),
    });
  });

  it('[QUO-001] creates quote from RFQ and calculates totals', async () => {
    const { service, quoteModel, counterModel, rfqService, outbox } = createService();
    const rfqId = new Types.ObjectId().toHexString();
    const productId = new Types.ObjectId().toHexString();
    rfqService.findById.mockResolvedValue({
      customerName: 'Khách E2E',
      customerPhone: '0901234567',
      customerEmail: 'khach@example.com',
    });
    counterModel.findOneAndUpdate.mockResolvedValue({ seq: 1 });
    quoteModel.create.mockImplementation(async (payloadArg) => {
      const payload = Array.isArray(payloadArg) ? payloadArg[0] : payloadArg;
      const quote = { id: 'quote-1', _id: 'quote-1', ...payload };
      return Array.isArray(payloadArg) ? [quote] : quote;
    });

    const result = await service.create({
      rfqId,
      discount: 50000,
      items: [{
        productId,
        productName: 'Bình gốm',
        quantity: 2,
        unitPrice: 250000,
      }],
    });

    expect(quoteModel.create).toHaveBeenCalledWith([expect.objectContaining({
      code: expect.stringMatching(/^QUO-\d{8}-001$/),
      customerName: 'Khách E2E',
      subtotal: 500000,
      discount: 50000,
      total: 450000,
      status: QuoteStatus.DRAFT,
    })], expect.objectContaining({ session: expect.any(Object) }));
    const counterCall = counterModel.findOneAndUpdate.mock.calls[0];
    expect(counterCall[0]).toEqual({ key: expect.stringMatching(/^quote:\d{8}$/) });
    expect(counterCall[1]).toEqual({ $setOnInsert: { key: counterCall[0].key }, $inc: { seq: 1 } });
    expect(counterCall[2]).toEqual(expect.objectContaining({
      returnDocument: 'after',
      upsert: true,
      session: expect.any(Object),
    }));
    expect(counterCall[2]).not.toHaveProperty('setDefaultsOnInsert');
    expect(rfqService.updateStatus).toHaveBeenCalledWith(
      rfqId,
      RfqStatus.QUOTED,
      undefined,
      expect.objectContaining({ session: expect.any(Object) }),
    );
    expect(outbox.stage).toHaveBeenCalledWith(
      GHS_CATALOG_TOPICS.QUOTE_CREATED,
      expect.objectContaining({
        quoteId: 'quote-1',
        rfqId,
      }),
      expect.any(Object),
      expect.objectContaining({
        tenantId: 'gomhoasen',
        aggregateType: 'quote',
        aggregateId: 'quote-1',
        correlationId: rfqId,
      }),
    );
    expect(result.total).toBe(450000);
  });

  it('falls back to non-transactional quote writes when MongoDB has no transaction support', async () => {
    const { service, quoteModel, counterModel, rfqService, outbox, connection } = createService();
    const rfqId = new Types.ObjectId().toHexString();
    const productId = new Types.ObjectId().toHexString();
    connection.db = {
      admin: () => ({
        command: jest.fn(async () => ({ logicalSessionTimeoutMinutes: 30 })),
      }),
    };
    rfqService.findById.mockResolvedValue({
      customerName: 'Khach local',
      customerPhone: '0900000001',
      customerEmail: 'local@example.com',
    });
    counterModel.findOneAndUpdate.mockResolvedValue({ seq: 2 });
    quoteModel.create.mockImplementation(async (payloadArg) => {
      const payload = Array.isArray(payloadArg) ? payloadArg[0] : payloadArg;
      return [{ id: 'quote-local', _id: 'quote-local', ...payload }];
    });

    const result = await service.create({
      rfqId,
      items: [{
        productId,
        productName: 'Binh local',
        quantity: 1,
        unitPrice: 350000,
      }],
    });

    expect(connection.startSession).not.toHaveBeenCalled();
    expect(quoteModel.create).toHaveBeenCalledWith([expect.objectContaining({
      code: expect.stringMatching(/^QUO-\d{8}-002$/),
      total: 350000,
    })]);
    expect(rfqService.updateStatus).toHaveBeenCalledWith(
      rfqId,
      RfqStatus.QUOTED,
      undefined,
      { session: null },
    );
    expect(outbox.stage).toHaveBeenCalledWith(
      GHS_CATALOG_TOPICS.QUOTE_CREATED,
      expect.objectContaining({
        quoteId: 'quote-local',
        rfqId,
      }),
      null,
      expect.objectContaining({
        aggregateType: 'quote',
        aggregateId: 'quote-local',
      }),
    );
    expect(result.id).toBe('quote-local');
  });

  it('normalizes quote terms through the trimmed default resolver', async () => {
    const { service, quoteModel, counterModel, rfqService } = createService();
    const rfqId = new Types.ObjectId().toHexString();
    const productId = new Types.ObjectId().toHexString();
    const lineItem = {
      productId,
      productName: 'Binh gom',
      quantity: 1,
      unitPrice: 250000,
    };
    rfqService.findById.mockResolvedValue({
      customerName: 'Khach E2E',
      customerPhone: '0901234567',
    });
    counterModel.findOneAndUpdate.mockResolvedValue({ seq: 1 });
    quoteModel.create.mockImplementation(async (payloadArg) => {
      const payload = Array.isArray(payloadArg) ? payloadArg[0] : payloadArg;
      const quote = { id: 'quote-terms', _id: 'quote-terms', ...payload };
      return Array.isArray(payloadArg) ? [quote] : quote;
    });

    await service.create({
      rfqId,
      terms: '   ',
      items: [lineItem],
    });
    await service.create({
      rfqId,
      terms: '  Net 15 after delivery  ',
      items: [lineItem],
    });

    expect(quoteModel.create.mock.calls[0][0][0]).toEqual(expect.objectContaining({
      terms: expect.stringContaining('30%'),
    }));
    expect(quoteModel.create.mock.calls[1][0][0]).toEqual(expect.objectContaining({
      terms: 'Net 15 after delivery',
    }));
  });

  describe('schema initial values', () => {
    it('keeps quote business initial values out of schema defaults', () => {
      expect(getMongooseSchemaPathDefault(CounterSchema, 'seq')).toBeUndefined();
      expect(getMongooseSchemaPathDefault(QuoteSchema, 'items')).toBeUndefined();
      expect(getMongooseSchemaPathDefault(QuoteSchema, 'subtotal')).toBeUndefined();
      expect(getMongooseSchemaPathDefault(QuoteSchema, 'discount')).toBeUndefined();
      expect(getMongooseSchemaPathDefault(QuoteSchema, 'total')).toBeUndefined();
      expect(getMongooseSchemaPathDefault(QuoteSchema, 'status')).toBeUndefined();
    });

    it('centralizes quote writer initial values explicitly', () => {
      const productId = new Types.ObjectId();

      expect(buildInitialQuoteValues({
        code: 'QUO-20260518-001',
        rfqId: new Types.ObjectId(),
        items: [{
          productId,
          productName: 'Binh gom',
          quantity: 2,
          unitPrice: 250000,
          lineTotal: 500000,
        }],
        subtotal: 500000,
        discount: 50000,
        total: 450000,
      })).toMatchObject({
        status: QuoteStatus.DRAFT,
        subtotal: 500000,
        discount: 50000,
        total: 450000,
      });
    });
  });

  it('rejects zero or missing quote quantity without fallback to one', async () => {
    const { service, quoteModel, rfqService } = createService();
    const rfqId = new Types.ObjectId().toHexString();
    const productId = new Types.ObjectId().toHexString();
    rfqService.findById.mockResolvedValue({
      customerName: 'Khach E2E',
      customerPhone: '0901234567',
    });

    for (const quantity of [0, undefined]) {
      await expect(service.create({
        rfqId,
        items: [{
          productId,
          productName: 'Binh gom',
          quantity,
          unitPrice: 250000,
        }],
      } as never)).rejects.toMatchObject({
        response: expect.objectContaining({
          code: QUOTE_ERRORS.QUOTE_INVALID_LINE_ITEM,
        }),
      });
    }
    expect(quoteModel.create).not.toHaveBeenCalled();
  });

  it('rejects malformed quote price and discount without fallback to zero', async () => {
    const { service, quoteModel, rfqService } = createService();
    const rfqId = new Types.ObjectId().toHexString();
    const productId = new Types.ObjectId().toHexString();
    rfqService.findById.mockResolvedValue({
      customerName: 'Khach E2E',
      customerPhone: '0901234567',
    });

    await expect(service.create({
      rfqId,
      items: [{
        productId,
        productName: 'Binh gom',
        quantity: 2,
      }],
    } as never)).rejects.toMatchObject({
      response: expect.objectContaining({
        code: QUOTE_ERRORS.QUOTE_INVALID_LINE_ITEM,
      }),
    });
    await expect(service.create({
      rfqId,
      discount: Number.NaN,
      items: [{
        productId,
        productName: 'Binh gom',
        quantity: 2,
        unitPrice: 250000,
      }],
    } as never)).rejects.toMatchObject({
      response: expect.objectContaining({
        code: QUOTE_ERRORS.QUOTE_INVALID_LINE_ITEM,
      }),
    });
    expect(quoteModel.create).not.toHaveBeenCalled();
  });

  it('[QUO-001] updates quote totals when items are changed', async () => {
    const { service, quoteModel } = createService();
    const productId = new Types.ObjectId();
    quoteModel.findById.mockResolvedValue({
      items: [{
        productId,
        productName: 'Bình cũ',
        quantity: 1,
        unitPrice: 100000,
      }],
      discount: 0,
    });
    quoteModel.findByIdAndUpdate.mockResolvedValue({ _id: 'quote-1', total: 270000 });

    await service.update('quote-1', {
      discount: 30000,
      items: [{
        productId: productId.toHexString(),
        productName: 'Bình mới',
        quantity: 3,
        unitPrice: 100000,
      }],
    });

    expect(quoteModel.findByIdAndUpdate).toHaveBeenCalledWith(
      'quote-1',
      { $set: expect.objectContaining({ subtotal: 300000, discount: 30000, total: 270000 }) },
      { returnDocument: 'after' },
    );
  });

  it('recalculates quote totals for discount-only updates with current items', async () => {
    const { service, quoteModel } = createService();
    const productId = new Types.ObjectId();
    quoteModel.findById.mockResolvedValue({
      items: [{
        productId,
        productName: 'Binh cu',
        quantity: 2,
        unitPrice: 100000,
      }],
      discount: 0,
    });
    quoteModel.findByIdAndUpdate.mockResolvedValue({ _id: 'quote-1', total: 150000 });

    await service.update('quote-1', { discount: 50000 });

    expect(quoteModel.findByIdAndUpdate).toHaveBeenCalledWith(
      'quote-1',
      { $set: expect.objectContaining({ subtotal: 200000, discount: 50000, total: 150000 }) },
      { returnDocument: 'after' },
    );
  });

  it('clamps quote totals at zero when discount exceeds subtotal', async () => {
    const { service, quoteModel, counterModel, rfqService } = createService();
    const rfqId = new Types.ObjectId().toHexString();
    const productId = new Types.ObjectId().toHexString();
    rfqService.findById.mockResolvedValue({
      customerName: 'Khach over-discount',
      customerPhone: '0901234567',
    });
    counterModel.findOneAndUpdate.mockResolvedValue({ seq: 1 });
    quoteModel.create.mockImplementation(async (payloadArg) => {
      const payload = Array.isArray(payloadArg) ? payloadArg[0] : payloadArg;
      const quote = { id: 'quote-clamped', _id: 'quote-clamped', ...payload };
      return Array.isArray(payloadArg) ? [quote] : quote;
    });

    const result = await service.create({
      rfqId,
      discount: 900000,
      items: [{
        productId,
        productName: 'Binh gom',
        quantity: 1,
        unitPrice: 250000,
      }],
    });

    expect(quoteModel.create).toHaveBeenCalledWith([expect.objectContaining({
      subtotal: 250000,
      discount: 900000,
      total: 0,
    })], expect.objectContaining({ session: expect.any(Object) }));
    expect(result.total).toBe(0);
  });

  it('rejects explicit empty update items instead of reusing current quote items', async () => {
    const { service, quoteModel } = createService();
    const productId = new Types.ObjectId();
    quoteModel.findById.mockResolvedValue({
      items: [{
        productId,
        productName: 'Binh cu',
        quantity: 2,
        unitPrice: 100000,
      }],
      discount: 0,
    });

    await expect(service.update('quote-1', { items: [] })).rejects.toMatchObject({
      response: expect.objectContaining({
        code: QUOTE_ERRORS.QUOTE_ITEMS_REQUIRED,
      }),
    });
    expect(quoteModel.findByIdAndUpdate).not.toHaveBeenCalled();
  });

  it('normalizes optional markSent pdfUrl without truthy string fallback', async () => {
    const { service, quoteModel } = createService();
    quoteModel.findById.mockResolvedValue({
      status: QuoteStatus.DRAFT,
      sentAt: undefined,
    });
    quoteModel.findByIdAndUpdate.mockResolvedValue({ _id: 'quote-1', status: QuoteStatus.SENT });

    await service.markSent('quote-1', '  https://example.test/quote.pdf  ');
    await service.markSent('quote-1', '   ');

    expect(quoteModel.findByIdAndUpdate.mock.calls[0][1].$set).toEqual(expect.objectContaining({
      status: QuoteStatus.SENT,
      pdfUrl: 'https://example.test/quote.pdf',
    }));
    expect(quoteModel.findByIdAndUpdate.mock.calls[1][1].$set).not.toHaveProperty('pdfUrl');
  });

  it('escapes quote search input before building regex filters', async () => {
    const { service, quoteModel } = createService();
    const sort = jest.fn();
    quoteModel.find.mockReturnValue({ sort });

    await service.findAll({ search: 'A.*B' });

    const filter = quoteModel.find.mock.calls[0][0];
    expect((filter.$or[0].code as RegExp).source).toBe('A\\.\\*B');
    expect((filter.$or[1].customerName as RegExp).source).toBe('A\\.\\*B');
    expect((filter.$or[2].customerPhone as RegExp).source).toBe('A\\.\\*B');
    expect(sort).toHaveBeenCalledWith({ createdAt: -1 });
  });

  it('finds public quotes by active share token only', async () => {
    const { service, quoteModel } = createService();
    const activeQuote = {
      _id: 'quote-public',
      status: QuoteStatus.SENT,
      sentAt: new Date(),
      publicShareToken: 'share-token-1',
      publicShareExpiresAt: new Date(Date.now() + 60_000),
    };
    quoteModel.findOne.mockResolvedValue(activeQuote);

    await expect(service.findPublicByShareToken('  share-token-1  ')).resolves.toBe(activeQuote);
    expect(quoteModel.findOne).toHaveBeenCalledWith({
      publicShareToken: 'share-token-1',
      status: QuoteStatus.SENT,
    });
  });

  it('rejects expired or revoked public quote share tokens', async () => {
    const { service, quoteModel } = createService();

    quoteModel.findOne.mockResolvedValueOnce({
      _id: 'quote-expired',
      status: QuoteStatus.SENT,
      sentAt: new Date(),
      publicShareToken: 'expired-token',
      publicShareExpiresAt: new Date(Date.now() - 60_000),
    });
    await expect(service.findPublicByShareToken('expired-token')).rejects.toMatchObject({
      response: expect.objectContaining({
        code: QUOTE_ERRORS.QUOTE_NOT_FOUND,
      }),
    });

    quoteModel.findOne.mockResolvedValueOnce({
      _id: 'quote-revoked',
      status: QuoteStatus.SENT,
      sentAt: new Date(),
      publicShareToken: 'revoked-token',
      publicShareExpiresAt: new Date(Date.now() + 60_000),
      publicShareRevokedAt: new Date(),
    });
    await expect(service.findPublicByShareToken('revoked-token')).rejects.toMatchObject({
      response: expect.objectContaining({
        code: QUOTE_ERRORS.QUOTE_NOT_FOUND,
      }),
    });
  });

  it('provisions a public share token when marking a quote as sent', async () => {
    const { service, quoteModel } = createService();
    const validUntil = new Date('2030-01-01T00:00:00.000Z');
    quoteModel.findById.mockResolvedValue({
      status: QuoteStatus.DRAFT,
      sentAt: undefined,
      validUntil,
    });
    quoteModel.findByIdAndUpdate.mockResolvedValue({ _id: 'quote-1', status: QuoteStatus.SENT });

    await service.markSent('quote-1');

    const update = quoteModel.findByIdAndUpdate.mock.calls[0][1].$set;
    expect(update.publicShareToken).toMatch(/^[a-f0-9]{36}$/);
    expect(update.publicShareExpiresAt).toEqual(validUntil);
    expect(update.publicShareRevokedAt).toBeUndefined();
  });

  it('provisions a public share token when status is updated to SENT', async () => {
    const { service, quoteModel } = createService();
    quoteModel.findById.mockResolvedValue({
      status: QuoteStatus.DRAFT,
      sentAt: undefined,
      validUntil: undefined,
    });
    quoteModel.findByIdAndUpdate.mockResolvedValue({ _id: 'quote-1', status: QuoteStatus.SENT });

    await service.update('quote-1', { status: QuoteStatus.SENT });

    const update = quoteModel.findByIdAndUpdate.mock.calls[0][1].$set;
    expect(update.sentAt).toBeInstanceOf(Date);
    expect(update.publicShareToken).toMatch(/^[a-f0-9]{36}$/);
    expect(update.publicShareExpiresAt).toBeInstanceOf(Date);
  });

  it('[QUO-002] rejects backwards quote status transitions', async () => {
    const { service, quoteModel } = createService();
    quoteModel.findById.mockResolvedValue({
      status: QuoteStatus.SENT,
      items: [],
      discount: 0,
    });

    await expect(service.update('quote-1', { status: QuoteStatus.DRAFT })).rejects.toMatchObject({
      response: expect.objectContaining({
        code: QUOTE_ERRORS.QUOTE_INVALID_STATUS_TRANSITION,
      }),
    });
    expect(quoteModel.findByIdAndUpdate).not.toHaveBeenCalled();
  });
});
