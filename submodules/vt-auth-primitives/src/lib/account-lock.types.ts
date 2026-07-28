/**
 * Shared account-lock type contracts.
 *
 * Extracted from common patterns across v2 (user.status + token blacklist),
 * vita (account-lock.service.ts), and GHS (UserStatus enum).
 *
 * All three projects implement some form of account locking/suspension.
 * This contract unifies the interface so future projects can reuse the pattern.
 */

/** Canonical account status values shared across projects. */
export enum CommonAccountStatus {
  /** Account is active and can authenticate. */
  ACTIVE = 'ACTIVE',

  /** Account is temporarily suspended (locked). */
  SUSPENDED = 'SUSPENDED',

  /** Account is permanently deactivated. */
  DEACTIVATED = 'DEACTIVATED',
}

/** Configuration for automatic account locking on repeated auth failures. */
export interface AccountLockPolicy {
  /** Maximum failed login attempts before automatic lock. */
  maxAttempts: number;

  /** Duration in milliseconds that the lock stays active. */
  lockDurationMs: number;

  /** Window in milliseconds during which failed attempts are counted. */
  attemptWindowMs: number;
}

/** Snapshot of an account's lock state (read-only projection). */
export interface AccountLockState {
  /** Whether the account is currently locked. */
  isLocked: boolean;

  /** Number of consecutive failed attempts in the current window. */
  failedAttempts: number;

  /** Timestamp of the most recent failed attempt. */
  lastFailedAt?: Date;

  /** Timestamp when the current lock expires (undefined if not locked). */
  lockExpiresAt?: Date;

  /** Human-readable reason for the lock. */
  lockedReason?: string;
}

/**
 * Default account lock policy.
 * 5 failed attempts within 15 minutes → lock for 30 minutes.
 */
export const DEFAULT_ACCOUNT_LOCK_POLICY: Readonly<AccountLockPolicy> = {
  maxAttempts: 5,
  lockDurationMs: 30 * 60 * 1000,      // 30 minutes
  attemptWindowMs: 15 * 60 * 1000,     // 15 minutes
};

/**
 * Evaluate whether an account should be locked based on its current state and policy.
 *
 * Pure function — no side effects, no database access.
 */
export function shouldLockAccount(
  state: Pick<AccountLockState, 'failedAttempts' | 'lastFailedAt'>,
  policy: AccountLockPolicy = DEFAULT_ACCOUNT_LOCK_POLICY,
  now: Date = new Date(),
): boolean {
  if (state.failedAttempts < policy.maxAttempts) {
    return false;
  }

  if (!state.lastFailedAt) {
    return false;
  }

  const elapsed = now.getTime() - state.lastFailedAt.getTime();
  return elapsed <= policy.attemptWindowMs;
}

/**
 * Check whether a currently-locked account's lock has expired.
 */
export function isLockExpired(
  lockExpiresAt: Date | undefined,
  now: Date = new Date(),
): boolean {
  if (!lockExpiresAt) {
    return true; // No lock set → treat as expired
  }
  return now.getTime() >= lockExpiresAt.getTime();
}
