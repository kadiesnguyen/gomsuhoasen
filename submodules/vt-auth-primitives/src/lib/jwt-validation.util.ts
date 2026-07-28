/**
 * Shared JWT configuration validation primitives.
 *
 * Extracted from common patterns across v2, vita, and GHS IAM modules.
 * All three projects validate JWT_SECRET at startup and parse expiry durations.
 *
 * @see v2  — libs/modules/iam/src/lib/iam.module.ts  line 142-156
 * @see ghs — libs/modules/iam/src/lib/iam.module.ts  line 20-29
 * @see vita — libs/modules/iam/src/iam.module.ts      line 14-20
 */

import { readTrimmedString } from '@vt/common-utils';

/**
 * Pattern matching `ms`-compatible duration strings.
 * Accepts raw seconds (number-only) or duration strings like '15m', '7d', '1 hour'.
 */
const JWT_EXPIRY_PATTERN =
  /^\d+(?:\s?(?:ms|msec|msecs|millisecond|milliseconds|s|sec|secs|second|seconds|m|min|mins|minute|minutes|h|hr|hrs|hour|hours|d|day|days|w|week|weeks|y|yr|yrs|year|years))?$/i;

/**
 * Resolve and validate the JWT secret from a config source.
 *
 * @param getValue - Accessor function (e.g. `config.get` from @nestjs/config)
 * @param key      - The env key name (default: `'JWT_SECRET'`)
 * @returns The validated non-empty secret string
 * @throws Error if the secret is missing or empty
 */
export function resolveJwtSecret(
  getValue: (key: string) => string | undefined,
  key = 'JWT_SECRET',
): string {
  const secret = readTrimmedString(getValue(key));
  if (!secret) {
    throw new Error(
      `${key} environment variable is required. Service cannot start without a valid JWT secret.`,
    );
  }
  return secret;
}

/**
 * Parse a JWT expiry value into a number (seconds) or `ms`-compatible string.
 *
 * @param value    - Raw value from configuration
 * @param fallback - Default fallback when value is empty (default: `'7d'`)
 * @returns Number of seconds or a string like `'15m'`, `'7d'`
 * @throws Error if the value is present but does not match expected formats
 */
export function parseJwtExpiresIn(
  value: string | undefined,
  fallback = '7d',
): number | string {
  const candidate = readTrimmedString(value) ?? fallback;

  if (!JWT_EXPIRY_PATTERN.test(candidate)) {
    throw new Error(
      'JWT expiry must be a number of seconds or an ms-compatible duration such as 15m, 7d, or 1 hour.',
    );
  }

  // Pure digit string → return as number of seconds
  if (/^\d+$/.test(candidate)) {
    return Number(candidate);
  }

  return candidate;
}
