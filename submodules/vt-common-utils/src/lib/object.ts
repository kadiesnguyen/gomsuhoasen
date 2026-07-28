import { AppError } from './errors';
import type { ExtensiblePartial, InitialValueDefaults, WithInitialValues } from './types';

export type DefinedObjectEntry<T extends object> = {
  [K in keyof T]-?: [K, Exclude<T[K], undefined>];
}[keyof T];

export function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function entriesExcludingKeys<TKey extends PropertyKey, TValue>(
  entries: Iterable<readonly [TKey, TValue]>,
  excludedKeys: readonly TKey[],
): Array<[TKey, TValue]> {
  const excludedKeySet = new Set<TKey>(excludedKeys);
  return Array.from(entries)
    .filter(([key]) => !excludedKeySet.has(key))
    .map(([key, value]) => [key, value]);
}

export function entriesWithoutUndefined<T extends object>(
  input: T,
): DefinedObjectEntry<T>[] {
  return Object.entries(input).filter(
    ([, value]) => value !== undefined,
  ) as DefinedObjectEntry<T>[];
}

export function withoutUndefined<T extends object>(input: T): Partial<T> {
  return Object.fromEntries(entriesWithoutUndefined(input)) as Partial<T>;
}

export function copyObjectInput<T extends object>(
  value: T | undefined,
  defaultValue: T,
): T {
  return value === undefined ? { ...defaultValue } : { ...value };
}

export function readRequiredMappedValue<TKey extends PropertyKey, TValue>(
  map: Record<TKey, TValue>,
  key: TKey,
  label: string,
): TValue {
  if (!Object.prototype.hasOwnProperty.call(map, key)) {
    throw new AppError(
      `Unsupported ${label}: ${String(key)}`,
      'UNSUPPORTED_MAPPED_VALUE',
      500,
    );
  }

  return map[key];
}

function cloneInitialFieldValue<T>(value: T): T {
  if (Array.isArray(value)) {
    return [...value] as T;
  }
  if (isObjectRecord(value)) {
    return { ...value } as T;
  }
  return value;
}

function nullishInitialValues<TInput extends object, TInitial extends object>(
  input: TInput,
  initialValues: InitialValueDefaults<TInitial>,
): Partial<TInitial> {
  const inputRecord = input as Record<string, unknown>;
  const entries = Object.entries(initialValues).filter(([key]) => {
    const value = inputRecord[key];
    return value === undefined || value === null;
  });
  return Object.fromEntries(
    entries.map(([key, value]) => [key, cloneInitialFieldValue(value)]),
  ) as Partial<TInitial>;
}

export function buildMissingInitialValues<TInput extends object, TInitial extends object>(
  input: TInput,
  initialValues: InitialValueDefaults<TInitial>,
): Partial<TInitial> {
  const inputRecord = input as Record<string, unknown>;
  const entries = Object.entries(initialValues).filter(([key]) => inputRecord[key] === undefined);
  return Object.fromEntries(
    entries.map(([key, value]) => [key, cloneInitialFieldValue(value)]),
  ) as Partial<TInitial>;
}

export function mergeInitialValues<TInput extends object, TInitial extends object>(
  input: ExtensiblePartial<TInitial, TInput>,
  initialValues: InitialValueDefaults<TInitial>,
): WithInitialValues<TInput, TInitial> {
  return {
    ...withoutUndefined(input),
    ...nullishInitialValues(input, initialValues),
  } as WithInitialValues<TInput, TInitial>;
}

export function applyInitialValues<TInput extends object, TInitial extends object>(
  input: ExtensiblePartial<TInitial, TInput>,
  initialValues: InitialValueDefaults<TInitial>,
): WithInitialValues<TInput, TInitial> {
  return {
    ...input,
    ...nullishInitialValues(input, initialValues),
  } as unknown as WithInitialValues<TInput, TInitial>;
}

export function applyMissingInitialValues<TInput extends object, TInitial extends object>(
  input: ExtensiblePartial<TInitial, TInput>,
  initialValues: InitialValueDefaults<TInitial>,
): WithInitialValues<TInput, TInitial> {
  return {
    ...input,
    ...buildMissingInitialValues(input, initialValues),
  } as unknown as WithInitialValues<TInput, TInitial>;
}
