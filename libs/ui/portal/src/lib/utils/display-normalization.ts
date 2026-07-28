import { readTrimmedString } from '@vt/common-utils';

export function readOptionalDisplayText(value: unknown): string | undefined {
  return readTrimmedString(value);
}

export function readDisplayText(value: unknown, fallback: string): string {
  return readTrimmedString(value) ?? fallback;
}

export function readFirstDisplayText(values: readonly unknown[], fallback: string): string {
  for (const value of values) {
    const text = readTrimmedString(value);
    if (text !== undefined) return text;
  }
  return fallback;
}

export function readPositiveInteger(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isInteger(value) && value > 0 ? value : fallback;
}
