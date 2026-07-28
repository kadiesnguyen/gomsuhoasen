import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  NodemailerSmtpTransport,
  SmtpCommsChannelAdapter,
  type ISmtpTransport,
} from '@vt/platform-comms-email-smtp';
import {
  COMMS_CHANNEL_DELIVERY_OUTCOME,
  COMMS_CHANNEL_TYPE,
  type CommsChannelAdapter,
} from '@vt/platform-comms-engine';
import { createSegmentedIdentityKey } from '@vt/platform-events';
import { SiteConfigService } from '@gomhoasen/site';
import { QuoteDocument } from '../schemas/quote.schema';
import { formatVnd as money } from '@gomhoasen/contracts';
import { GHS_APPLICATION_SCOPE_ID } from '@gomhoasen/core';
import { readLowercaseTrimmedString, readTrimmedString } from '@vt/common-utils';
import {
  COMMON_ERROR_CODES,
  DomainBadRequestException,
  DomainException,
  QUOTE_ERROR_CODES,
} from '@vt/platform-error';

function readSmtpPort(value: unknown): number | undefined {
  const normalized = readTrimmedString(value);
  if (normalized === undefined) return undefined;

  const port = Number(normalized);
  return Number.isInteger(port) && port > 0 && port <= 65535 ? port : undefined;
}

function readSmtpSecure(value: unknown): boolean | undefined {
  const normalized = readLowercaseTrimmedString(value);
  if (normalized === 'true') return true;
  if (normalized === 'false') return false;
  return undefined;
}

@Injectable()
export class QuoteEmailService {
  private readonly smtpTransport: ISmtpTransport = new NodemailerSmtpTransport();

  constructor(
    private readonly config: ConfigService,
    private readonly siteConfig: SiteConfigService
  ) {}

  async sendQuote(quote: QuoteDocument, pdfPath: string) {
    const customerEmail = readTrimmedString(quote.customerEmail);
    if (customerEmail === undefined) {
      throw new DomainBadRequestException(COMMON_ERROR_CODES.MISSING_REQUIRED_FIELD, 'RFQ chưa có email khách hàng');
    }

    const host = readTrimmedString(this.config.get<string>('SMTP_HOST'));
    const user = readTrimmedString(this.config.get<string>('SMTP_USER'));
    const pass = readTrimmedString(this.config.get<string>('SMTP_PASS'));
    const port = readSmtpPort(this.config.get<string>('SMTP_PORT'));
    const secure = readSmtpSecure(this.config.get<string>('SMTP_SECURE'));
    const from = readTrimmedString(this.config.get<string>('SMTP_FROM'));
    if (
      host === undefined ||
      user === undefined ||
      pass === undefined ||
      port === undefined ||
      secure === undefined ||
      from === undefined
    ) {
      throw new DomainBadRequestException(QUOTE_ERROR_CODES.QUOTE_SMTP_NOT_CONFIGURED, 'SMTP chưa được cấu hình');
    }

    const config = await this.siteConfig.getConfig();
    const brandName = readTrimmedString(config.brandName) ?? 'Gốm Hoa Sen';
    const quoteId = String(quote._id);
    const adapter: CommsChannelAdapter = new SmtpCommsChannelAdapter({
      transport: this.smtpTransport,
      config: {
        host,
        port,
        secure,
        auth: { user, pass },
      },
      from,
    });

    const result = await adapter.send({
      tenantId: GHS_APPLICATION_SCOPE_ID,
      deliveryId: createSegmentedIdentityKey({
        namespace: 'quote',
        segments: [quoteId, 'email'],
      }),
      idempotencyKey: createSegmentedIdentityKey({
        namespace: 'quote',
        segments: [quoteId, 'email', customerEmail],
      }),
      channelType: COMMS_CHANNEL_TYPE.EMAIL,
      recipient: {
        recipientId: quoteId,
        recipientContact: customerEmail,
      },
      template: {
        templateCode: 'quote_email',
        templateVersion: 1,
        subject: `Báo giá ${quote.code} từ ${brandName}`,
        bodyHtml: this.renderEmail(quote, brandName),
      },
      templateVariables: {
        attachments: [{ filename: `${quote.code}.pdf`, path: pdfPath }],
      },
    });

    if (
      result.outcome !== COMMS_CHANNEL_DELIVERY_OUTCOME.DELIVERED &&
      result.outcome !== COMMS_CHANNEL_DELIVERY_OUTCOME.ACCEPTED
    ) {
      throw new DomainException(QUOTE_ERROR_CODES.QUOTE_EMAIL_SEND_FAILED, readTrimmedString(result.errorMessage) ?? 'Không gửi được email báo giá', 500, {
        providerResponse: result.providerResponse,
        errorCode: result.errorCode,
      });
    }
  }

  private renderEmail(quote: QuoteDocument, brandName: string) {
    return `
      <div style="font-family:Arial,sans-serif;color:#191714">
        <p>Kính gửi ${readTrimmedString(quote.customerName) ?? 'Quý khách'},</p>
        <p>${brandName} gửi Quý khách báo giá <strong>${quote.code}</strong> với tổng giá trị <strong>${money(quote.total)}</strong>.</p>
        <p>File PDF chi tiết được đính kèm trong email này.</p>
        <p style="color:#9A7520;font-weight:700">${brandName}</p>
      </div>
    `;
  }
}
