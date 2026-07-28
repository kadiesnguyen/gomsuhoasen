/**
 * Unique code and ID generation utilities.
 *
 * Common patterns across:
 * - vita member_code generation
 * - v2 invitation codes, voucher codes
 * - GHS quote/RFQ reference numbers
 * - OLD_CODE various CODE fields
 */

const RANDOM_SOURCE_UNAVAILABLE_MESSAGE =
  'common-utils.generateUniqueCode requires globalThis.crypto.getRandomValues';

function createRandomBytes(length: number): Uint8Array {
  if (!Number.isInteger(length) || length < 0) {
    throw new Error('common-utils.generateUniqueCode length must be a non-negative integer');
  }

  const crypto = globalThis.crypto;
  if (!crypto || typeof crypto.getRandomValues !== 'function') {
    throw new Error(RANDOM_SOURCE_UNAVAILABLE_MESSAGE);
  }

  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return bytes;
}

/**
 * Generate a unique code with a prefix and random alphanumeric suffix.
 *
 * Format: `{PREFIX}-{RANDOM}`, e.g. `MBR-A3F8K2`
 *
 * @param prefix - Short uppercase prefix (e.g. 'MBR', 'VCH', 'ORD', 'QUO')
 * @param length - Length of the random suffix (default: 6)
 */
export function generateUniqueCode(prefix: string, length = 6): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Exclude confusing chars: I,O,0,1
  const bytes = createRandomBytes(length);
  let suffix = '';
  for (let i = 0; i < length; i++) {
    suffix += chars[bytes[i] % chars.length];
  }
  return `${prefix.toUpperCase()}-${suffix}`;
}

/**
 * Generate a short numeric reference code.
 *
 * Format: `{PREFIX}{YYMMDD}{SEQ}`, e.g. `ORD260521001`
 *
 * @param prefix - Short prefix (e.g. 'ORD', 'QUO')
 * @param seq    - Sequential number (padded to 3 digits)
 * @param date   - Date for the date component (default: now)
 */
export function generateDateSequenceCode(
  prefix: string,
  seq: number,
  date: Date = new Date(),
): string {
  const yy = String(date.getFullYear()).slice(-2);
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const seqStr = String(seq).padStart(3, '0');
  return `${prefix.toUpperCase()}${yy}${mm}${dd}${seqStr}`;
}
