import axios from 'axios';

export interface FacebookOAuthHttpClient {
  get<T = unknown>(url: string, config?: { params?: Record<string, string> }): Promise<{ data: T }>;
  delete?<T = unknown>(url: string, config?: { params?: Record<string, string> }): Promise<{ data: T }>;
}

export const FACEBOOK_OAUTH_DEFAULTS = {
  GRAPH_API_BASE_URL: 'https://graph.facebook.com',
  GRAPH_API_VERSION: 'v19.0',
  TOKEN_REFRESH_REJECTED_MESSAGE: 'Facebook token refresh rejected',
} as const;

export const FACEBOOK_OAUTH_ENDPOINTS = {
  ACCESS_TOKEN: `${FACEBOOK_OAUTH_DEFAULTS.GRAPH_API_BASE_URL}/${FACEBOOK_OAUTH_DEFAULTS.GRAPH_API_VERSION}/oauth/access_token`,
  PROFILE: `${FACEBOOK_OAUTH_DEFAULTS.GRAPH_API_BASE_URL}/${FACEBOOK_OAUTH_DEFAULTS.GRAPH_API_VERSION}/me`,
} as const;

export const FACEBOOK_OAUTH_ERROR_CODE = {
  ACCESS_TOKEN_MISSING: 'ACCESS_TOKEN_MISSING',
  PROFILE_INVALID: 'PROFILE_INVALID',
  REQUEST_FAILED: 'REQUEST_FAILED',
} as const;

export const FACEBOOK_OAUTH_ERROR_MESSAGES = {
  ACCESS_TOKEN_MISSING: 'Facebook access token missing',
  AUTH_CODE_EXCHANGE_FAILED: 'Facebook authorization code exchange failed',
  TOKEN_REFRESH_FAILED: 'Facebook token refresh failed',
  DEBUG_TOKEN_FAILED: 'Facebook debug token failed',
  REVOKE_UNSUPPORTED_DELETE: 'HTTP client does not support DELETE',
  REVOKE_PERMISSIONS_FAILED: 'Facebook revoke permissions failed',
  PROFILE_MISSING_ID: 'Facebook profile is missing id',
  PROFILE_REQUEST_FAILED: 'Facebook profile request failed',
} as const;

export type FacebookOAuthErrorCode = typeof FACEBOOK_OAUTH_ERROR_CODE[keyof typeof FACEBOOK_OAUTH_ERROR_CODE];

export class FacebookOAuthError extends Error {
  constructor(
    public readonly code: FacebookOAuthErrorCode,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'FacebookOAuthError';
  }
}

export interface FacebookOAuthExchangeCodeInput {
  appId: string;
  appSecret: string;
  code: string;
  redirectUri: string;
  graphApiVersion?: string;
}

export interface FacebookOAuthTokenResult {
  accessToken: string;
  expiresIn?: number;
  tokenType?: string;
  refreshToken?: string;
}

export interface FacebookOAuthRefreshTokenInput {
  clientId: string;
  clientSecret: string;
  currentToken: string;
  graphApiVersion?: string;
}

export interface FacebookOAuthRefreshTokenResult {
  accessToken: string;
  expiresIn?: number;
}

export interface FacebookOAuthProfile {
  id: string;
  name?: string;
  email?: string;
}

export interface FacebookOAuthDebugTokenInput {
  inputToken: string;
  appId: string;
  appSecret: string;
  graphApiVersion?: string;
}

export interface FacebookOAuthDebugTokenResult {
  isValid: boolean;
  expiresAt?: number;
}

export interface FacebookOAuthRevokePermissionsInput {
  accessToken: string;
  graphApiVersion?: string;
}

export class FacebookOAuthClient {
  constructor(private readonly http: FacebookOAuthHttpClient = axios) {}

  async exchangeAuthorizationCodeForToken(input: FacebookOAuthExchangeCodeInput): Promise<FacebookOAuthTokenResult> {
    const graphApiVersion = input.graphApiVersion ?? FACEBOOK_OAUTH_DEFAULTS.GRAPH_API_VERSION;

    try {
      const response = await this.http.get<{
        access_token?: unknown;
        expires_in?: unknown;
        token_type?: unknown;
        refresh_token?: unknown;
      }>(
        this.accessTokenEndpoint(graphApiVersion),
        {
          params: {
            client_id: input.appId,
            client_secret: input.appSecret,
            redirect_uri: input.redirectUri,
            code: input.code,
          },
        },
      );
      if (typeof response.data?.access_token !== 'string' || response.data.access_token.length === 0) {
        throw new FacebookOAuthError(
          FACEBOOK_OAUTH_ERROR_CODE.ACCESS_TOKEN_MISSING,
          FACEBOOK_OAUTH_ERROR_MESSAGES.ACCESS_TOKEN_MISSING,
        );
      }
      return {
        accessToken: response.data.access_token,
        expiresIn: typeof response.data.expires_in === 'number' ? response.data.expires_in : undefined,
        tokenType: typeof response.data.token_type === 'string' ? response.data.token_type : undefined,
        refreshToken: typeof response.data.refresh_token === 'string' ? response.data.refresh_token : undefined,
      };
    } catch (error) {
      throw this.normalizeError(error, FACEBOOK_OAUTH_ERROR_MESSAGES.AUTH_CODE_EXCHANGE_FAILED);
    }
  }

  async exchangeAuthorizationCode(input: FacebookOAuthExchangeCodeInput): Promise<string> {
    return (await this.exchangeAuthorizationCodeForToken(input)).accessToken;
  }

