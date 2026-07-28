/**
 * Configurable auth token service factory.
 *
 * Extracted from the intersection of 3 token services:
 * - v2:   mintActorTokenPair, type='staff_access'
 * - vita: mintActorAccessToken, type='member_access', iss='vita-iam', aud='vita-api'
 * - GHS:  mintActorAccessToken, type='ghs.access'
 *
 * This factory creates a token service with configurable type, issuer,
 * audience, and TTL — eliminating the need for per-project implementations.
 */

import { randomUUID } from 'node:crypto';
import { JwtService } from '@nestjs/jwt';
import { DomainException, IAM_ERROR_CODES } from '@vt/platform-error';

export interface AuthTokenServiceConfig {
  /** Token type claim (e.g. 'staff_access', 'member_access', 'ghs.access') */
  tokenType: string;
  /** JWT issuer claim (e.g. 'vita-iam', 'v2-iam') */
  issuer?: string;
  /** JWT audience claim (e.g. 'vita-api', 'v2-api') */
  audience?: string;
  /** Default TTL in seconds. Default: 7 days */
  defaultTtlSeconds?: number;
  /** Whether to include jti claim. Default: true */
  includeJti?: boolean;
}

export interface BaseAccessTokenPayload {
  sub: string;
  type: string;
  jti?: string;
  iat?: number;
  exp?: number;
  iss?: string;
  aud?: string;
  nbf?: number;
  [key: string]: unknown;
}

export interface AuthTokenPair {
  access_token: string;
  token_type: 'Bearer';
  expires_in: number;
  expires_at: string;
}

const DEFAULT_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days

/**
 * Create a configured auth token service.
 *
 * @example
 * ```ts
 * // In vita IAM module:
 * const tokenService = createAuthTokenService(jwtService, {
 *   tokenType: 'member_access',
 *   issuer: 'vita-iam',
 *   audience: 'vita-api',
 * });
 *
 * const pair = tokenService.issue({
 *   subjectId: member._id.toString(),
 *   claims: { member_code: member.member_code, roles: member.roles },
 * });
 * ```
 */
export function createAuthTokenService(
  jwtService: JwtService,
  config: AuthTokenServiceConfig,
) {
  const {
    tokenType,
    issuer,
    audience,
    defaultTtlSeconds = DEFAULT_TTL_SECONDS,
    includeJti = true,
  } = config;

  return {
    /**
     * Issue a token pair for a subject.
     */
    issue(options: {
      subjectId: string;
      claims?: Record<string, unknown>;
      expiresIn?: number;
    }): AuthTokenPair {
      const ttl = options.expiresIn ?? defaultTtlSeconds;

      const payload: Record<string, unknown> = {
        ...options.claims,
        sub: options.subjectId,
        type: tokenType,
        ...(issuer ? { iss: issuer } : {}),
        ...(audience ? { aud: audience } : {}),
        nbf: Math.floor(Date.now() / 1000),
      };

      if (includeJti) {
        payload['jti'] = randomUUID();
      }

      const accessToken = jwtService.sign(payload, { expiresIn: ttl });

      const expiresAt = new Date(Date.now() + ttl * 1000).toISOString();
      return {
        access_token: accessToken,
        token_type: 'Bearer',
        expires_in: ttl,
        expires_at: expiresAt,
      };
    },

    /**
     * Verify a token and return the payload.
     */
    verify(token: string): BaseAccessTokenPayload {
      try {
        const payload = jwtService.verify<BaseAccessTokenPayload>(token, {
          ...(issuer ? { issuer } : {}),
          ...(audience ? { audience } : {}),
        });

        if (payload.type !== tokenType || !payload.sub) {
          throw new DomainException(IAM_ERROR_CODES.AUTH_INVALID_TOKEN, 'Token không hợp lệ.', 401);
        }

        return payload;
      } catch (error) {
        if (error instanceof DomainException) throw error;

        const name = (error as Error)?.name;
        if (name === 'TokenExpiredError') {
          throw new DomainException(IAM_ERROR_CODES.AUTH_EXPIRED_TOKEN, 'Phiên đăng nhập đã hết hạn.', 401);
        }
        throw new DomainException(IAM_ERROR_CODES.AUTH_INVALID_TOKEN, 'Token không hợp lệ.', 401);
      }
    },

    /**
     * Extract bearer token from Authorization header.
     */
    extractBearerToken(authorization?: string): string {
      if (!authorization || typeof authorization !== 'string') {
        throw new DomainException(IAM_ERROR_CODES.AUTH_MISSING_TOKEN, 'Thiếu bearer token.', 401);
      }
      const parts = authorization.split(' ');
      if (parts[0] !== 'Bearer' || !parts[1]) {
        throw new DomainException(IAM_ERROR_CODES.AUTH_MISSING_TOKEN, 'Thiếu bearer token.', 401);
      }
      return parts[1];
    },

    /**
     * Verify from Authorization header directly.
     */
    verifyAuthorizationHeader(authorization?: string): BaseAccessTokenPayload {
      const token = this.extractBearerToken(authorization);
      return this.verify(token);
    },
  };
}
