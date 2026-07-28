export interface ZaloOaPublishContent {
  title: string;
  body: string;
  imageUrl?: string;
  callToAction?: string;
  tags?: string[];
}

export interface ZaloOaPublishRequest {
  oaId: string;
  accessToken: string;
  content: ZaloOaPublishContent;
  scheduledAt?: string;
}

export interface ZaloOaPublishSuccessResult {
  success: true;
  externalPostId: string;
  externalUrl: string;
}

export interface ZaloOaPublishFailureResult {
  success: false;
  vendorErrorCode?: number;
  vendorMessage?: string;
}

export type ZaloOaPublishResult =
  | ZaloOaPublishSuccessResult
  | ZaloOaPublishFailureResult;

export interface ZaloOaTransportRequest {
  method: 'GET' | 'POST';
  headers: Record<string, string>;
  body?: string;
}

export interface ZaloOaTransportPort {
  fetchJson(url: string, init: ZaloOaTransportRequest): Promise<unknown>;
}

export interface ZaloOaPublishClientOptions {
  apiBaseUrl?: string;
  authorName?: string;
  descriptionLimit?: number;
}

export const ZALO_OA_PUBLISH_PUBLIC_ERROR_MESSAGES = {
  RESPONSE_ENVELOPE_INVALID: 'Zalo API returned an invalid response envelope',
  DATA_PAYLOAD_INVALID: 'Zalo API returned invalid data payload',
  SUCCESS_POST_ID_MISSING: 'Zalo API returned success without token or id',
} as const;

export const ZALO_OA_TIME = {
  MILLISECONDS_PER_SECOND: 1000,
} as const;

export const ZALO_OA_DEFAULTS = {
  API_BASE_URL: 'https://openapi.zalo.me/v2.0/oa',
  AUTHOR_NAME: 'Content Marketing',
} as const;

interface ZaloOaApiResponse {
  error: number;
  message?: string;
  data?: ZaloOaApiData;
}

interface ZaloOaApiResponseCandidate {
  error?: unknown;
  message?: unknown;
  data?: unknown;
}

interface ZaloOaApiData {
  token?: string | number;
  id?: string | number;
  oa_id?: string | number;
}

interface ZaloOaArticleCover {
  cover_type: 'photo';
  photo_url: string;
  status: 'show';
}

interface ZaloOaArticleBodyBlock {
  type: 'text';
  content: string;
}

interface ZaloOaArticlePayload {
  type: 'normal';
  title: string;
  author: string;
  cover?: ZaloOaArticleCover;
  description: string;
  body: ZaloOaArticleBodyBlock[];
  status: 'schedule' | 'show';
  scheduled_time?: number;
}

export class ZaloOaResponseContractError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ZaloOaResponseContractError';
  }
}

export class ZaloOaPublishClient {
  private readonly apiBaseUrl: string;
  private readonly authorName: string;
  private readonly descriptionLimit: number;

  constructor(
    private readonly transport: ZaloOaTransportPort,
    options: ZaloOaPublishClientOptions = {},
  ) {
    this.apiBaseUrl = options.apiBaseUrl ?? ZALO_OA_DEFAULTS.API_BASE_URL;
    this.authorName = options.authorName ?? ZALO_OA_DEFAULTS.AUTHOR_NAME;
    this.descriptionLimit = options.descriptionLimit ?? 150;
  }

  async publish(request: ZaloOaPublishRequest): Promise<ZaloOaPublishResult> {
    const response = await this.callApi(
      '/article/create',
      request.accessToken,
      this.buildArticlePayload(request),
      'POST',
    );

    if (response.error !== 0) {
      return {
        success: false,
        vendorErrorCode: response.error,
        vendorMessage: response.message,
      };
    }

    const externalPostId = response.data?.token ?? response.data?.id;
    if (externalPostId === undefined || externalPostId === null) {
      throw new ZaloOaResponseContractError(
        ZALO_OA_PUBLISH_PUBLIC_ERROR_MESSAGES.SUCCESS_POST_ID_MISSING,
      );
    }

    return {
      success: true,
      externalPostId: String(externalPostId),
      externalUrl: `https://oa.zalo.me/article/${externalPostId}`,
    };
  }

