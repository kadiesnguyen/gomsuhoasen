export interface FacebookPagePublishContent {
  title: string;
  body: string;
  imageUrl?: string;
  callToAction?: string;
  tags?: string[];
}

export interface FacebookPagePublishRequest {
  pageId: string;
  accessToken: string;
  content: FacebookPagePublishContent;
  scheduledAt?: string;
}

export interface FacebookPagePublishSuccessResult {
  success: true;
  externalPostId: string;
  externalUrl: string;
}

export interface FacebookPagePublishFailureResult {
  success: false;
  vendorErrorCode?: number;
  vendorMessage?: string;
}

export type FacebookPagePublishResult =
  | FacebookPagePublishSuccessResult
  | FacebookPagePublishFailureResult;

export interface FacebookPageTransportRequest {
  method: 'GET' | 'POST';
  headers: Record<string, string>;
  body?: string;
}

export interface FacebookPageTransportPort {
  fetchJson(url: string, init: FacebookPageTransportRequest): Promise<unknown>;
}

export interface FacebookPagePublishClientOptions {
  graphApiBaseUrl?: string;
  maxBodyLength?: number;
}

export const FACEBOOK_PAGE_PUBLISH_PUBLIC_ERROR_MESSAGES = {
  RESPONSE_ENVELOPE_INVALID: 'Facebook API returned an invalid response envelope',
  ERROR_PAYLOAD_INVALID: 'Facebook API returned invalid error payload',
  SUCCESS_POST_ID_MISSING: 'Facebook API returned success without post id',
} as const;

export const FACEBOOK_PAGE_TIME = {
  MILLISECONDS_PER_SECOND: 1000,
} as const;

export const FACEBOOK_PAGE_DEFAULTS = {
  GRAPH_API_BASE_URL: 'https://graph.facebook.com/v19.0',
} as const;

interface FacebookFeedPayload {
  message: string;
  link?: string;
  published?: false;
  scheduled_publish_time?: number;
}

interface FacebookErrorPayload {
  vendorMessage?: string;
  vendorErrorCode?: number;
}

export class FacebookPageResponseContractError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FacebookPageResponseContractError';
  }
}

export class FacebookPagePublishClient {
  private readonly graphApiBaseUrl: string;
  private readonly maxBodyLength: number;

  constructor(
    private readonly transport: FacebookPageTransportPort,
    options: FacebookPagePublishClientOptions = {},
  ) {
    this.graphApiBaseUrl = options.graphApiBaseUrl ?? FACEBOOK_PAGE_DEFAULTS.GRAPH_API_BASE_URL;
    this.maxBodyLength = options.maxBodyLength ?? 63_000;
  }

  async publish(request: FacebookPagePublishRequest): Promise<FacebookPagePublishResult> {
    const payload = await this.transport.fetchJson(
      `${this.graphApiBaseUrl}/${request.pageId}/feed`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${request.accessToken}`,
        },
        body: JSON.stringify(this.buildFeedPayload(request)),
      },
    );

    return this.parsePublishResponse(payload);
  }

  async validateCredentials(pageId: string, accessToken: string): Promise<boolean> {
    try {
      const payload = await this.transport.fetchJson(
        `${this.graphApiBaseUrl}/${pageId}?fields=id,name`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );
      const resolvedPageId = this.parseCredentialResponse(payload);
      return resolvedPageId === pageId;
    } catch {
      return false;
    }
  }

  private buildFeedPayload(request: FacebookPagePublishRequest): FacebookFeedPayload {
    const body = request.content.body.length > this.maxBodyLength
      ? request.content.body.substring(0, this.maxBodyLength)
      : request.content.body;

    const messageParts: string[] = [];
    if (request.content.title) {
      messageParts.push(request.content.title);
    }
    messageParts.push(body);
    if (request.content.callToAction) {
      messageParts.push(request.content.callToAction);
    }
    if (request.content.tags && request.content.tags.length > 0) {
      messageParts.push(request.content.tags.map((tag) => `#${tag}`).join(' '));
    }

    return {
      message: messageParts.join('\n\n'),
      ...(request.content.imageUrl ? { link: request.content.imageUrl } : {}),
      ...(request.scheduledAt
        ? {
            published: false,
            scheduled_publish_time: Math.floor(
              new Date(request.scheduledAt).getTime() / FACEBOOK_PAGE_TIME.MILLISECONDS_PER_SECOND,
            ),
          }
        : {}),
    };
  }

  private parsePublishResponse(payload: unknown): FacebookPagePublishResult {
    if (!this.isRecord(payload)) {
      throw new FacebookPageResponseContractError(
        FACEBOOK_PAGE_PUBLISH_PUBLIC_ERROR_MESSAGES.RESPONSE_ENVELOPE_INVALID,
      );
    }

    if ('id' in payload) {
      const externalPostId = this.toExternalId(payload['id']);
      if (!externalPostId) {
        throw new FacebookPageResponseContractError(
          FACEBOOK_PAGE_PUBLISH_PUBLIC_ERROR_MESSAGES.SUCCESS_POST_ID_MISSING,
        );
      }
      return {
        success: true,
        externalPostId,
        externalUrl: `https://www.facebook.com/${externalPostId.replace('_', '/posts/')}`,
      };
    }

    if ('error' in payload) {
      return {
        success: false,
        ...this.parseErrorPayload(payload['error']),
      };
    }

    throw new FacebookPageResponseContractError(
      FACEBOOK_PAGE_PUBLISH_PUBLIC_ERROR_MESSAGES.RESPONSE_ENVELOPE_INVALID,
    );
  }

  private parseCredentialResponse(payload: unknown): string | undefined {
    if (!this.isRecord(payload)) {
      throw new FacebookPageResponseContractError(
        FACEBOOK_PAGE_PUBLISH_PUBLIC_ERROR_MESSAGES.RESPONSE_ENVELOPE_INVALID,
      );
    }

    if ('id' in payload) {
      return this.toExternalId(payload['id']);
    }

    if ('error' in payload) {
      return undefined;
    }

    throw new FacebookPageResponseContractError(
      FACEBOOK_PAGE_PUBLISH_PUBLIC_ERROR_MESSAGES.RESPONSE_ENVELOPE_INVALID,
    );
  }

  private parseErrorPayload(value: unknown): FacebookErrorPayload {
    if (!this.isRecord(value)) {
      throw new FacebookPageResponseContractError(
        FACEBOOK_PAGE_PUBLISH_PUBLIC_ERROR_MESSAGES.ERROR_PAYLOAD_INVALID,
      );
    }

    const code = typeof value['code'] === 'number' ? value['code'] : undefined;
    const message = typeof value['message'] === 'string' ? value['message'] : undefined;
    if (code === undefined && message === undefined) {
      throw new FacebookPageResponseContractError(
        FACEBOOK_PAGE_PUBLISH_PUBLIC_ERROR_MESSAGES.ERROR_PAYLOAD_INVALID,
      );
    }

    return {
      ...(code !== undefined ? { vendorErrorCode: code } : {}),
      ...(message !== undefined ? { vendorMessage: message } : {}),
    };
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
