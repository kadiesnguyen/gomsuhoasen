export type Result<T, E = Error> =
  | { success: true; data: T }
  | { success: false; error: E };

export function success<T>(data: T): Result<T, never> {
  return { success: true, data };
}

export function failure<E>(error: E): Result<never, E> {
  return { success: false, error };
}
