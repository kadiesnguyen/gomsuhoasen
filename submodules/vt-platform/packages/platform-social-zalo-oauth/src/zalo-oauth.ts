import * as crypto from 'node:crypto';
import axios from 'axios';

export interface ZaloOAuthHttpClient {
  get<T = unknown>(url: string, config?: { params?: Record<string, string>; headers?: Record<string, string> }): Promise<{ data: T }>;
  post<T = unknown>(url: string, data?: unknown, config?: { headers?: Record<string, string> }): Promise<{ data: T }>;
}

export const ZALO_OAUTH_ENDPOINTS = {
  PROFILE: 'https://graph.zalo.me/v2.0/me',
  PHONE: 'https://graph.zalo.me/v2.0/me/info',
  ACCESS_TOKEN: 'https://oauth.zaloapp.com/v4/access_token',
  OA_ACCESS_TOKEN: 'https://oauth.zaloapp.com/v4/oa/access_token',
} as const;

export const ZALO_OAUTH_ERROR_CODE = {
  PROVIDER_REJECTED: 'PROVIDER_REJECTED',
  ACCESS_TOKEN_MISSING: 'ACCESS_TOKEN_MISSING',
  PROFILE_INVALID: 'PROFILE_INVALID',
  PHONE_INVALID: 'PHONE_INVALID',
  REQUEST_FAILED: 'REQUEST_FAILED',
} as const;

export const ZALO_OAUTH_ERROR_MESSAGES = {
  ACCESS_TOKEN_MISSING: 'Zalo access token missing',
  AUTH_CODE_EXCHANGE_FAILED: 'Zalo authorization code exchange failed',
  OA_REFRESH_TOKEN_EXCHANGE_FAILED: 'Zalo OA refresh token exchange failed',
  PROFILE_MISSING_ID: 'Zalo profile is missing id',
  PROFILE_REQUEST_FAILED: 'Zalo profile request failed',
  PHONE_MISSING_NUMBER: 'Zalo phone response is missing phone number',
  PHONE_TOKEN_EXCHANGE_FAILED: 'Zalo phone token exchange failed',
} as const;

export type ZaloOAuthErrorCode = typeof ZALO_OAUTH_ERROR_CODE[keyof typeof ZALO_OAUTH_ERROR_CODE];

export class ZaloOAuthError extends Error {
  constructor(
    public readonly code: ZaloOAuthErrorCode,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ZaloOAuthError';
  }
}

export interface ZaloOAuthProfile {
  id: string;
  name: string;
  picture?: { data?: { url?: string } };
}

export interface ZaloOAuthExchangeCodeInput {
  appId: string;
  appSecret: string;
  code: string;
  codeVerifier: string;
  redirectUri: string;
}

export interface ZaloOAuthPhoneTokenInput {
  phoneToken: string;
  accessToken: string;
  appSecret: string;
}

export interface ZaloOAuthRefreshTokenInput {
  appId: string;
  appSecret: string;
  refreshToken: string;
}

export interface ZaloOAuthRefreshTokenResult {
  accessToken: string;
  refreshToken?: string;
  expiresIn?: number;
}

export interface ZaloOAuthPhoneResult {
  phoneNumber: string;
  phoneNumberE164: string;
}

export function createZaloAppSecretProof(token: string, appSecret: string): string {
  return crypto.createHmac('sha256', appSecret).update(token).digest('hex');
}

export class ZaloOAuthClient {
  constructor(private readonly http: ZaloOAuthHttpClient = axios) {}

