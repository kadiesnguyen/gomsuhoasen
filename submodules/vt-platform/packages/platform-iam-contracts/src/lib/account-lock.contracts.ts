/**
 * Shared account lock contracts.
 *
 * Extracted from the intersection of account lock patterns across all three projects:
 *
 * - v2:   Inline lock check in auth flow (status !== 'ACTIVE')
 * - vita: AccountLockService (76 LOC) — 3 gate functions (authenticate, referrer, transfer)
 * - GHS:  Inline check (status !== UserStatus.ACTIVE)
 *
 * This contract provides a portable, framework-agnostic interface for
 * account lock checking. NestJS-specific service wrappers live in the
 * consumer IAM module.
 */

/**
 * Minimum interface for an entity that can be locked/suspended.
 * All user/member schemas across projects satisfy this interface.
 */
export interface IAccountLockable {
  /** Account status field — expected values: 'ACTIVE', 'SUSPENDED', 'locked', etc. */
  account_status?: string;
  /** Status field — alternative naming used by some schemas */
  status?: string;
  /** Optional reason for lock/suspension */
  locked_reason?: string;
}

/** Status values that represent an active (unlocked) account */
const ACTIVE_STATUS_VALUES = new Set(['ACTIVE', 'active']);

export interface AccountLockOptions {
  /**
   * Treat missing status as locked instead of permissive.
   *
   * Use this for fail-closed authentication flows where the account document is
   * expected to always carry a status field.
   */
  failClosedOnMissingStatus?: boolean;
}

/**
 * Check if an entity is locked/suspended.
 *
 * Works across all three naming conventions:
 * - v2/GHS: `status: 'SUSPENDED'`
 * - vita: `account_status: 'locked'`
 *
 * @returns true if the entity is locked/suspended/non-active
 */
export function isAccountLocked(
  entity: IAccountLockable | null | undefined,
  options: AccountLockOptions = {},
): boolean {
  if (!entity) return true; // null/undefined = locked/fail-closed
  const status = entity.account_status ?? entity.status;
  if (!status) return options.failClosedOnMissingStatus ?? false;
  return !ACTIVE_STATUS_VALUES.has(status);
}

/**
 * Get the lock reason message, with a sensible default.
 */
export function getAccountLockMessage(
  entity: IAccountLockable | null | undefined,
  defaultMessage = 'Account is locked. Please contact administrator.',
): string {
  if (!entity?.locked_reason || typeof entity.locked_reason !== 'string' || entity.locked_reason.trim().length === 0) {
    return defaultMessage;
  }
  return entity.locked_reason.trim();
}
