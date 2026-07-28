export interface WordPressSitePublishContent {
  title: string;
  body: string;
  imageUrl?: string;
  callToAction?: string;
  tags?: string[];
}

export interface WordPressSitePublishRequest {
  siteUrl: string;
  accessToken: string;
  content: WordPressSitePublishContent;
  scheduledAt?: string;
}

export interface WordPressSitePublishSuccessResult {
  success: true;
  externalPostId: string;
  externalUrl: string;
}

export interface WordPressSitePublishFailureResult {
  success: false;
  vendorErrorCode?: number;
  vendorMessage?: string;
}

export type WordPressSitePublishResult =
  | WordPressSitePublishSuccessResult
  | WordPressSitePublishFailureResult;

export interface WordPressSiteTransportRequest {
  method: 'GET' | 'POST';
  headers: Record<string, string>;
  body?: string;
}

export interface WordPressSiteTransportResponse {
  status: number;
  body?: unknown;
}

export const WORDPRESS_SITE_HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  UNAUTHORIZED: 401,
  INTERNAL_SERVER_ERROR: 500,
} as const;

export const WORDPRESS_SITE_HTTP_STATUS_RANGES = {
  SUCCESS_MIN: 200,
  SUCCESS_MAX_EXCLUSIVE: 300,
} as const;

export interface WordPressSiteTransportPort {
  fetch(url: string, init: WordPressSiteTransportRequest): Promise<WordPressSiteTransportResponse>;
}

export interface WordPressSitePublishClientOptions {
  titleMaxLength?: number;
}

export const WORDPRESS_SITE_PUBLISH_PUBLIC_ERROR_MESSAGES = {
  ERROR_PAYLOAD_INVALID: 'WordPress API returned invalid error payload',
  SUCCESS_POST_ID_MISSING: 'WordPress API returned success without post id',
} as const;

interface WordPressPostPayload {
  title: string;
  content: string;
  status: 'future' | 'publish';
  date?: string;
  tags_input?: string[];
}

export class WordPressSiteResponseContractError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'WordPressSiteResponseContractError';
  }
}

export class WordPressSitePublishClient {
  private readonly titleMaxLength: number;

  constructor(
    private readonly transport: WordPressSiteTransportPort,
    options: WordPressSitePublishClientOptions = {},
  ) {
    this.titleMaxLength = options.titleMaxLength ?? 200;
  }

  async publish(request: WordPressSitePublishRequest): Promise<WordPressSitePublishResult> {
    const normalizedSiteUrl = this.normalizeUrl(request.siteUrl);
    const response = await this.transport.fetch(
      `${normalizedSiteUrl}/wp-json/wp/v2/posts`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Basic ${request.accessToken}`,
        },
        body: JSON.stringify(this.buildPostPayload(request)),
      },
    );

    if (
      response.status >= WORDPRESS_SITE_HTTP_STATUS_RANGES.SUCCESS_MIN
      && response.status < WORDPRESS_SITE_HTTP_STATUS_RANGES.SUCCESS_MAX_EXCLUSIVE
    ) {
      const success = this.parseSuccessPayload(response.body, normalizedSiteUrl);
      if (!success) {
        throw new WordPressSiteResponseContractError(
          WORDPRESS_SITE_PUBLISH_PUBLIC_ERROR_MESSAGES.SUCCESS_POST_ID_MISSING,
        );
      }
      return success;
    }

    const { vendorErrorCode, vendorMessage } = this.parseErrorPayload(response.status, response.body);
    return {
      success: false,
      ...(vendorErrorCode !== undefined ? { vendorErrorCode } : {}),
      ...(vendorMessage !== undefined ? { vendorMessage } : {}),
    };
  }

  async validateCredentials(siteUrl: string, accessToken: string): Promise<boolean> {
    try {
      const response = await this.transport.fetch(
        `${this.normalizeUrl(siteUrl)}/wp-json/wp/v2/users/me`,
        {
          method: 'GET',
          headers: {
            Authorization: `Basic ${accessToken}`,
          },
        },
      );

      if (
        response.status < WORDPRESS_SITE_HTTP_STATUS_RANGES.SUCCESS_MIN
        || response.status >= WORDPRESS_SITE_HTTP_STATUS_RANGES.SUCCESS_MAX_EXCLUSIVE
      ) {
        return false;
      }

      return this.parseCredentialPayload(response.body);
    } catch {
      return false;
    }
  }

  private buildPostPayload(request: WordPressSitePublishRequest): WordPressPostPayload {
    const title = request.content.title.length > this.titleMaxLength
      ? request.content.title.substring(0, this.titleMaxLength)
      : request.content.title;

    return {
      title,
      content: this.buildHtmlContent(request.content),
      status: request.scheduledAt ? 'future' : 'publish',
      ...(request.scheduledAt ? { date: request.scheduledAt } : {}),
      ...(request.content.tags && request.content.tags.length > 0
        ? { tags_input: request.content.tags }
        : {}),
    };
  }

  private buildHtmlContent(content: WordPressSitePublishContent): string {
    const parts: string[] = [];

    if (content.imageUrl) {
      parts.push(`<figure><img src="${content.imageUrl}" alt="${content.title}" /></figure>`);
    }

    parts.push(content.body);

    if (content.callToAction) {
      parts.push(`<p><strong>${content.callToAction}</strong></p>`);
    }

    if (content.tags && content.tags.length > 0) {
      parts.push(`<p>${content.tags.map((tag) => `#${tag}`).join(' ')}</p>`);
    }

    return parts.join('\n');
  }

  private parseSuccessPayload(
    body: unknown,
    normalizedSiteUrl: string,
  ): WordPressSitePublishSuccessResult | undefined {
    if (!this.isRecord(body)) {
      return undefined;
    }

    const externalPostId = this.toExternalId(body['id']);
    if (!externalPostId) {
      return undefined;
    }

    const link = typeof body['link'] === 'string' && body['link'].length > 0
      ? body['link']
      : `${normalizedSiteUrl}/?p=${externalPostId}`;

    return {
      success: true,
      externalPostId,
      externalUrl: link,
    };
  }

  private parseCredentialPayload(body: unknown): boolean {
    if (!this.isRecord(body)) {
      return false;
    }

    return this.toExternalId(body['id']) !== undefined;
  }

  private parseErrorPayload(
    status: number,
    body: unknown,
  ): { vendorErrorCode: number; vendorMessage: string } {
    if (body === undefined || body === null) {
      return {
        vendorErrorCode: status,
        vendorMessage: `WordPress API error (HTTP ${status})`,
      };
    }

    if (!this.isRecord(body)) {
      throw new WordPressSiteResponseContractError(
        WORDPRESS_SITE_PUBLISH_PUBLIC_ERROR_MESSAGES.ERROR_PAYLOAD_INVALID,
      );
    }

    const data = this.isRecord(body['data']) ? body['data'] : undefined;
    const message = typeof body['message'] === 'string'
      ? body['message']
      : `WordPress API error (HTTP ${status})`;
    const code = typeof data?.['status'] === 'number' ? data['status'] : status;

    return {
      vendorErrorCode: code,
      vendorMessage: message,
    };
  }

  private normalizeUrl(url: string): string {
    return url.replace(/\/+$/, '');
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
