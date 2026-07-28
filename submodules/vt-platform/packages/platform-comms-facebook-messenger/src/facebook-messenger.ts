import { appendUrlQueryString } from '@vt/platform-api-contract';

export type FacebookMessengerMessageType = 'text' | 'image' | 'file';

export const FACEBOOK_MESSENGER_HTTP_STATUS = {
  OK: 200,
  BAD_REQUEST: 400,
  TOO_MANY_REQUESTS: 429,
  SERVER_ERROR_MIN: 500,
} as const;

export const FACEBOOK_MESSENGER_RETRY_BASE_DELAY_MS = 1_000;

export const FACEBOOK_MESSENGER_DEFAULTS = {
  GRAPH_API_BASE_URL: 'https://graph.facebook.com/v21.0',
} as const;

export interface FacebookMessengerSendInput {
  accessToken: string;
  recipientId: string;
  type: FacebookMessengerMessageType;
  text?: string;
  mediaUrl?: string;
}

export interface FacebookMessengerFetchResponse {
  ok: boolean;
  status: number;
  json(): Promise<unknown>;
}

export interface FacebookMessengerTransportPort {
  fetch(url: string, init: { method: 'POST'; headers: Record<string, string>; body: string }): Promise<FacebookMessengerFetchResponse>;
}

export interface FacebookMessengerClientOptions {
  graphApiBaseUrl?: string;
  maxRetries?: number;
  retryDelayMs?: (attempt: number) => number;
  sleep?: (ms: number) => Promise<void>;
}

export class FacebookMessengerHttpError extends Error {
  constructor(
    public readonly status: number,
    public readonly detail: string,
  ) {
    super(`Facebook Messenger API HTTP ${status}${detail}`);
    this.name = 'FacebookMessengerHttpError';
  }
}

export class FacebookMessengerInputError extends Error {
  constructor(public readonly code: 'FACEBOOK_MESSAGE_TEXT_REQUIRED' | 'FACEBOOK_MESSAGE_MEDIA_URL_REQUIRED') {
    super(code);
    this.name = 'FacebookMessengerInputError';
  }
}

export class FacebookMessengerClient {
  private readonly graphApiBaseUrl: string;
  private readonly maxRetries: number;
  private readonly retryDelayMs: (attempt: number) => number;
  private readonly sleep: (ms: number) => Promise<void>;

  constructor(
    private readonly transport: FacebookMessengerTransportPort,
    options: FacebookMessengerClientOptions = {},
  ) {
    this.graphApiBaseUrl = options.graphApiBaseUrl ?? FACEBOOK_MESSENGER_DEFAULTS.GRAPH_API_BASE_URL;
    this.maxRetries = options.maxRetries ?? 3;
    this.retryDelayMs = options.retryDelayMs
      ?? ((attempt) => Math.pow(2, attempt) * FACEBOOK_MESSENGER_RETRY_BASE_DELAY_MS);
    this.sleep = options.sleep ?? ((ms) => new Promise((resolve) => setTimeout(resolve, ms)));
  }

  async send(input: FacebookMessengerSendInput): Promise<void> {
    const url = appendUrlQueryString(`${this.graphApiBaseUrl}/me/messages`, {
      access_token: input.accessToken,
    });
    const body = this.buildBody(input);

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      const response = await this.transport.fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (
        (
          response.status === FACEBOOK_MESSENGER_HTTP_STATUS.TOO_MANY_REQUESTS
          || response.status >= FACEBOOK_MESSENGER_HTTP_STATUS.SERVER_ERROR_MIN
        )
        && attempt < this.maxRetries
      ) {
        await this.sleep(this.retryDelayMs(attempt));
        continue;
      }

      if (!response.ok) {
        const payload = await this.safeJson(response);
        throw new FacebookMessengerHttpError(response.status, this.describeHttpError(payload));
      }

      return;
    }
  }

  buildBody(input: FacebookMessengerSendInput): unknown {
    const base = {
      messaging_type: 'RESPONSE',
      recipient: { id: input.recipientId },
    };

    if (input.type === 'text') {
      return { ...base, message: { text: this.requireNonEmpty(input.text, 'FACEBOOK_MESSAGE_TEXT_REQUIRED') } };
    }

    const mediaUrl = this.requireNonEmpty(input.mediaUrl, 'FACEBOOK_MESSAGE_MEDIA_URL_REQUIRED');

    return {
      ...base,
      message: {
        attachment: {
          type: input.type,
          payload: {
            url: mediaUrl,
            is_reusable: true,
          },
        },
      },
    };
  }

  private async safeJson(response: FacebookMessengerFetchResponse): Promise<unknown> {
    try {
      return await response.json();
    } catch {
      return undefined;
    }
  }

  private describeHttpError(payload: unknown): string {
    const error = this.toRecord(this.toRecord(payload)['error']);
    if ('code' in error || 'message' in error) {
      return ` (code=${error['code']}, message=${error['message']})`;
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
    code: 'FACEBOOK_MESSAGE_TEXT_REQUIRED' | 'FACEBOOK_MESSAGE_MEDIA_URL_REQUIRED',
  ): string {
    if (typeof value !== 'string' || value.trim().length === 0) {
      throw new FacebookMessengerInputError(code);
    }
    return value.trim();
  }
}