  async validateCredentials(oaId: string, accessToken: string): Promise<boolean> {
    try {
      const response = await this.callApi('/getoa', accessToken, undefined, 'GET');
      return response.error === 0 && response.data?.oa_id === oaId;
    } catch {
      return false;
    }
  }

  private buildArticlePayload(request: ZaloOaPublishRequest): ZaloOaArticlePayload {
    const { content, scheduledAt } = request;

    return {
      type: 'normal',
      title: content.title,
      author: this.authorName,
      description: content.body.substring(0, this.descriptionLimit),
      body: this.buildArticleBody(content),
      status: scheduledAt ? 'schedule' : 'show',
      ...(content.imageUrl
        ? {
            cover: {
              cover_type: 'photo' as const,
              photo_url: content.imageUrl,
              status: 'show' as const,
            },
          }
        : {}),
      ...(scheduledAt
        ? { scheduled_time: Math.floor(new Date(scheduledAt).getTime() / ZALO_OA_TIME.MILLISECONDS_PER_SECOND) }
        : {}),
    };
  }

  private buildArticleBody(content: ZaloOaPublishContent): ZaloOaArticleBodyBlock[] {
    const body: ZaloOaArticleBodyBlock[] = [{ type: 'text', content: content.body }];

    if (content.callToAction) {
      body.push({ type: 'text', content: `\n${content.callToAction}` });
    }

    if (content.tags && content.tags.length > 0) {
      body.push({ type: 'text', content: `\n${content.tags.map((tag) => `#${tag}`).join(' ')}` });
    }

    return body;
  }

  private async callApi(
    endpoint: string,
    accessToken: string,
    body?: ZaloOaArticlePayload,
    method: 'GET' | 'POST' = 'POST',
  ): Promise<ZaloOaApiResponse> {
    const payload = await this.transport.fetchJson(`${this.apiBaseUrl}${endpoint}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        access_token: accessToken,
      },
      ...(body && method === 'POST' ? { body: JSON.stringify(body) } : {}),
    });

    return this.parseApiResponse(payload);
  }

  private parseApiResponse(payload: unknown): ZaloOaApiResponse {
    if (!this.isApiResponseCandidate(payload) || typeof payload.error !== 'number') {
      throw new ZaloOaResponseContractError(
        ZALO_OA_PUBLISH_PUBLIC_ERROR_MESSAGES.RESPONSE_ENVELOPE_INVALID,
      );
    }

    return {
      error: payload.error,
      message: typeof payload.message === 'string' ? payload.message : undefined,
      data: this.parseApiData(payload.data),
    };
  }

  private isApiResponseCandidate(payload: unknown): payload is ZaloOaApiResponseCandidate {
    return Boolean(
      payload &&
        typeof payload === 'object' &&
        !Array.isArray(payload) &&
        'error' in payload,
    );
  }

  private parseApiData(value: unknown): ZaloOaApiData | undefined {
    if (value === undefined || value === null) {
      return undefined;
    }
    if (typeof value !== 'object' || Array.isArray(value)) {
      throw new ZaloOaResponseContractError(
        ZALO_OA_PUBLISH_PUBLIC_ERROR_MESSAGES.DATA_PAYLOAD_INVALID,
      );
    }

    const data: ZaloOaApiData = {};
    if ('token' in value && (typeof value.token === 'string' || typeof value.token === 'number')) {
      data.token = value.token;
    }
    if ('id' in value && (typeof value.id === 'string' || typeof value.id === 'number')) {
      data.id = value.id;
    }
    if ('oa_id' in value && (typeof value.oa_id === 'string' || typeof value.oa_id === 'number')) {
      data.oa_id = value.oa_id;
    }

    return data;
  }
}
