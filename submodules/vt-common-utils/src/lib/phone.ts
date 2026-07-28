/**
 * Vietnamese phone number utilities.
 *
 * Common phone normalization used across:
 * - vita member.schema.ts (phone field, unique index)
 * - v2 user.schema.ts (primaryPhone, unique index)
 * - OLD_CODE user model (phone field)
 *
 * Vietnam phone numbers: 10 digits starting with 0, or +84 prefix.
 */

/**
 * Normalize a Vietnamese phone number to the canonical 10-digit format (0xxx...).
 *
 * Handles:
 * - +84xxxxxxxxx  → 0xxxxxxxxx
 * - 84xxxxxxxxx   → 0xxxxxxxxx
 * - 0xxxxxxxxx    → 0xxxxxxxxx (no change)
 * - Strips spaces, dots, dashes
 *
 * @returns The normalized 10-digit phone, or undefined if input is invalid
 */
export function normalizeVietnamesePhone(phone: string): string | undefined {
  // Strip all non-digit characters
  const digits = phone.replace(/[^\d]/g, '');

  // +84 / 84 prefix
  if (digits.startsWith('84') && digits.length === 11) {
    return '0' + digits.slice(2);
  }

  // Already 0-prefixed
  if (digits.startsWith('0') && digits.length === 10) {
    return digits;
  }

  // 9-digit without prefix (rare but some systems strip the 0)
  if (!digits.startsWith('0') && !digits.startsWith('84') && digits.length === 9) {
    return '0' + digits;
  }

  return undefined;
}

/**
 * Validate whether a string is a valid Vietnamese phone number.
 *
 * Valid Vietnamese mobile prefixes: 03x, 05x, 07x, 08x, 09x.
 */
export function isValidVietnamesePhone(phone: string): boolean {
  const normalized = normalizeVietnamesePhone(phone);
  if (!normalized) return false;

  // Vietnamese mobile carrier prefixes
  return /^0(3[2-9]|5[2689]|7[0-9]|8[1-9]|9[0-9])\d{7}$/.test(normalized);
}
