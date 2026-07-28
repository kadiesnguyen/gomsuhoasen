/**
 * Shared authentication service contracts.
 *
 * All three projects implement the same auth flow:
 * 1. Accept identifier (email or phone) + password
 * 2. Find user, compare password hash
 * 3. Check account status (not locked/suspended)
 * 4. Issue JWT via @vt/auth-primitives mintActorAccessToken
 * 5. Return token + user projection
 *
 * This interface captures that common surface.
 */

import type { IUserPublicProjection } from './user.contracts';

/**
 * Standard authentication result returned by all IAM login implementations.
 */
export interface IAuthResult {
  /** The signed JWT access token. */
  accessToken: string;

  /** Public user/member projection (never includes password). */
  user: IUserPublicProjection;

  /** Optional refresh token (v2 supports this, vita/GHS may not yet). */
  refreshToken?: string;

  /** Token type (always 'Bearer'). */
  tokenType?: 'Bearer';

  /** Token TTL in seconds (optional, for client-side expiry tracking). */
  expiresIn?: number;
}

/**
 * Authentication service interface.
 *
 * Implementations:
 * - v2:  AuthService (1,309 LOC) — multi-tenant, OAuth, TOTP, invitation
 * - vita: MemberService + AuthTokenService — member-based, simpler
 * - GHS: AuthService (102 LOC) — single-tenant, email/password only
 */
export interface IAuthService {
  /**
   * Authenticate a user/member by identifier + password.
   *
   * @param identifier - Email or phone number
   * @param password   - Plain-text password to verify against hash
   * @returns Auth result with token and user projection
   * @throws DomainException with IAM_COMMON_ERRORS codes on failure
   */
  login(identifier: string, password: string): Promise<IAuthResult>;

  /**
   * Find a user/member by ID (non-deleted only).
   */
  findById(id: string): Promise<unknown | null>;
}