  async refreshLongLivedAccessToken(input: FacebookOAuthRefreshTokenInput): Promise<FacebookOAuthRefreshTokenResult> {
    const graphApiVersion = input.graphApiVersion ?? FACEBOOK_OAUTH_DEFAULTS.GRAPH_API_VERSION;

    try {
      const response = await this.http.get<{
        access_token?: unknown;
        expires_in?: unknown;
        error?: { message?: string };
      }>(
        this.accessTokenEndpoint(graphApiVersion),
        {
          params: {
            grant_type: 'fb_exchange_token',
            client_id: input.clientId,
            client_secret: input.clientSecret,
            fb_exchange_token: input.currentToken,
          },
        },
      );

      if (response.data?.error) {
        throw new FacebookOAuthError(
          FACEBOOK_OAUTH_ERROR_CODE.REQUEST_FAILED,
          response.data.error.message ?? FACEBOOK_OAUTH_DEFAULTS.TOKEN_REFRESH_REJECTED_MESSAGE,
          response.data,
        );
      }

      if (typeof response.data?.access_token !== 'string' || response.data.access_token.length === 0) {
        throw new FacebookOAuthError(
          FACEBOOK_OAUTH_ERROR_CODE.ACCESS_TOKEN_MISSING,
          FACEBOOK_OAUTH_ERROR_MESSAGES.ACCESS_TOKEN_MISSING,
        );
      }

      return {
        accessToken: response.data.access_token,
        expiresIn: typeof response.data.expires_in === 'number' ? response.data.expires_in : undefined,
      };
    } catch (error) {
      throw this.normalizeError(error, FACEBOOK_OAUTH_ERROR_MESSAGES.TOKEN_REFRESH_FAILED);
    }
  }

  async debugToken(input: FacebookOAuthDebugTokenInput): Promise<FacebookOAuthDebugTokenResult> {
    const graphApiVersion = input.graphApiVersion ?? FACEBOOK_OAUTH_DEFAULTS.GRAPH_API_VERSION;

    try {
      const response = await this.http.get<{ data?: { is_valid?: unknown; expires_at?: unknown } }>(
        `${FACEBOOK_OAUTH_DEFAULTS.GRAPH_API_BASE_URL}/${graphApiVersion}/debug_token`,
        {
          params: {
            input_token: input.inputToken,
            access_token: `${input.appId}|${input.appSecret}`,
          },
        },
      );

      return {
        isValid: response.data?.data?.is_valid === true,
        expiresAt: typeof response.data?.data?.expires_at === 'number'
          ? response.data.data.expires_at
          : undefined,
      };
    } catch (error) {
      throw this.normalizeError(error, FACEBOOK_OAUTH_ERROR_MESSAGES.DEBUG_TOKEN_FAILED);
    }
  }

  async revokePermissions(input: FacebookOAuthRevokePermissionsInput): Promise<void> {
    if (!this.http.delete) {
      throw new FacebookOAuthError(
        FACEBOOK_OAUTH_ERROR_CODE.REQUEST_FAILED,
        FACEBOOK_OAUTH_ERROR_MESSAGES.REVOKE_UNSUPPORTED_DELETE,
      );
    }

    const graphApiVersion = input.graphApiVersion ?? FACEBOOK_OAUTH_DEFAULTS.GRAPH_API_VERSION;

    try {
      await this.http.delete(
        `${FACEBOOK_OAUTH_DEFAULTS.GRAPH_API_BASE_URL}/${graphApiVersion}/me/permissions`,
        { params: { access_token: input.accessToken } },
      );
    } catch (error) {
      throw this.normalizeError(error, FACEBOOK_OAUTH_ERROR_MESSAGES.REVOKE_PERMISSIONS_FAILED);
    }
  }

  async fetchProfile(accessToken: string): Promise<FacebookOAuthProfile> {
    try {
      const response = await this.http.get<FacebookOAuthProfile>(
        FACEBOOK_OAUTH_ENDPOINTS.PROFILE,
        { params: { fields: 'id,name,email', access_token: accessToken } },
      );

      if (!response.data?.id) {
        throw new FacebookOAuthError(
          FACEBOOK_OAUTH_ERROR_CODE.PROFILE_INVALID,
          FACEBOOK_OAUTH_ERROR_MESSAGES.PROFILE_MISSING_ID,
          response.data,
        );
      }

      return response.data;
    } catch (error) {
      throw this.normalizeError(error, FACEBOOK_OAUTH_ERROR_MESSAGES.PROFILE_REQUEST_FAILED);
    }
  }

  async exchangeCodeForProfile(input: FacebookOAuthExchangeCodeInput): Promise<FacebookOAuthProfile> {
    const accessToken = await this.exchangeAuthorizationCode(input);
    return this.fetchProfile(accessToken);
  }

  private normalizeError(error: unknown, fallbackMessage: string): FacebookOAuthError {
    if (error instanceof FacebookOAuthError) {
      return error;
    }

    return new FacebookOAuthError(
      FACEBOOK_OAUTH_ERROR_CODE.REQUEST_FAILED,
      error instanceof Error ? error.message : fallbackMessage,
      error,
    );
  }

  private accessTokenEndpoint(graphApiVersion: string): string {
    return `${FACEBOOK_OAUTH_DEFAULTS.GRAPH_API_BASE_URL}/${graphApiVersion}/oauth/access_token`;
  }
}
