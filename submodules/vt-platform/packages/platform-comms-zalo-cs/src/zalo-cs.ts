export type ZaloCsMessageType = 'text' | 'image' | 'file';

export const ZALO_CS_HTTP_STATUS = {
  OK: 200,
  TOO_MANY_REQUESTS: 429,
  SERVER_ERROR_MIN: 500,
  INTERNAL_SERVER_ERROR: 500,
} as const;

export const ZALO_CS_RETRY_BASE_DELAY_MS = 1_000;

export const ZALO_CS_DEFAULTS = {
  API_URL: 'https://openapi.zalo.me/v3.0/oa/message/cs',
} as const;

export interface ZaloCsSendMessageInput {
  accessToken: string;
  recipientId: string;
  type: ZaloCsMessageType;
  text?: string;
  mediaUrl?: string;
}

export interface ZaloCsFetchResponse {
  ok: boolean;
  status: number;
  statusText?: string;
  json(): Promise<unknown>;
}

export interface ZaloCsTransportPort {
  fetch(url: string, init: { method: 'POST'; headers: Record<string, string>; body: string }): Promise<ZaloCsFetchResponse>;
}

export interface ZaloCsClientOptions {
  apiUrl?: string;
  maxRetries?: number;
  retryDelayMs?: (attempt: number) => number;
  sleep?: (ms: number) => Promise<void>;
}

export class ZaloCsHttpError extends Error {
  constructor(
    public readonly status: number,
    public readonly detail: string,
  ) {
    super(`Zalo CS API HTTP ${status}${detail}`);
    this.name = 'ZaloCsHttpError';
  }
}

export class ZaloCsProviderError extends Error {
  constructor(
    public readonly vendorErrorCode: unknown,
    public readonly vendorMessage: unknown,
  ) {
    super(`Zalo CS API error: ${vendorErrorCode} - ${vendorMessage}`);
    this.name = 'ZaloCsProviderError';
  }
}

export class ZaloCsInputError extends Error {
  constructor(public readonly code: 'ZALO_CS_MESSAGE_TEXT_REQUIRED' | 'ZALO_CS_MESSAGE_MEDIA_URL_REQUIRED') {
    super(code);
    this.name = 'ZaloCsInputError';
  }
}

export class ZaloCsClient {
  private readonly apiUrl: string;
  private readonly maxRetries: number;
  private readonly retryDelayMs: (attempt: number) => number;
  private readonly sleep: (ms: number) => Promise<void>;

  constructor(
    private readonly transport: ZaloCsTransportPort,
    options: ZaloCsClientOptions = {},
  ) {
    this.apiUrl = options.apiUrl ?? ZALO_CS_DEFAULTS.API_URL;
    this.maxRetries = options.maxRetries ?? 3;
    this.retryDelayMs = options.retryDelayMs
      ?? ((attempt) => Math.pow(2, attempt) * ZALO_CS_RETRY_BASE_DELAY_MS);
    this.sleep = options.sleep ?? ((ms) => new Promise((resolve) => setTimeout(resolve, ms)));
  }

  async send(input: ZaloCsSendMessageInput): Promise<void> {
    const body = this.buildBody(input);

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      const response = await this.transport.fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          access_token: input.accessToken,
        },
        body: JSON.stringify(body),
      });

      if (
        (
          response.status === ZALO_CS_HTTP_STATUS.TOO_MANY_REQUESTS
          || response.status >= ZALO_CS_HTTP_STATUS.SERVER_ERROR_MIN
        )
        && attempt < this.maxRetries
      ) {
        await this.sleep(this.retryDelayMs(attempt));
        continue;
      }

      const payload = await this.safeJson(response);
      if (!response.ok) {
        throw new ZaloCsHttpError(response.status, this.describeHttpError(payload));
      }

      const envelope = this.toRecord(payload);
      if (envelope['error'] !== 0) {
        throw new ZaloCsProviderError(envelope['error'], envelope['message']);
      }

      return;
    }
  }

  buildBody(input: ZaloCsSendMessageInput): unknown {
    const recipient = { user_id: input.recipientId };

    if (input.type === 'text') {
      return { recipient, message: { text: this.requireNonEmpty(input.text, 'ZALO_CS_MESSAGE_TEXT_REQUIRED') } };
    }

    const mediaUrl = this.requireNonEmpty(input.mediaUrl, 'ZALO_CS_MESSAGE_MEDIA_URL_REQUIRED');

    return {
      recipient,
      message: {
        attachment: {
          type: 'template',
          payload: {
            template_type: 'media',
            elements: [
              {
                media_type: input.type,
                url: mediaUrl,
              },
            ],
          },
        },
      },
    };
  }

  private async safeJson(response: ZaloCsFetchResponse): Promise<unknown> {
    try {
      return await response.json();
    } catch {
      return undefined;
    }
  }

  private describeHttpError(payload: unknown): string {
    const record = this.toRecord(payload);
    if ('error' in record || 'message' in record) {
      return ` (error=${record['error']}, message=${record['message']})`;
    }
    return '';
  }

  private toRecord(value: unknown): Record<string, unknown> {
    return value && typeof value === 'object' && !Array.isArray(value)
      ? value as Record<string, unknown>
      : {};
  }

  private requireNonEmpty(
    value: unknown,
    code: 'ZALO_CS_MESSAGE_TEXT_REQUIRED' | 'ZALO_CS_MESSAGE_MEDIA_URL_REQUIRED',
  ): string {
    if (typeof value !== 'string' || value.trim().length === 0) {
      throw new ZaloCsInputError(code);
    }
    return value.trim();
  }
}
