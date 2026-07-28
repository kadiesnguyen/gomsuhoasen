export type DomainRecipeNumberGuardErrorFactory = (
  fieldName: string,
  message: string,
) => Error;

export interface DomainRecipeNumberGuardOptions {
  createError?: DomainRecipeNumberGuardErrorFactory;
  integerMessage?: string;
  message?: string;
  nonFiniteMessage?: string;
  negativeMessage?: string;
}

export const DOMAIN_RECIPE_NUMBER_GUARD_MESSAGES = {
  FINITE_NUMBER: 'must be a finite number',
  FINITE_NON_NEGATIVE_NUMBER: 'must be a finite non-negative number',
  NON_NEGATIVE_INTEGER: 'must be a non-negative integer',
  POSITIVE_INTEGER: 'must be a positive integer',
  PERCENTAGE_BETWEEN_0_AND_100: 'must be a percentage between 0 and 100',
  SAFE_INTEGER_AMOUNT: 'must be a safe integer amount',
  SAFE_NON_NEGATIVE_INTEGER: 'must be a safe non-negative integer',
  FIELD_MESSAGE: (fieldName: string, message: string) => `${fieldName} ${message}`,
} as const;

function throwNumberGuardError(
  fieldName: string,
  message: string,
  options?: DomainRecipeNumberGuardOptions,
): never {
  throw options?.createError?.(fieldName, message)
    ?? new Error(DOMAIN_RECIPE_NUMBER_GUARD_MESSAGES.FIELD_MESSAGE(fieldName, message));
}

export function requireFiniteNumber(
  value: unknown,
  fieldName: string,
  options?: DomainRecipeNumberGuardOptions,
): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throwNumberGuardError(
      fieldName,
      options?.nonFiniteMessage ?? options?.message ?? DOMAIN_RECIPE_NUMBER_GUARD_MESSAGES.FINITE_NUMBER,
      options,
    );
  }
  return value;
}

export function requireNonNegativeFiniteNumber(
  value: unknown,
  fieldName: string,
  options?: DomainRecipeNumberGuardOptions,
): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throwNumberGuardError(
      fieldName,
      options?.nonFiniteMessage ?? options?.message ?? DOMAIN_RECIPE_NUMBER_GUARD_MESSAGES.FINITE_NON_NEGATIVE_NUMBER,
      options,
    );
  }
  if (value < 0) {
    throwNumberGuardError(
      fieldName,
      options?.negativeMessage ?? options?.message ?? DOMAIN_RECIPE_NUMBER_GUARD_MESSAGES.FINITE_NON_NEGATIVE_NUMBER,
      options,
    );
  }
  return value;
}

export function requireNonNegativeInteger(
  value: unknown,
  fieldName: string,
  options?: DomainRecipeNumberGuardOptions,
): number {
  if (options?.nonFiniteMessage || options?.negativeMessage || options?.integerMessage) {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      throwNumberGuardError(
        fieldName,
        options.nonFiniteMessage ?? options.message ?? DOMAIN_RECIPE_NUMBER_GUARD_MESSAGES.NON_NEGATIVE_INTEGER,
        options,
      );
    }
    if (value < 0) {
      throwNumberGuardError(
        fieldName,
        options.negativeMessage ?? options.message ?? DOMAIN_RECIPE_NUMBER_GUARD_MESSAGES.NON_NEGATIVE_INTEGER,
        options,
      );
    }
    if (!Number.isInteger(value)) {
      throwNumberGuardError(
        fieldName,
        options.integerMessage ?? options.message ?? DOMAIN_RECIPE_NUMBER_GUARD_MESSAGES.NON_NEGATIVE_INTEGER,
        options,
      );
    }
    return value;
  }

  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0) {
    throwNumberGuardError(
      fieldName,
      options?.message ?? DOMAIN_RECIPE_NUMBER_GUARD_MESSAGES.NON_NEGATIVE_INTEGER,
      options,
    );
  }
  return value;
}

export function requirePositiveInteger(
  value: unknown,
  fieldName: string,
  options?: DomainRecipeNumberGuardOptions,
): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value <= 0) {
    throwNumberGuardError(
      fieldName,
      options?.message ?? DOMAIN_RECIPE_NUMBER_GUARD_MESSAGES.POSITIVE_INTEGER,
      options,
    );
  }
  return value;
}
