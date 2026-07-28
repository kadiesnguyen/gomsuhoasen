import type { PaginatedPayload } from './types';
import { API_CONTRACT_ERROR_MESSAGES, ContractResponseError } from './unwrap-api-response';

export interface ApiEntityIdOptions {
  allowMongoIdAlias?: boolean;
}

export type ApiEntityIdSource = string | { id?: unknown; _id?: unknown } | null | undefined;
export type ApiIdentified<T> = T & { id: string };

export function readApiEntityId(value: ApiEntityIdSource, options: ApiEntityIdOptions = {}): string | undefined {
  if (typeof value === 'string') {
    return value;
  }
  if (!value || typeof value !== 'object') {
    return undefined;
  }

  const id = typeof value.id === 'string' ? value.id : undefined;
  if (id) {
    return id;
  }
  if (options.allowMongoIdAlias) {
    const mongoId = typeof value._id === 'string' ? value._id : undefined;
    if (mongoId) {
      return mongoId;
    }
  }
  return id;
}

export function requireApiEntityId(
  value: ApiEntityIdSource,
  source: string,
  options: ApiEntityIdOptions = {},
): string {
  const id = readApiEntityId(value, options);
  if (!id) {
    throw new ContractResponseError(source, API_CONTRACT_ERROR_MESSAGES.EXPECTED_ENTITY_ID);
  }
  return id;
}

export function withApiCanonicalId<T extends { id?: unknown; _id?: unknown }>(
  item: T,
  source: string,
  options: ApiEntityIdOptions = {},
): ApiIdentified<T> {
  return {
    ...item,
    id: requireApiEntityId(item, source, options),
  };
}

export function withApiCanonicalIds<T extends { id?: unknown; _id?: unknown }>(
  items: T[],
  source: string,
  options: ApiEntityIdOptions = {},
): Array<ApiIdentified<T>> {
  return items.map((item) => withApiCanonicalId(item, source, options));
}

export function withApiPaginatedCanonicalIds<T extends { id?: unknown; _id?: unknown }>(
  page: PaginatedPayload<T>,
  source: string,
  options: ApiEntityIdOptions = {},
): PaginatedPayload<ApiIdentified<T>> {
  return {
    ...page,
    items: withApiCanonicalIds(page.items, source, options),
  };
}
