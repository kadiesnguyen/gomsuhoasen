/**
 * GHS Shared Envelope & Query Contracts.
 *
 * Envelope shape and client unwrap helpers are canonical in
 * `@vt/platform-api-contract`. This file remains the GHS project facade for
 * local consumers and keeps only domain-local query contracts below.
 */

export {
  ContractResponseError,
  expectApiArray,
  expectApiObject,
  expectApiPaginated,
  unwrapApiData,
  unwrapApiResponse,
  normalizeApiErrorMessage,
  readApiEntityId,
  requireApiEntityId,
  withApiCanonicalId,
  withApiCanonicalIds,
  withApiPaginatedCanonicalIds,
  hasDuplicateApiVersionPrefix,
  isAbsoluteHttpUrl,
  joinApiBaseAndPath,
  stripApiSuffix,
  trimLeadingSlashes,
  trimTrailingSlashes,
  API_ERROR_CATEGORIES,
  classifyHttpStatusCode,
  extractApiErrorCode,
  extractApiErrorMessage,
  isApiErrorResponseEnvelope,
  isCancelledClientErrorCode,
  isNetworkClientErrorCode,
  isStandardHttpErrorPayload,
  isTimeoutClientError,
} from '@vt/platform-api-contract/browser';

export type {
  ApiEntityIdOptions,
  ApiEntityIdSource,
  ApiIdentified,
  ApiVersionPrefixDuplicationOptions,
  ApiErrorCategoryValue,
  ApiDeleteResponse,
  ApiErrorDetail,
  ApiErrorResponse,
  ApiPaginatedResponse,
  ApiResponse,
  ApiSuccessResponse,
  PaginatedPayload,
  PaginationMeta,
} from '@vt/platform-api-contract/browser';

// ─── Query Contracts (shared between portal and backend) ──────────────

export interface PaginationQuery {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface SearchQuery {
  search?: string;
}

export interface ListQuery extends PaginationQuery, SearchQuery {
  status?: string;
}

// ─── Base Entity Contract ─────────────────────────────────────────────

/** All entities returned from API have at least these fields */
export interface BaseEntityContract {
  id: string;
  createdAt?: string;
  updatedAt?: string;
}
