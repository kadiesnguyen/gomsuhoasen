import axios from 'axios';

export interface GoogleOAuthHttpClient {
  get<T = unknown>(url: string, config?: { headers?: Record<string, string> }): Promise<{ data: T }>;
  post<T = unknown>(url: string, data?: unknown): Promise<{ data: T }>;
}

export const GOOGLE_OAUTH_ENDPOINTS = {
  ACCESS_TOKEN: 'https://oauth2.googleapis.com/token',
  USER_INFO: 'https://www.googleapis.com/oauth2/v2/userinfo',
} as const;

export const GOOGLE_OAUTH_ERROR_CODE = {
  ACCESS_TOKEN_MISSING: 'ACCESS_TOKEN_MISSING',
  PROFILE_INVALID: 'PROFILE_INVALID',
  REQUEST_FAILED: 'REQUEST_FAILED',
} as const;

export const GOOGLE_OAUTH_ERROR_MESSAGES = {
  ACCESS_TOKEN_MISSING: 'Google access token missing',
  AUTH_CODE_EXCHANGE_FAILED: 'Google authorization code exchange failed',
  PROFILE_MISSING_ID: 'Google profile is missing id',
  PROFILE_REQUEST_FAILED: 'Google profile request failed',
} as const;

export type GoogleOAuthErrorCode = typeof GOOGLE_OAUTH_ERROR_CODE[keyof typeof GOOGLE_OAUTH_ERROR_CODE];

export class GoogleOAuthError extends Error {
  constructor(
    public readonly code: GoogleOAuthErrorCode,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'GoogleOAuthError';
  }
}

export interface GoogleOAuthExchangeCodeInput {
  clientId: string;
  clientSecret: string;
  code: string;
  redirectUri: string;
}

export interface GoogleOAuthProfile {
  id: string;
  email?: string;
  name?: string;
  verified_email?: boolean;
}

export class GoogleOAuthClient {
  constructor(private readonly http: GoogleOAuthHttpClient = axios) {}

  async exchangeAuthorizationCode(input: GoogleOAuthExchangeCodeInput): Promise<string> {
    try {
      const response = await this.http.post<{ access_token?: string }>(
        GOOGLE_OAUTH_ENDPOINTS.ACCESS_TOKEN,
        {
          code: input.code,
          client_id: input.clientId,
          client_secret: input.clientSecret,
          redirect_uri: input.redirectUri,
          grant_type: 'authorization_code',
        },
      );
      const accessToken = response.data?.access_token;
      if (!accessToken) {
        throw new GoogleOAuthError(
          GOOGLE_OAUTH_ERROR_CODE.ACCESS_TOKEN_MISSING,
          GOOGLE_OAUTH_ERROR_MESSAGES.ACCESS_TOKEN_MISSING,
        );
      }
      return accessToken;
    } catch (error) {
      throw this.normalizeError(error, GOOGLE_OAUTH_ERROR_MESSAGES.AUTH_CODE_EXCHANGE_FAILED);
    }
  }

  async fetchProfile(accessToken: string): Promise<GoogleOAuthProfile> {
    try {
      const response = await this.http.get<GoogleOAuthProfile>(
        GOOGLE_OAUTH_ENDPOINTS.USER_INFO,
        { headers: { Authorization: `Bearer ${accessToken}` } },
      );

      if (!response.data?.id) {
        throw new GoogleOAuthError(
          GOOGLE_OAUTH_ERROR_CODE.PROFILE_INVALID,
          GOOGLE_OAUTH_ERROR_MESSAGES.PROFILE_MISSING_ID,
          response.data,
        );
      }

      return response.data;
    } catch (error) {
      throw this.normalizeError(error, GOOGLE_OAUTH_ERROR_MESSAGES.PROFILE_REQUEST_FAILED);
    }
  }

  async exchangeCodeForProfile(input: GoogleOAuthExchangeCodeInput): Promise<GoogleOAuthProfile> {
    const accessToken = await this.exchangeAuthorizationCode(input);
    return this.fetchProfile(accessToken);
  }

  private normalizeError(error: unknown, fallbackMessage: string): GoogleOAuthError {
    if (error instanceof GoogleOAuthError) {
      return error;
    }

    return new GoogleOAuthError(
      GOOGLE_OAUTH_ERROR_CODE.REQUEST_FAILED,
      error instanceof Error ? error.message : fallbackMessage,
      error,
    );
  }
}
