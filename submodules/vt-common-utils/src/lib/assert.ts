import { AppError } from './errors';

export function assert(condition: unknown, message?: string): asserts condition {
  if (!condition) {
    throw new AppError(message ?? 'Assertion failed', 'ASSERTION_ERROR', 500);
  }
}

export function assertIsDefined<T>(value: T, message?: string): asserts value is NonNullable<T> {
  if (value === undefined || value === null) {
    throw new AppError(message ?? 'Expected value to be defined', 'ASSERTION_ERROR', 500);
  }
}
