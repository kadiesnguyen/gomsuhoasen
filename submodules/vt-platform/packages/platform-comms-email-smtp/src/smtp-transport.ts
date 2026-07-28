/**
 * @vt/platform-comms-email-smtp — SMTP email transport adapter.
 *
 * Pure transport layer: takes a composed email (to/subject/body)
 * and delivers it via SMTP using nodemailer.
 *
 * Does NOT own template rendering, outbox, or queue logic —
 * those remain in the consumer project's email service.
 */

import type {
  CommsChannelAdapter,
  CommsChannelAdapterConfig,
  CommsChannelDeliveryResult,
  CommsChannelSendInput,
} from '@vt/platform-comms-engine';
import {
  COMMS_CHANNEL_DELIVERY_OUTCOME,
  COMMS_CHANNEL_TYPE,
  requireCommsChannelConfigKeys,
} from '@vt/platform-comms-engine';

export interface SmtpTransportConfig {
  host: string;
  port: number;
  secure: boolean;
  auth?: {
    user: string;
    pass: string;
  };
}

export interface SmtpSendParams {
  from: string;
  to: string | string[];
  cc?: string | string[];
  bcc?: string | string[];
  subject: string;
  bodyHtml?: string;
  bodyText?: string;
  replyTo?: string;
  attachments?: SmtpAttachment[];
}

export interface SmtpAttachment {
  filename?: string;
  path?: string;
  content?: string | Buffer;
  contentType?: string;
}

export interface SmtpSendResult {
  messageId?: string;
  accepted: string[];
  rejected: string[];
  response?: string;
}

export const SMTP_DELIVERY_ERROR_CODE = {
  CONNECTION_FAILED: 'SMTP_CONNECTION_FAILED',
  AUTH_FAILED: 'SMTP_AUTH_FAILED',
  INVALID_MESSAGE: 'SMTP_INVALID_MESSAGE',
  REJECTED: 'SMTP_REJECTED',
  TIMEOUT: 'SMTP_TIMEOUT',
  UNKNOWN: 'SMTP_UNKNOWN',
} as const;

export type SmtpDeliveryErrorCode =
  typeof SMTP_DELIVERY_ERROR_CODE[keyof typeof SMTP_DELIVERY_ERROR_CODE];

export class SmtpDeliveryError extends Error {
  constructor(
    public readonly code: SmtpDeliveryErrorCode,
    message: string,
    public readonly originalError?: unknown,
  ) {
    super(message);
    this.name = 'SmtpDeliveryError';
  }
}

type NodemailerModule = typeof import('nodemailer');
type NodemailerLoader = () => NodemailerModule | Promise<NodemailerModule>;

/**
 * Port interface for SMTP transport.
 * In production, implement with nodemailer.
 * In tests, use a mock implementation.
 */
export interface ISmtpTransport {
  send(config: SmtpTransportConfig, params: SmtpSendParams): Promise<SmtpSendResult>;
  verify(config: SmtpTransportConfig): Promise<boolean>;
}

/**
 * Default SMTP transport using nodemailer.
 *
 * Consumers must install `nodemailer` as a peer dependency.
 * This class is designed to be instantiated directly or
 * provided via NestJS DI.
 */
export class NodemailerSmtpTransport implements ISmtpTransport {
  constructor(
    private readonly nodemailerLoader: NodemailerLoader = () =>
      require('nodemailer') as NodemailerModule,
  ) {}

  async send(config: SmtpTransportConfig, params: SmtpSendParams): Promise<SmtpSendResult> {
    const nodemailer = await this.loadNodemailer();

    const transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: config.auth,
    });

    try {
      const info = await transporter.sendMail({
        from: params.from,
        to: Array.isArray(params.to) ? params.to.join(', ') : params.to,
        cc: params.cc ? (Array.isArray(params.cc) ? params.cc.join(', ') : params.cc) : undefined,
        bcc: params.bcc ? (Array.isArray(params.bcc) ? params.bcc.join(', ') : params.bcc) : undefined,
        subject: params.subject,
        html: params.bodyHtml,
        text: params.bodyText,
        replyTo: params.replyTo,
        attachments: params.attachments,
      });

      const messageId = readOptionalSmtpText(info.messageId);
      const response = readOptionalSmtpText(info.response);
      return {
        ...(messageId === undefined ? {} : { messageId }),
        accepted: readSmtpAddressList(info.accepted),
        rejected: readSmtpAddressList(info.rejected),
        ...(response === undefined ? {} : { response }),
      };
    } catch (error: unknown) {
      const err = error as Error & { code?: string; responseCode?: number };
      const errorCode = this.classifyError(err);
      throw new SmtpDeliveryError(errorCode, err.message, error);
    } finally {
      transporter.close?.();
    }
  }

  async verify(config: SmtpTransportConfig): Promise<boolean> {
    const nodemailer = await this.loadNodemailer();

    const transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: config.auth,
    });

    try {
      await transporter.verify();
      return true;
    } catch {
      return false;
    } finally {
      transporter.close?.();
    }
  }

  private classifyError(err: Error & { code?: string; responseCode?: number }): SmtpDeliveryErrorCode {
    const code = typeof err.code === 'string' ? err.code : '';
    if (code === 'ECONNECTION' || code === 'ECONNREFUSED' || code === 'ESOCKET') {
      return SMTP_DELIVERY_ERROR_CODE.CONNECTION_FAILED;
    }
    if (code === 'EAUTH' || (err.responseCode && err.responseCode === 535)) {
      return SMTP_DELIVERY_ERROR_CODE.AUTH_FAILED;
    }
    if (code === 'ETIMEDOUT') {
      return SMTP_DELIVERY_ERROR_CODE.TIMEOUT;
    }
    if (err.responseCode && err.responseCode >= 500) {
      return SMTP_DELIVERY_ERROR_CODE.REJECTED;
    }
    return SMTP_DELIVERY_ERROR_CODE.UNKNOWN;
  }

  private async loadNodemailer(): Promise<NodemailerModule> {
    try {
      return await this.nodemailerLoader();
    } catch {
      throw new Error(
        '@vt/platform-comms-email-smtp requires "nodemailer" as a peer dependency. ' +
        'Please install it: npm install nodemailer',
      );
    }
  }
}

