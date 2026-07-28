import type { ApiErrorResponse } from './types';
import type { StandardHttpErrorPayload, StandardHttpErrorMessage } from './standard-http-error-payload';
import { isRecord } from './record';
import type { UnknownRecord } from './record';

export const API_ERROR_CATEGORIES = {
  VALIDATION: 'VALIDATION',
  AUTH_EXPIRED: 'AUTH_EXPIRED',
  PERMISSION_DENIED: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  RATE_LIMITED: 'RATE_LIMITED',
  SERVER_ERROR: 'SERVER_ERROR',
  NETWORK_ERROR: 'NETWORK_ERROR',
  TIMEOUT: 'TIMEOUT',
  CANCELLED: 'CANCELLED',
  UNKNOWN: 'UNKNOWN',
} as const;

export type ApiErrorCategoryValue =
  (typeof API_ERROR_CATEGORIES)[keyof typeof API_ERROR_CATEGORIES];

export const API_HTTP_STATUS = {
  FOUND: 302,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
} as const;

export const API_HTTP_STATUS_RANGES = {
  CLIENT_ERROR_MIN: API_HTTP_STATUS.BAD_REQUEST,
  CLIENT_ERROR_MAX_EXCLUSIVE: API_HTTP_STATUS.INTERNAL_SERVER_ERROR,
  SERVER_ERROR_MIN: API_HTTP_STATUS.INTERNAL_SERVER_ERROR,
} as const;

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function normalizeMessageValue(value: unknown): string | undefined {
  if (isNonEmptyString(value)) {
    return value.trim();
  }
  if (Array.isArray(value)) {
    const parts = value
      .filter((item): item is string => isNonEmptyString(item))
      .map((item) => item.trim());
    return parts.length > 0 ? parts.join('; ') : undefined;
  }
  return undefined;
}

export function classifyHttpStatusCode(statusCode: number | undefined): ApiErrorCategoryValue {
  if (statusCode === API_HTTP_STATUS.UNAUTHORIZED) return API_ERROR_CATEGORIES.AUTH_EXPIRED;
  if (statusCode === API_HTTP_STATUS.FORBIDDEN) return API_ERROR_CATEGORIES.PERMISSION_DENIED;
  if (statusCode === API_HTTP_STATUS.NOT_FOUND) return API_ERROR_CATEGORIES.NOT_FOUND;
  if (statusCode === API_HTTP_STATUS.CONFLICT) return API_ERROR_CATEGORIES.CONFLICT;
  if (statusCode === API_HTTP_STATUS.TOO_MANY_REQUESTS) return API_ERROR_CATEGORIES.RATE_LIMITED;
  if (
    typeof statusCode === 'number'
    && statusCode >= API_HTTP_STATUS_RANGES.CLIENT_ERROR_MIN
    && statusCode < API_HTTP_STATUS_RANGES.CLIENT_ERROR_MAX_EXCLUSIVE
  ) {
    return API_ERROR_CATEGORIES.VALIDATION;
  }
  if (typeof statusCode === 'number' && statusCode >= API_HTTP_STATUS_RANGES.SERVER_ERROR_MIN) {
    return API_ERROR_CATEGORIES.SERVER_ERROR;
  }
  return API_ERROR_CATEGORIES.UNKNOWN;
}

export function isCancelledClientErrorCode(code: unknown): boolean {
  return code === 'ERR_CANCELED';
}

export function isNetworkClientErrorCode(code: unknown): boolean {
  return code === 'ERR_NETWORK';
}

export function isTimeoutClientError(code: unknown, message: unknown): boolean {
  const normalizedCode = typeof code === 'string' ? code : '';
  const normalizedMessage = typeof message === 'string' ? message.trim().toLowerCase() : '';
  return (
    normalizedCode === 'ECONNABORTED' ||
    (normalizedCode === 'ERR_NETWORK' && normalizedMessage.includes('timeout'))
  );
}

export function isStandardHttpErrorPayload(value: unknown): value is StandardHttpErrorPayload {
  if (!isRecord(value)) return false;
  const message = value['message'];
  const messageIsValid =
    typeof message === 'string' ||
    (Array.isArray(message) && message.every((item) => typeof item === 'string'));
  return (
    typeof value['statusCode'] === 'number' &&
    isNonEmptyString(value['code']) &&
    messageIsValid
  );
}

export function isApiErrorResponseEnvelope(value: unknown): value is ApiErrorResponse {
  if (!isRecord(value)) return false;
  if (value['success'] !== false || !isRecord(value['error'])) return false;
  const error = value['error'];
  return typeof error['code'] === 'string' && typeof error['message'] === 'string';
}

export function extractApiErrorCode(value: unknown): string | undefined {
  if (isStandardHttpErrorPayload(value)) {
    return value.code;
  }
  if (isApiErrorResponseEnvelope(value)) {
    const code = value.error.code.trim();
    return code.length > 0 ? code : undefined;
  }
  if (isRecord(value) && isNonEmptyString(value['code'])) {
    return value['code'].trim();
  }
  return undefined;
}

export function extractApiErrorMessage(value: unknown, defaultMessage = ''): string {
  if (isStandardHttpErrorPayload(value)) {
    return normalizeMessageValue(value.message as StandardHttpErrorMessage) ?? defaultMessage;
  }
  if (isApiErrorResponseEnvelope(value)) {
    return normalizeMessageValue(value.error.message) ?? defaultMessage;
  }
  const directMessage = normalizeMessageValue(value);
  if (directMessage) {
    return directMessage;
  }
  if (isRecord(value)) {
    const message = normalizeMessageValue(value['message']);
    if (message) {
      return message;
    }
    const error = value['error'];
    const errorMessage = normalizeMessageValue(error);
    if (errorMessage) {
      return errorMessage;
    }
    if (isRecord(error)) {
      const nestedMessage = normalizeMessageValue(error['message']);
      if (nestedMessage) {
        return nestedMessage;
      }
    }
  }
  return defaultMessage;
}
