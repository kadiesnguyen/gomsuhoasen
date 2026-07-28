export function readArrayInput<T>(value: unknown): T[] {
  return Array.isArray(value) ? value as T[] : [];
}

export function copyArrayInput<T>(
  value: readonly T[] | undefined,
  defaultValue: readonly T[] = [],
): T[] {
  return value === undefined ? [...defaultValue] : [...value];
}

export function copyObjectArray<T extends object>(value: readonly T[]): T[] {
  return value.map((item) => ({ ...item }));
}

export function copyObjectArrayInput<T extends object>(value: readonly T[] | undefined): T[] {
  return value === undefined ? [] : copyObjectArray(value);
}
