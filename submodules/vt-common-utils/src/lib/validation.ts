export function toFiniteNumber(value: string | number | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function readFiniteNumber(value: unknown): number | undefined {
  if (value === null || value === undefined || typeof value === 'boolean') return undefined;
  if (typeof value === 'string' && value.trim() === '') return undefined;

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function isNotUndefined<T>(value: T | undefined): value is T {
  return value !== undefined;
}

export function clampNumber(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
