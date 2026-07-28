/**
 * Shared password hashing primitives.
 *
 * Extracted from common patterns across v2, vita, and GHS auth services.
 * All three projects use bcrypt with the same hash/compare flow.
 *
 * @see v2  — libs/modules/iam/src/lib/auth/auth.service.ts
 * @see ghs — libs/modules/iam/src/lib/auth/auth.service.ts  line 83
 * @see vita — libs/modules/iam/src/member.service.ts
 */

import * as bcrypt from 'bcrypt';

const DEFAULT_SALT_ROUNDS = 10;

/**
 * Hash a plain-text password using bcrypt.
 *
 * @param plain  - The raw password to hash
 * @param rounds - Salt rounds (default: 10, same as all current projects)
 * @returns The bcrypt hash string
 */
export async function hashPassword(
  plain: string,
  rounds: number = DEFAULT_SALT_ROUNDS,
): Promise<string> {
  return bcrypt.hash(plain, rounds);
}

/**
 * Compare a plain-text password against a bcrypt hash.
 *
 * @returns `true` when the password matches
 */
export async function comparePassword(
  plain: string,
  hash: string,
): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}
