/**
 * Shared user entity contracts.
 *
 * Derived from the intersection of user schemas across all three projects:
 *
 * - v2  User schema  (104 LOC): fullName, primaryEmail, primaryPhone, hashedPassword,
 *        status (UserStatus enum), isDeleted, deletedAt, lastLoginAt, avatarUrl/avatarFileId,
 *        totpEnabled, isSystemAdmin, createdById, updatedById
 *
 * - vita MemberEntity (138 LOC): full_name, phone, email, hashed_password,
 *        account_status (AccountStatus), deleted_at, deleted_by, member_code,
 *        level, rank_label, roles[], zalo_id, ref_member_id
 *
 * - GHS  User schema  (54 LOC): fullName, email, hashedPassword,
 *        role (ADMIN|EDITOR enum), status (ACTIVE|SUSPENDED), isDeleted, deletedAt
 *
 * Common fields extracted: fullName, email/phone identifiers, hashed password,
 * status, soft-delete, lastLoginAt.
 */

/**
 * Canonical user status values shared across all projects.
 *
 * Each project may extend with additional statuses, but must support at least
 * ACTIVE and SUSPENDED for cross-project tooling.
 */
export enum CommonUserStatus {
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
}

/**
 * Base user entity contract — minimum fields every IAM user entity must provide.
 *
 * Projects extend this with their own domain-specific fields:
 * - v2: add tenantId, totpEnabled, avatarFileId, etc.
 * - vita: add member_code, level, rank_label, zalo_id, etc.
 * - GHS: add role (ADMIN/EDITOR enum)
 */
export interface IBaseUser {
  /** User's display name. */
  fullName: string;

  /** Primary email address (unique per active users). */
  email?: string;

  /** Primary phone number (unique per active users). */
  phone?: string;

  /** bcrypt-hashed password (should be excluded from default queries). */
  hashedPassword?: string;

  /** Account status — must at least support ACTIVE and SUSPENDED. */
  status: string;

  /** Whether the user has been soft-deleted. */
  isDeleted: boolean;

  /** Soft-delete timestamp. */
  deletedAt?: Date;

  /** Last successful login timestamp. */
  lastLoginAt?: Date;
}

/**
 * User projection returned in API responses (safe, no sensitive fields).
 */
export interface IUserPublicProjection {
  id: string;
  fullName: string;
  email?: string;
  phone?: string;
  status: string;
}
