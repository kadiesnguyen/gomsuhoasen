/**
 * Shared date utilities.
 *
 * Common date operations used across v2, vita, and GHS for
 * ISO date formatting, expiry checks, and duration display.
 */

const ISO_DATE_KEY_LENGTH = 10;
const ISO_MONTH_KEY_LENGTH = 7;
const ISO_DATE_SEPARATOR = '-';
const EMPTY_TEXT = '';

export type IsoDateKeyInput = Date | string | number;

function requireValidDate(input: IsoDateKeyInput): Date {
  const date = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(date.getTime())) {
    throw new RangeError('Invalid date input');
  }
  return date;
}

/**
 * Format a Date as ISO-8601 date string (YYYY-MM-DD).
 * Useful for birthday, expiry_date fields used in vita member schema.
 */
export function formatISODate(date: Date): string {
  return formatISODateKey(date);
}

/**
 * Format date-like input as UTC ISO date key (YYYY-MM-DD).
 */
export function formatISODateKey(input: IsoDateKeyInput = new Date()): string {
  return requireValidDate(input).toISOString().slice(0, ISO_DATE_KEY_LENGTH);
}

/**
 * Format date-like input as compact UTC ISO date key (YYYYMMDD).
 */
export function formatCompactISODateKey(input: IsoDateKeyInput = new Date()): string {
  return formatISODateKey(input).split(ISO_DATE_SEPARATOR).join(EMPTY_TEXT);
}

/**
 * Format date-like input as UTC ISO month key (YYYY-MM).
 */
export function formatISOMonthKey(input: IsoDateKeyInput = new Date()): string {
  return requireValidDate(input).toISOString().slice(0, ISO_MONTH_KEY_LENGTH);
}

/**
 * Format a Date as ISO-8601 datetime string.
 */
export function formatISODateTime(date: Date): string {
  return date.toISOString();
}

/**
 * Check whether an expiry date string has passed.
 *
 * @param expiryDate - ISO date string (e.g. '2026-12-31')
 * @param now        - Comparison date (default: current time)
 * @returns `true` if the date has expired
 */
export function isExpired(expiryDate: string, now: Date = new Date()): boolean {
  const expiry = new Date(expiryDate);
  if (isNaN(expiry.getTime())) {
    return true; // Invalid date → treat as expired
  }
  return now.getTime() >= expiry.getTime();
}

/**
 * Calculate a future date by adding days from now.
 *
 * Common pattern in membership expiry, voucher validity, etc.
 *
 * @param days - Number of days to add
 * @param from - Starting date (default: now)
 */
export function addDays(days: number, from: Date = new Date()): Date {
  const result = new Date(from);
  result.setDate(result.getDate() + days);
  return result;
}

/**
 * Calculate a future date by adding months from now.
 */
export function addMonths(months: number, from: Date = new Date()): Date {
  const result = new Date(from);
  result.setMonth(result.getMonth() + months);
  return result;
}
