import { randomUUID } from 'node:crypto';
import { readTrimmedString } from './text';

export const RUNTIME_ID_SEPARATOR = {
  DASH: '-',
  UNDERSCORE: '_',
} as const;

export type RuntimeIdSeparator = typeof RUNTIME_ID_SEPARATOR[keyof typeof RUNTIME_ID_SEPARATOR];

const RUNTIME_ID_PREFIX_PATTERN = /^[a-z][a-z0-9-]*$/i;
const RUNTIME_ID_ERROR_MESSAGES = {
  PREFIX_INVALID: 'Runtime id prefix must start with a letter and contain only letters, numbers, and dashes',
} as const;

/**
 * Create a prefixed runtime identifier with a UUID suffix.
 *
 * @example
 * ```ts
 * createPrefixedRuntimeId('job');       // 'job_a1b2c3d4-...'
 * createPrefixedRuntimeId('task', '-'); // 'task-a1b2c3d4-...'
 * ```
 */
export function createPrefixedRuntimeId(
  prefix: string,
  separator: RuntimeIdSeparator = RUNTIME_ID_SEPARATOR.UNDERSCORE,
): string {
  const normalizedPrefix = readTrimmedString(prefix) ?? '';
  if (!RUNTIME_ID_PREFIX_PATTERN.test(normalizedPrefix)) {
    throw new Error(RUNTIME_ID_ERROR_MESSAGES.PREFIX_INVALID);
  }
  return `${normalizedPrefix}${separator}${randomUUID()}`;
}
