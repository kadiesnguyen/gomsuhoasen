import type {
  ApiErrorResponse,
  ApiResponse,
  PaginatedPayload,
} from './types';
import { isApiErrorResponseEnvelope } from './api-error-classification';

export function isApiResponse<T>(value: unknown): value is ApiResponse<T> {
  return (
    typeof value === 'object' &&
    value !== null &&
    'success' in value &&
    typeof (value as { success?: unknown }).success === 'boolean'
  );
}

function isErrorResponse(value: ApiResponse<unknown>): value is ApiErrorResponse {
  return value.success === false;
}

const isObject = (value: unknown): value is { [key: string]: unknown } =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export const API_CONTRACT_ERROR_MESSAGES = {
  UNKNOWN_API_ERROR: 'API error',
  INVALID_RESPONSE_PAYLOAD: 'Invalid API response payload',
  EXPECTED_OBJECT_PAYLOAD: 'Expected object payload',
  EXPECTED_ARRAY_OR_PAGINATED_PAYLOAD: 'Expected array or paginated payload',
  EXPECTED_PAGINATED_PAYLOAD: 'Expected paginated payload',
  EXPECTED_ENTITY_ID: 'Expected entity id',
} as const;

function normalizeNonEmptyText(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

export function normalizeApiErrorMessage(payload: ApiErrorResponse): string {
  const message = (payload.error as { message?: unknown }).message;
  if (Array.isArray(message)) return message.join('; ');
  const normalizedMessage = normalizeNonEmptyText(message);
  if (normalizedMessage) return normalizedMessage;
  return normalizeNonEmptyText(payload.error.code) ?? API_CONTRACT_ERROR_MESSAGES.UNKNOWN_API_ERROR;
}

export class ContractResponseError extends Error {
  constructor(source: string, message: string = API_CONTRACT_ERROR_MESSAGES.INVALID_RESPONSE_PAYLOAD) {
    super(`[${source}] ${message}`);
    this.name = 'ContractResponseError';
  }
}

export function unwrapApiResponse<T>(value: T | ApiResponse<T>): T {
  if (!isApiResponse<T>(value)) return value;
  if (isErrorResponse(value)) {
    throw new Error(value.error.message);
  }
  return value.data;
}

export function unwrapApiData<T>(payload: unknown, source: string): T {
  if (isApiErrorResponseEnvelope(payload)) {
    throw new ContractResponseError(source, normalizeApiErrorMessage(payload));
  }
  if (isObject(payload) && payload['success'] === true && 'data' in payload) {
    return payload['data'] as T;
  }
  return payload as T;
}

export function expectApiObject<T>(payload: unknown, source: string): T {
  const data = unwrapApiData<unknown>(payload, source);
  if (!isObject(data)) {
    throw new ContractResponseError(source, API_CONTRACT_ERROR_MESSAGES.EXPECTED_OBJECT_PAYLOAD);
  }
  return data as T;
}

export function expectApiArray<T>(payload: unknown, source: string): T[] {
  const data = unwrapApiData<unknown>(payload, source);
  if (Array.isArray(data)) {
    return data as T[];
  }
  if (isObject(data) && Array.isArray(data['items'])) {
    return data['items'] as T[];
  }
  throw new ContractResponseError(source, API_CONTRACT_ERROR_MESSAGES.EXPECTED_ARRAY_OR_PAGINATED_PAYLOAD);
}

export function expectApiPaginated<T>(payload: unknown, source: string): PaginatedPayload<T> {
  const data = unwrapApiData<unknown>(payload, source);
  if (Array.isArray(data)) {
    return {
      items: data as T[],
      total: data.length,
      page: 1,
      limit: data.length,
      totalPages: 1,
    };
  }
  if (isObject(data) && Array.isArray(data['items'])) {
    const items = data['items'] as T[];
    return {
      items,
      total: typeof data['total'] === 'number' ? data['total'] : items.length,
      page: typeof data['page'] === 'number' ? data['page'] : 1,
      limit: typeof data['limit'] === 'number' ? data['limit'] : items.length,
      totalPages: typeof data['totalPages'] === 'number' ? data['totalPages'] : 1,
    };
  }
  throw new ContractResponseError(source, API_CONTRACT_ERROR_MESSAGES.EXPECTED_PAGINATED_PAYLOAD);
}
