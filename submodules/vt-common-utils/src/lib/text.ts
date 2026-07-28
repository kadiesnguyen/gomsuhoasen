import { isNotUndefined } from './validation';

export function slugifyVi(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'd')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export function readTrimmedString(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
}

export function readStringifiedTrimmedString(value: unknown): string | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }

  return readTrimmedString(String(value));
}

export function hasTrimmedString(value: unknown): boolean {
  return readTrimmedString(value) !== undefined;
}

export function readTextInputValue(value: unknown): string {
  return readTrimmedString(value) ?? '';
}

export function readFirstTrimmedString(...values: unknown[]): string | undefined {
  for (const value of values) {
    const normalized = readTrimmedString(value);
    if (normalized !== undefined) {
      return normalized;
    }
  }

  return undefined;
}

export function readFirstTextInputValue(...values: unknown[]): string {
  return readFirstTrimmedString(...values) ?? '';
}

export function requireTrimmedString(
  value: unknown,
  createError: () => Error,
): string {
  const normalized = readTrimmedString(value);
  if (normalized === undefined) {
    throw createError();
  }
  return normalized;
}

export function requireFirstTrimmedString(
  values: readonly unknown[],
  createError: () => Error,
): string {
  const normalized = readFirstTrimmedString(...values);
  if (normalized === undefined) {
    throw createError();
  }
  return normalized;
}

export function readTextParts(values: readonly unknown[]): string[] {
  return values.map(readTrimmedString).filter(isNotUndefined);
}

export function joinTextParts(values: readonly unknown[], separator = ', '): string {
  return readTextParts(values).join(separator);
}

export function readJoinedTextParts(
  values: readonly unknown[],
  separator = ', ',
): string | undefined {
  const joined = joinTextParts(values, separator);
  return joined.length > 0 ? joined : undefined;
}

export function readUppercaseTrimmedString(value: unknown): string | undefined {
  const normalized = readTrimmedString(value);
  return normalized === undefined ? undefined : normalized.toUpperCase();
}

export function readLowercaseTrimmedString(value: unknown): string | undefined {
  const normalized = readTrimmedString(value);
  return normalized === undefined ? undefined : normalized.toLowerCase();
}

export type ClassNameValue = string | false | null | undefined;

export function joinClassNames(...values: ClassNameValue[]): string {
  return values
    .map(readTrimmedString)
    .filter(isNotUndefined)
    .join(' ');
}
