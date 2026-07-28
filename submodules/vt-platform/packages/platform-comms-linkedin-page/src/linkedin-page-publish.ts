export interface LinkedInPagePublishContent {
  title: string;
  body: string;
  imageUrl?: string;
  callToAction?: string;
  tags?: string[];
}

export interface LinkedInPagePublishRequest {
  authorUrn: string;
  accessToken: string;
  content: LinkedInPagePublishContent;
  scheduledAt?: string;
}

export interface LinkedInPagePublishSuccessResult {
  success: true;
  externalPostId: string;
  externalUrl: string;
}

export interface LinkedInPagePublishFailureResult {
  success: false;
  vendorErrorCode?: number;
  vendorMessage?: string;
}

export type LinkedInPagePublishResult =
  | LinkedInPagePublishSuccessResult
  | LinkedInPagePublishFailureResult;

export interface LinkedInPageTransportRequest {
  method: 'GET' | 'POST';
  headers: Record<string, string>;
  body?: string;
}

export interface LinkedInPageTransportResponse {
  status: number;
  headers: Record<string, string | undefined>;
  body?: unknown;
}

export const LINKEDIN_PAGE_HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  FORBIDDEN: 403,
} as const;

export interface LinkedInPageTransportPort {
  fetch(url: string, init: LinkedInPageTransportRequest): Promise<LinkedInPageTransportResponse>;
}

export interface LinkedInPagePublishClientOptions {
  apiBaseUrl?: string;
  maxBodyLength?: number;
}

export const LINKEDIN_PAGE_PUBLISH_PUBLIC_ERROR_MESSAGES = {
  ERROR_PAYLOAD_INVALID: 'LinkedIn API returned invalid error payload',
  SUCCESS_POST_ID_MISSING: 'LinkedIn API returned success without post id',
} as const;

export const LINKEDIN_PAGE_DEFAULTS = {
  API_BASE_URL: 'https://api.linkedin.com/v2',
} as const;

interface LinkedInMediaItem {
  status: 'READY';
  originalUrl: string;
}

interface LinkedInShareContent {
  shareCommentary: {
    text: string;
  };
  shareMediaCategory: 'IMAGE' | 'NONE';
  media?: LinkedInMediaItem[];
}

interface LinkedInUgcPostPayload {
  author: string;
  lifecycleState: 'PUBLISHED';
  specificContent: {
    'com.linkedin.ugc.ShareContent': LinkedInShareContent;
  };
  visibility: {
    'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC';
  };
}

export class LinkedInPageResponseContractError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'LinkedInPageResponseContractError';
  }
}

export class LinkedInPagePublishClient {
  private readonly apiBaseUrl: string;
  private readonly maxBodyLength: number;

  constructor(
    private readonly transport: LinkedInPageTransportPort,
    options: LinkedInPagePublishClientOptions = {},
  ) {
    this.apiBaseUrl = options.apiBaseUrl ?? LINKEDIN_PAGE_DEFAULTS.API_BASE_URL;
    this.maxBodyLength = options.maxBodyLength ?? 3000;
  }

  async publish(request: LinkedInPagePublishRequest): Promise<LinkedInPagePublishResult> {
    const response = await this.transport.fetch(`${this.apiBaseUrl}/ugcPosts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${request.accessToken}`,
        'X-Restli-Protocol-Version': '2.0.0',
      },
      body: JSON.stringify(this.buildPayload(request)),
    });

    if (response.status === LINKEDIN_PAGE_HTTP_STATUS.CREATED) {
      const externalPostId = this.resolveSuccessPostId(response.headers, response.body);
      if (!externalPostId) {
        throw new LinkedInPageResponseContractError(
          LINKEDIN_PAGE_PUBLISH_PUBLIC_ERROR_MESSAGES.SUCCESS_POST_ID_MISSING,
        );
      }
      return {
        success: true,
        externalPostId,
        externalUrl: `https://www.linkedin.com/feed/update/${externalPostId}`,
      };
    }

    const { vendorErrorCode, vendorMessage } = this.parseErrorPayload(response.status, response.body);
    return {
      success: false,
      ...(vendorErrorCode !== undefined ? { vendorErrorCode } : {}),
      ...(vendorMessage !== undefined ? { vendorMessage } : {}),
    };
  }

  async validateCredentials(_authorUrn: string, accessToken: string): Promise<boolean> {
    try {
      const response = await this.transport.fetch(`${this.apiBaseUrl}/me`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'X-Restli-Protocol-Version': '2.0.0',
        },
      });
      return response.status === LINKEDIN_PAGE_HTTP_STATUS.OK;
    } catch {
      return false;
    }
  }

  private buildPayload(request: LinkedInPagePublishRequest): LinkedInUgcPostPayload {
    const contentText = this.buildPostText(request.content);
    const truncatedText = contentText.length > this.maxBodyLength
      ? contentText.substring(0, this.maxBodyLength)
      : contentText;

    const shareContent: LinkedInShareContent = {
      shareCommentary: {
        text: truncatedText,
      },
      shareMediaCategory: request.content.imageUrl ? 'IMAGE' : 'NONE',
      ...(request.content.imageUrl
        ? {
            media: [
              {
                status: 'READY',
                originalUrl: request.content.imageUrl,
              },
            ],
          }
        : {}),
    };

    return {
      author: request.authorUrn,
      lifecycleState: 'PUBLISHED',
      specificContent: {
        'com.linkedin.ugc.ShareContent': shareContent,
      },
      visibility: {
        'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC',
      },
    };
  }

  private buildPostText(content: LinkedInPagePublishContent): string {
    const parts: string[] = [];
    if (content.title) {
      parts.push(content.title);
    }
    parts.push(content.body);
    if (content.callToAction) {
      parts.push(content.callToAction);
    }
    if (content.tags && content.tags.length > 0) {
      parts.push(content.tags.map((tag) => `#${tag}`).join(' '));
    }
    return parts.join('\n\n');
  }

  private resolveSuccessPostId(
    headers: Record<string, string | undefined>,
    body: unknown,
  ): string | undefined {
    const headerValue = headers['x-restli-id'];
    if (typeof headerValue === 'string' && headerValue.length > 0) {
      return headerValue;
    }

    if (this.isRecord(body)) {
      const bodyId = body['id'];
      if (typeof bodyId === 'string' && bodyId.length > 0) {
        return bodyId;
      }
    }

    return undefined;
  }

  private parseErrorPayload(
    status: number,
    body: unknown,
  ): { vendorErrorCode: number; vendorMessage: string } {
    if (body === undefined || body === null) {
      return {
        vendorErrorCode: status,
        vendorMessage: `LinkedIn API error (HTTP ${status})`,
      };
    }

    if (!this.isRecord(body)) {
      throw new LinkedInPageResponseContractError(
        LINKEDIN_PAGE_PUBLISH_PUBLIC_ERROR_MESSAGES.ERROR_PAYLOAD_INVALID,
      );
    }

    const message = typeof body['message'] === 'string'
      ? body['message']
      : `LinkedIn API error (HTTP ${status})`;
    const code = typeof body['status'] === 'number' ? body['status'] : status;

    return {
      vendorErrorCode: code,
      vendorMessage: message,
    };
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
  }
}
