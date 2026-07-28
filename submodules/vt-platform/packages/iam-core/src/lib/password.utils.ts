/**
 * Password hashing utilities.
 *
 * All three projects use bcrypt with the same pattern.
 * This module centralizes the configuration.
 */

import * as bcrypt from 'bcrypt';

export const DEFAULT_BCRYPT_ROUNDS = 10;

/**
 * Hash a plaintext password with bcrypt.
 *
 * @param plaintext - The password to hash
 * @param rounds - Number of salt rounds (default: 10)
 * @returns The bcrypt hash
 */
export async function hashPassword(
  plaintext: string,
  rounds: number = DEFAULT_BCRYPT_ROUNDS,
): Promise<string> {
  return bcrypt.hash(plaintext, rounds);
}

/**
 * Compare a plaintext password against a bcrypt hash.
 *
 * @param plaintext - The password to check
 * @param hash - The bcrypt hash to compare against
 * @returns true if the password matches
 */
export async function comparePassword(
  plaintext: string,
  hash: string,
): Promise<boolean> {
  return bcrypt.compare(plaintext, hash);
}
