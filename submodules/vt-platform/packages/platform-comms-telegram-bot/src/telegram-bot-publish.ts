export interface TelegramBotPublishContent {
  title: string;
  body: string;
  imageUrl?: string;
  callToAction?: string;
  tags?: string[];
}

export interface TelegramBotPublishRequest {
  chatId: string;
  botToken: string;
  content: TelegramBotPublishContent;
}

export interface TelegramBotPublishSuccessResult {
  success: true;
  externalPostId: string;
  externalUrl?: string;
}

export interface TelegramBotPublishFailureResult {
  success: false;
  vendorErrorCode?: number;
  vendorMessage?: string;
}

export type TelegramBotPublishResult =
  | TelegramBotPublishSuccessResult
  | TelegramBotPublishFailureResult;

export interface TelegramBotTransportRequest {
  method: 'GET' | 'POST';
  headers: Record<string, string>;
  body?: string;
}

export interface TelegramBotTransportResponse {
  status: number;
  body?: unknown;
}

export interface TelegramBotTransportPort {
  fetch(url: string, init?: TelegramBotTransportRequest): Promise<TelegramBotTransportResponse>;
}

export interface TelegramBotPublishClientOptions {
  apiBaseUrl?: string;
  messageMaxLength?: number;
  captionMaxLength?: number;
}

export const TELEGRAM_BOT_PUBLISH_PUBLIC_ERROR_MESSAGES = {
  RESPONSE_ENVELOPE_INVALID: 'Telegram API returned an invalid response envelope',
  ERROR_PAYLOAD_INVALID: 'Telegram API returned invalid error payload',
  SUCCESS_MESSAGE_ID_MISSING: 'Telegram API returned success without message id',
} as const;

export const TELEGRAM_BOT_DEFAULTS = {
  API_BASE_URL: 'https://api.telegram.org/bot',
} as const;

interface TelegramSuccessPayload {
  messageId: string;
}

export class TelegramBotResponseContractError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TelegramBotResponseContractError';
  }
}

export class TelegramBotPublishClient {
  private readonly apiBaseUrl: string;
  private readonly messageMaxLength: number;
  private readonly captionMaxLength: number;

  constructor(
    private readonly transport: TelegramBotTransportPort,
    options: TelegramBotPublishClientOptions = {},
  ) {
    this.apiBaseUrl = options.apiBaseUrl ?? TELEGRAM_BOT_DEFAULTS.API_BASE_URL;
    this.messageMaxLength = options.messageMaxLength ?? 4096;
    this.captionMaxLength = options.captionMaxLength ?? 1024;
  }