function readOptionalSmtpText(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function readSmtpAddressList(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .map(readOptionalSmtpText)
    .filter((entry): entry is string => entry !== undefined);
}

export interface SmtpCommsChannelAdapterOptions {
  transport: ISmtpTransport;
  config: SmtpTransportConfig;
  from?: string;
  now?: () => Date;
}

export class SmtpCommsChannelAdapter implements CommsChannelAdapter {
  readonly channelType = COMMS_CHANNEL_TYPE.EMAIL;

  constructor(private readonly options: SmtpCommsChannelAdapterOptions) {}

  validateConfig(config: CommsChannelAdapterConfig) {
    return requireCommsChannelConfigKeys(config, ['smtpHost', 'fromEmail']);
  }

  async send(input: CommsChannelSendInput): Promise<CommsChannelDeliveryResult> {
    try {
      const from = requireSmtpMessageText(this.options.from, 'from');
      const to = requireSmtpMessageText(input.recipient.recipientContact, 'recipient contact');
      const subject = requireSmtpMessageText(
        input.template.subject ?? input.template.templateCode,
        'subject',
      );
      const result = await this.options.transport.send(this.options.config, {
        from,
        to,
        subject,
        bodyHtml: input.template.bodyHtml,
        bodyText: input.template.bodyText,
        attachments: readAttachments(input.templateVariables),
      });

      return {
        outcome: COMMS_CHANNEL_DELIVERY_OUTCOME.DELIVERED,
        providerMessageId: result.messageId,
        providerResponse: result.response,
        sentAt: this.options.now?.() ?? new Date(),
      };
    } catch (error) {
      if (error instanceof SmtpDeliveryError) {
        return {
          outcome: mapSmtpErrorToDeliveryOutcome(error.code),
          errorCode: error.code,
          errorMessage: error.message,
        };
      }

      return {
        outcome: COMMS_CHANNEL_DELIVERY_OUTCOME.RETRYABLE_FAILURE,
        errorCode: SMTP_DELIVERY_ERROR_CODE.UNKNOWN,
        errorMessage: error instanceof Error ? error.message : 'Non-Error SMTP failure',
      };
    }
  }
}

function readAttachments(
  variables: Record<string, unknown> | undefined,
): SmtpAttachment[] | undefined {
  const raw = variables?.['attachments'];
  if (!Array.isArray(raw)) {
    return undefined;
  }

  const attachments = raw
    .map((entry): SmtpAttachment | null => {
      if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
        return null;
      }

      const source = entry as Record<string, unknown>;
      const attachment: SmtpAttachment = {};
      if (typeof source['filename'] === 'string') attachment.filename = source['filename'];
      if (typeof source['path'] === 'string') attachment.path = source['path'];
      if (typeof source['content'] === 'string' || Buffer.isBuffer(source['content'])) {
        attachment.content = source['content'];
      }
      if (typeof source['contentType'] === 'string') attachment.contentType = source['contentType'];
      return Object.keys(attachment).length > 0 ? attachment : null;
    })
    .filter((entry): entry is SmtpAttachment => entry !== null);

  return attachments.length > 0 ? attachments : undefined;
}

function mapSmtpErrorToDeliveryOutcome(
  code: SmtpDeliveryErrorCode,
): typeof COMMS_CHANNEL_DELIVERY_OUTCOME[keyof typeof COMMS_CHANNEL_DELIVERY_OUTCOME] {
  if (
    code === SMTP_DELIVERY_ERROR_CODE.AUTH_FAILED
    || code === SMTP_DELIVERY_ERROR_CODE.INVALID_MESSAGE
    || code === SMTP_DELIVERY_ERROR_CODE.REJECTED
  ) {
    return COMMS_CHANNEL_DELIVERY_OUTCOME.PERMANENT_FAILURE;
  }

  return COMMS_CHANNEL_DELIVERY_OUTCOME.RETRYABLE_FAILURE;
}

function requireSmtpMessageText(value: unknown, fieldName: string): string {
  if (typeof value !== 'string') {
    throw new SmtpDeliveryError(
      SMTP_DELIVERY_ERROR_CODE.INVALID_MESSAGE,
      `SMTP message ${fieldName} is required`,
    );
  }
  const trimmed = value.trim();
  if (!trimmed) {
    throw new SmtpDeliveryError(
      SMTP_DELIVERY_ERROR_CODE.INVALID_MESSAGE,
      `SMTP message ${fieldName} is required`,
    );
  }
  return trimmed;
}

/**
 * Simple Handlebars-style template renderer.
 * Replaces `{{key}}` with values from data.
 * Does NOT require handlebars as a dependency.
 */
export function renderSimpleTemplate(
  template: string,
  data: Record<string, string | number | boolean | undefined | null>,
): string {
  if (!template) return '';
  let result = template;
  for (const key of Object.keys(data)) {
    const value = data[key] != null ? String(data[key]) : '';
    result = result.split(`{{${key}}}`).join(value);
  }
  return result;
}