  async exchangeAuthorizationCode(input: ZaloOAuthExchangeCodeInput): Promise<string> {
    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      app_id: input.appId,
      app_secret: input.appSecret,
      code: input.code,
      code_verifier: input.codeVerifier,
      redirect_uri: input.redirectUri,
    });

    try {
      const response = await this.http.post<{ access_token?: string }>(
        ZALO_OAUTH_ENDPOINTS.ACCESS_TOKEN,
        body.toString(),
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } },
      );
      const accessToken = response.data?.access_token;
      if (!accessToken) {
        throw new ZaloOAuthError(
          ZALO_OAUTH_ERROR_CODE.ACCESS_TOKEN_MISSING,
          ZALO_OAUTH_ERROR_MESSAGES.ACCESS_TOKEN_MISSING,
        );
      }
      return accessToken;
    } catch (error) {
      throw this.normalizeError(error, ZALO_OAUTH_ERROR_MESSAGES.AUTH_CODE_EXCHANGE_FAILED);
    }
  }

  async refreshOaAccessToken(input: ZaloOAuthRefreshTokenInput): Promise<ZaloOAuthRefreshTokenResult> {
    const body = new URLSearchParams({
      grant_type: 'refresh_token',
      app_id: input.appId,
      app_secret: input.appSecret,
      refresh_token: input.refreshToken,
    });

    try {
      const response = await this.http.post<{
        access_token?: unknown;
        refresh_token?: unknown;
        expires_in?: unknown;
        error?: unknown;
        message?: unknown;
      }>(
        ZALO_OAUTH_ENDPOINTS.OA_ACCESS_TOKEN,
        body.toString(),
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } },
      );

      if (response.data?.error) {
        throw new ZaloOAuthError(
          ZALO_OAUTH_ERROR_CODE.PROVIDER_REJECTED,
          String(response.data.message ?? response.data.error),
          response.data,
        );
      }

      if (typeof response.data?.access_token !== 'string' || response.data.access_token.length === 0) {
        throw new ZaloOAuthError(
          ZALO_OAUTH_ERROR_CODE.ACCESS_TOKEN_MISSING,
          ZALO_OAUTH_ERROR_MESSAGES.ACCESS_TOKEN_MISSING,
        );
      }

      return {
        accessToken: response.data.access_token,
        refreshToken: typeof response.data.refresh_token === 'string' ? response.data.refresh_token : undefined,
        expiresIn: typeof response.data.expires_in === 'number' ? response.data.expires_in : undefined,
      };
    } catch (error) {
      throw this.normalizeError(error, ZALO_OAUTH_ERROR_MESSAGES.OA_REFRESH_TOKEN_EXCHANGE_FAILED);
    }
  }

  async verifyAccessToken(token: string, appSecret: string): Promise<ZaloOAuthProfile> {
    const appsecretProof = createZaloAppSecretProof(token, appSecret);

    try {
      const response = await this.http.get<ZaloOAuthProfile & { error?: unknown; message?: unknown }>(
        ZALO_OAUTH_ENDPOINTS.PROFILE,
        {
          params: {
            fields: 'id,name,picture',
            access_token: token,
            appsecret_proof: appsecretProof,
          },
        },
      );

      if (response.data?.error) {
        throw new ZaloOAuthError(
          ZALO_OAUTH_ERROR_CODE.PROVIDER_REJECTED,
          String(response.data.message ?? response.data.error),
          response.data,
        );
      }

      if (!response.data?.id) {
        throw new ZaloOAuthError(
          ZALO_OAUTH_ERROR_CODE.PROFILE_INVALID,
          ZALO_OAUTH_ERROR_MESSAGES.PROFILE_MISSING_ID,
          response.data,
        );
      }

      return response.data;
    } catch (error) {
      throw this.normalizeError(error, ZALO_OAUTH_ERROR_MESSAGES.PROFILE_REQUEST_FAILED);
    }
  }

  async exchangePhoneToken(input: ZaloOAuthPhoneTokenInput): Promise<ZaloOAuthPhoneResult> {
    const appsecretProof = createZaloAppSecretProof(input.accessToken, input.appSecret);

    try {
      const response = await this.http.get<{ error?: unknown; message?: unknown; data?: { number?: string } }>(
        ZALO_OAUTH_ENDPOINTS.PHONE,
        {
          params: {
            code: input.phoneToken,
            access_token: input.accessToken,
            appsecret_proof: appsecretProof,
          },
        },
      );

      if (response.data?.error) {
        throw new ZaloOAuthError(
          ZALO_OAUTH_ERROR_CODE.PROVIDER_REJECTED,
          String(response.data.message ?? response.data.error),
          response.data,
        );
      }

      const phoneNumber = typeof response.data?.data?.number === 'string'
        ? response.data.data.number.trim()
        : '';
      if (!phoneNumber) {
        throw new ZaloOAuthError(
          ZALO_OAUTH_ERROR_CODE.PHONE_INVALID,
          ZALO_OAUTH_ERROR_MESSAGES.PHONE_MISSING_NUMBER,
          response.data,
        );
      }
      return {
        phoneNumber,
        phoneNumberE164: normalizeVietnamPhoneE164(phoneNumber),
      };
    } catch (error) {
      throw this.normalizeError(error, ZALO_OAUTH_ERROR_MESSAGES.PHONE_TOKEN_EXCHANGE_FAILED);
    }
  }

  private normalizeError(error: unknown, fallbackMessage: string): ZaloOAuthError {
    if (error instanceof ZaloOAuthError) {
      return error;
    }

    return new ZaloOAuthError(
      ZALO_OAUTH_ERROR_CODE.REQUEST_FAILED,
      error instanceof Error ? error.message : fallbackMessage,
      error,
    );
  }
}

export function normalizeVietnamPhoneE164(phoneNumber: string): string {
  return phoneNumber.startsWith('0') ? `84${phoneNumber.slice(1)}` : phoneNumber;
}