  async publish(request: TelegramBotPublishRequest): Promise<TelegramBotPublishResult> {
    const photoMessageId = request.content.imageUrl
      ? await this.trySendPhoto(request)
      : undefined;

    const response = await this.transport.fetch(
      `${this.apiBaseUrl}${request.botToken}/sendMessage`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: request.chatId,
          text: this.buildMessageText(request.content),
          parse_mode: 'HTML',
          disable_web_page_preview: Boolean(request.content.imageUrl),
        }),
      },
    );

    return this.parsePublishResponse(response, request.chatId, photoMessageId);
  }

  async validateCredentials(botToken: string): Promise<boolean> {
    try {
      const response = await this.transport.fetch(`${this.apiBaseUrl}${botToken}/getMe`, {
        method: 'GET',
        headers: {},
      });
      const payload = response.body;
      if (!this.isRecord(payload)) {
        return false;
      }
      return payload['ok'] === true;
    } catch {
      return false;
    }
  }

  private async trySendPhoto(request: TelegramBotPublishRequest): Promise<string | undefined> {
    try {
      const response = await this.transport.fetch(
        `${this.apiBaseUrl}${request.botToken}/sendPhoto`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: request.chatId,
            photo: request.content.imageUrl,
            caption: request.content.title
              ? request.content.title.substring(0, this.captionMaxLength)
              : undefined,
            parse_mode: 'HTML',
          }),
        },
      );

      const success = this.parseSuccessPayload(response.body, false);
      return success?.messageId;
    } catch {
      return undefined;
    }
  }

  private parsePublishResponse(
    response: TelegramBotTransportResponse,
    chatId: string,
    photoMessageId?: string,
  ): TelegramBotPublishResult {
    const success = this.parseSuccessPayload(response.body, true);
    if (success) {
      return {
        success: true,
        externalPostId: photoMessageId ?? success.messageId,
        ...(chatId.startsWith('@')
          ? {
              externalUrl: `https://t.me/${chatId.replace('@', '')}/${success.messageId}`,
            }
          : {}),
      };
    }

    const { vendorErrorCode, vendorMessage } = this.parseErrorPayload(response.body, response.status);
    return {
      success: false,
      ...(vendorErrorCode !== undefined ? { vendorErrorCode } : {}),
      ...(vendorMessage !== undefined ? { vendorMessage } : {}),
    };
  }

  private parseSuccessPayload(
    body: unknown,
    strictEnvelope: boolean,
  ): TelegramSuccessPayload | undefined {
    if (!this.isRecord(body)) {
      if (strictEnvelope) {
        throw new TelegramBotResponseContractError(
          TELEGRAM_BOT_PUBLISH_PUBLIC_ERROR_MESSAGES.RESPONSE_ENVELOPE_INVALID,
        );
      }
      return undefined;
    }

    const ok = body['ok'];
    if (ok === true) {
      const result = body['result'];
      if (!this.isRecord(result)) {
        throw new TelegramBotResponseContractError(
          TELEGRAM_BOT_PUBLISH_PUBLIC_ERROR_MESSAGES.RESPONSE_ENVELOPE_INVALID,
        );
      }

      const messageId = this.toExternalId(result['message_id']);
      if (!messageId) {
        throw new TelegramBotResponseContractError(
          TELEGRAM_BOT_PUBLISH_PUBLIC_ERROR_MESSAGES.SUCCESS_MESSAGE_ID_MISSING,
        );
      }

      return { messageId };
    }

    return undefined;
  }

  private parseErrorPayload(
    body: unknown,
    status: number,
  ): { vendorErrorCode: number; vendorMessage: string } {
    if (!this.isRecord(body)) {
      throw new TelegramBotResponseContractError(
        TELEGRAM_BOT_PUBLISH_PUBLIC_ERROR_MESSAGES.ERROR_PAYLOAD_INVALID,
      );
    }

    if (!('ok' in body) || body['ok'] !== false) {
      throw new TelegramBotResponseContractError(
        TELEGRAM_BOT_PUBLISH_PUBLIC_ERROR_MESSAGES.RESPONSE_ENVELOPE_INVALID,
      );
    }

    const description = typeof body['description'] === 'string' ? body['description'] : undefined;
    const errorCode = typeof body['error_code'] === 'number' ? body['error_code'] : undefined;
    if (!description && errorCode === undefined) {
      throw new TelegramBotResponseContractError(
        TELEGRAM_BOT_PUBLISH_PUBLIC_ERROR_MESSAGES.ERROR_PAYLOAD_INVALID,
      );
    }

    return {
      vendorErrorCode: errorCode ?? status,
      vendorMessage: description ?? `Telegram API error (HTTP ${status})`,
    };
  }

  private buildMessageText(content: TelegramBotPublishContent): string {
    const parts: string[] = [];

    if (content.title) {
      parts.push(`<b>${this.escapeHtml(content.title)}</b>`);
    }

    parts.push(content.body);

    if (content.callToAction) {
      parts.push(`\n${content.callToAction}`);
    }

    if (content.tags && content.tags.length > 0) {
      parts.push(`\n${content.tags.map((tag) => `#${tag}`).join(' ')}`);
    }

    const message = parts.join('\n\n');
    return message.length > this.messageMaxLength
      ? message.substring(0, this.messageMaxLength)
      : message;
  }

  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  private toExternalId(value: unknown): string | undefined {
    if (typeof value === 'string' && value.length > 0) {
      return value;
    }
    if (typeof value === 'number' && Number.isFinite(value)) {
      return String(value);
    }
    return undefined;
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
  }
}
