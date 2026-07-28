/**
 * Domain error input normalizer.
 *
 * Extracted from zalominiapp v2/libs/core/src/lib/utils/domain-error-input.util.ts.
 * Refactored to use JsonValue/JsonObject from @vt/common-utils (was @v2/contracts).
 *
 * Provides a standard way to normalize error inputs that can be either:
 * - A simple string message
 * - An object with code, message, and metadata
 *
 * Used by domain services to accept flexible error inputs while producing
 * consistent NormalizedDomainErrorInput for exception throwing.
 */

import type { JsonObject, JsonValue } from './json-value';
import { readTrimmedString } from './text';

export type DomainErrorInputObject = {
  code?: string;
  errorCode?: string;
  message?: string;
  details?: JsonValue;
  [key: string]: JsonValue | undefined;
};

export type DomainErrorInput = string | DomainErrorInputObject;

export type NormalizedDomainErrorInput = {
  code: string;
  message: string;
  details?: JsonValue;
};

function toMetadataDetails(metadata: Record<string, JsonValue | undefined>): JsonObject | undefined {
  const details: JsonObject = {};
  let hasValue = false;
  for (const [key, value] of Object.entries(metadata)) {
    if (value !== undefined) {
      details[key] = value;
      hasValue = true;
    }
  }
  return hasValue ? details : undefined;
}

/**
 * Normalize a flexible domain error input into a consistent shape.
 *
 * @param input - String message or object with code/message/details
 * @param fallbackCode - Code to use when not provided
 * @param fallbackMessage - Message to use when not provided
 *
 * @example
 * ```ts
 * // String input
 * normalizeDomainErrorInput('Not found', 'ERR_001', 'Fallback')
 * // → { code: 'ERR_001', message: 'Not found' }
 *
 * // Object input
 * normalizeDomainErrorInput({ code: 'CUSTOM', message: 'Custom msg' }, 'ERR_001', 'Fallback')
 * // → { code: 'CUSTOM', message: 'Custom msg' }
 *
 * // Undefined
 * normalizeDomainErrorInput(undefined, 'ERR_001', 'Fallback')
 * // → { code: 'ERR_001', message: 'Fallback' }
 * ```
 */
export function normalizeDomainErrorInput(
  input: DomainErrorInput | undefined,
  fallbackCode: string,
  fallbackMessage: string,
): NormalizedDomainErrorInput {
  if (input === undefined) {
    return { code: fallbackCode, message: fallbackMessage };
  }

  if (typeof input === 'string') {
    const message = readTrimmedString(input);
    if (!message) {
      throw new Error('Domain error string input must be non-empty');
    }
    return {
      code: fallbackCode,
      message,
    };
  }

  const { code, errorCode, message, details, ...metadata } = input;
  const metadataDetails = toMetadataDetails(metadata);

  return {
    code: code ?? errorCode ?? fallbackCode,
    message: message ?? fallbackMessage,
    details: details ?? metadataDetails,
  };
}
