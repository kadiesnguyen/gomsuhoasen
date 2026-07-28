/**
 * Shared IAM error codes.
 *
 * Merged from error codes used across all three projects:
 *
 * - v2:  libs/modules/iam/src/lib/constants/iam-errors.constants.ts (137 LOC)
 * - vita: uses @vt/platform-error IAM_ERROR_CODES directly
 * - GHS: uses @vt/platform-error IAM_ERROR_CODES directly
 *
 * This module defines the COMMON subset that all projects share.
 * Project-specific error codes remain in each project's own constants file.
 */

/**
 * Common IAM error codes shared across all consumer projects.
 *
 * Usage:
 * ```typescript
 * import { HttpStatus } from '@nestjs/common';
 * import { IAM_COMMON_ERRORS } from '..';
 * throw new DomainException(IAM_COMMON_ERRORS.AUTH_INVALID_CREDENTIALS, 'Wrong password', HttpStatus.UNAUTHORIZED);
 * ```
 */
export const IAM_COMMON_ERRORS = {
  // ─── Authentication ────────────────────────────────────────────
  /** Email/phone or password is incorrect. */
  AUTH_INVALID_CREDENTIALS: 'IAM.AUTH_INVALID_CREDENTIALS',

  /** Account is locked or suspended. */
  AUTH_ACCOUNT_LOCKED: 'IAM.AUTH_ACCOUNT_LOCKED',

  /** Bearer token is missing from request. */
  AUTH_MISSING_TOKEN: 'IAM.AUTH_MISSING_TOKEN',

  /** Bearer token is invalid or malformed. */
  AUTH_INVALID_TOKEN: 'IAM.AUTH_INVALID_TOKEN',

  /** Bearer token has expired. */
  AUTH_EXPIRED_TOKEN: 'IAM.AUTH_EXPIRED_TOKEN',

  /** JWT secret is not configured (startup error). */
  AUTH_JWT_SECRET_MISSING: 'IAM.AUTH_JWT_SECRET_MISSING',

  // ─── User Management ──────────────────────────────────────────
  /** Duplicate email on user creation. */
  USER_DUPLICATE_EMAIL: 'IAM.USER_DUPLICATE_EMAIL',

  /** Duplicate phone on user creation. */
  USER_DUPLICATE_PHONE: 'IAM.USER_DUPLICATE_PHONE',

  /** User not found. */
  USER_NOT_FOUND: 'IAM.USER_NOT_FOUND',

  /** User is soft-deleted. */
  USER_DELETED: 'IAM.USER_DELETED',

  // ─── Password ─────────────────────────────────────────────────
  /** Password does not meet minimum requirements. */
  PASSWORD_TOO_WEAK: 'IAM.PASSWORD_TOO_WEAK',

  /** Current password is required for password change. */
  PASSWORD_CURRENT_REQUIRED: 'IAM.PASSWORD_CURRENT_REQUIRED',

  // ─── Authorization ────────────────────────────────────────────
  /** User does not have the required permission. */
  INSUFFICIENT_PERMISSIONS: 'IAM.INSUFFICIENT_PERMISSIONS',

  /** User does not have the required role. */
  INSUFFICIENT_ROLE: 'IAM.INSUFFICIENT_ROLE',
} as const;

export type IamCommonErrorCode = (typeof IAM_COMMON_ERRORS)[keyof typeof IAM_COMMON_ERRORS];
