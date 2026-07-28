import { clampNumber, toFiniteNumber } from '@vt/common-utils';

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginationQueryInput {
  page?: string | number;
  limit?: string | number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc' | string;
}

export interface PaginationParseOptions {
  defaultPage?: number;
  defaultLimit?: number;
  maxLimit?: number;
  defaultSortBy?: string;
  defaultSortOrder?: 'asc' | 'desc';
}

export interface OffsetPaginationQueryInput {
  offset?: string | number;
  skip?: string | number;
  limit?: string | number;
}

export interface OffsetPaginationParseOptions {
  defaultOffset?: number;
  defaultLimit?: number;
  maxLimit?: number;
}

export interface ParsedPagination {
  page: number;
  limit: number;
  skip: number;
  sort: Record<string, 1 | -1>;
}

export interface ParsedOffsetPagination {
  offset: number;
  skip: number;
  limit: number;
}

export type SortDirection = 1 | -1;

export interface StrictPositiveIntQueryParamInput {
  value: unknown;
  fieldName: string;
  defaultValue: number;
}

export type StrictPositiveIntQueryParamResult =
  | { ok: true; value: number }
  | { ok: false; reason: 'POSITIVE_INTEGER_REQUIRED'; details: { fieldName: string; value: unknown } };

export interface PrefixRegexFilter {
  $regex: string;
  $options: 'i';
}

export interface MappedSortInput {
  sortKey?: string;
  order?: 'asc' | 'desc' | string;
  defaultKey: string;
  mappings: Record<string, readonly string[]>;
  fallbackToDefault?: boolean;
  strictOrder?: boolean;
}

export type MappedSortResult =
  | { ok: true; sort: Record<string, SortDirection>; key: string; direction: SortDirection }
  | { ok: false; reason: 'SORT_KEY_NOT_ALLOWED' | 'SORT_ORDER_NOT_ALLOWED'; details: Record<string, unknown> };

export function parsePaginationQuery(
  query: PaginationQueryInput,
  options: PaginationParseOptions = {},
): ParsedPagination {
  const defaultPage = options.defaultPage ?? 1;
  const defaultLimit = options.defaultLimit ?? 20;
  const maxLimit = options.maxLimit ?? 100;

  const rawPage = toFiniteNumber(query.page, defaultPage);
  const page = rawPage > 0 ? Math.floor(rawPage) : defaultPage;

  const rawLimit = toFiniteNumber(query.limit, defaultLimit);
  const limit = rawLimit > 0 ? clampNumber(Math.floor(rawLimit), 1, maxLimit) : defaultLimit;

  const sortBy = query.sortBy || options.defaultSortBy || 'createdAt';
  const defaultSortOrder = options.defaultSortOrder ?? 'desc';
  const normalizedSortOrder =
    query.sortOrder === 'asc' || query.sortOrder === 'desc' ? query.sortOrder : defaultSortOrder;
  const sortDirection: 1 | -1 = normalizedSortOrder === 'asc' ? 1 : -1;

  return {
    page,
    limit,
    skip: (page - 1) * limit,
    sort: { [sortBy]: sortDirection } as Record<string, 1 | -1>,
  };
}

export function buildPaginationMeta(total: number, page: number, limit: number): PaginationMeta {
  return {
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

export function parseStrictPositiveIntQueryParam(
  input: StrictPositiveIntQueryParamInput,
): StrictPositiveIntQueryParamResult {
  if (input.value === undefined || input.value === null) {
    return { ok: true, value: input.defaultValue };
  }

  if (typeof input.value === 'number') {
    if (Number.isSafeInteger(input.value) && input.value > 0) {
      return { ok: true, value: input.value };
    }
  } else if (typeof input.value === 'string' && /^[1-9]\d*$/.test(input.value)) {
    const parsed = parseInt(input.value, 10);
    if (Number.isSafeInteger(parsed)) {
      return { ok: true, value: parsed };
    }
  }

  return {
    ok: false,
    reason: 'POSITIVE_INTEGER_REQUIRED',
    details: {
      fieldName: input.fieldName,
      value: input.value,
    },
  };
}

export function parseOffsetPaginationQuery(
  query: OffsetPaginationQueryInput,
  options: OffsetPaginationParseOptions = {},
): ParsedOffsetPagination {
  const defaultOffset = options.defaultOffset ?? 0;
  const defaultLimit = options.defaultLimit ?? 20;
  const maxLimit = options.maxLimit ?? 100;

  const rawOffset = toFiniteNumber(query.offset ?? query.skip, defaultOffset);
  const offset = rawOffset >= 0 ? Math.floor(rawOffset) : defaultOffset;

  const rawLimit = toFiniteNumber(query.limit, defaultLimit);
  const limit = rawLimit > 0 ? clampNumber(Math.floor(rawLimit), 1, maxLimit) : defaultLimit;

  return {
    offset,
    skip: offset,
    limit,
  };
}

export function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function buildPrefixRegexFilter(value: string | undefined): PrefixRegexFilter | undefined {
  const normalized = typeof value === 'string' ? value.trim() : '';
  if (!normalized) return undefined;
  return { $regex: `^${escapeRegex(normalized)}`, $options: 'i' };
}

export function resolveSortDirection(order: string | undefined): SortDirection {
  return order === 'asc' ? 1 : -1;
}

export function resolveMappedSortSpec(input: MappedSortInput): MappedSortResult {
  const key = input.sortKey?.trim() || input.defaultKey;
  const fields = input.mappings[key];
  const order = input.order?.trim();

  if (input.strictOrder && order && order !== 'asc' && order !== 'desc') {
    return {
      ok: false,
      reason: 'SORT_ORDER_NOT_ALLOWED',
      details: { order: input.order, allowedSortOrders: ['asc', 'desc'] },
    };
  }

  if (!fields || fields.length === 0) {
    if (!input.fallbackToDefault) {
      return {
        ok: false,
        reason: 'SORT_KEY_NOT_ALLOWED',
        details: { sortKey: key, allowedSortKeys: Object.keys(input.mappings) },
      };
    }
    const defaultFields = input.mappings[input.defaultKey] ?? [];
    return {
      ok: true,
      key: input.defaultKey,
      direction: resolveSortDirection(order),
      sort: Object.fromEntries(defaultFields.map((field) => [field, resolveSortDirection(order)])) as Record<
        string,
        SortDirection
      >,
    };
  }

  const direction = resolveSortDirection(order);
  return {
    ok: true,
    key,
    direction,
    sort: Object.fromEntries(fields.map((field) => [field, direction])) as Record<string, SortDirection>,
  };
}
