export const OPENCLAW_ERROR_CATEGORIES = {
  UNAUTHORIZED: 'unauthorized',
  BAD_REQUEST: 'bad_request',
  CAPABILITY_RESOLUTION: 'capability_resolution',
  CAPABILITY_TIMEOUT: 'capability_timeout',
  PROVIDER_CONFIG_INVALID: 'provider_config_invalid',
  PROVIDER_UNSUPPORTED: 'provider_unsupported',
  EMBEDDING_PROVIDER_UNSUPPORTED: 'embedding_provider_unsupported',
  PROVIDER_DEPENDENCY: 'provider_dependency',
  NOT_FOUND: 'not_found',
  INTERNAL_ERROR: 'internal_error',
  UNKNOWN: 'unknown',
} as const;

export type OpenClawErrorCategory =
  (typeof OPENCLAW_ERROR_CATEGORIES)[keyof typeof OPENCLAW_ERROR_CATEGORIES];

export const OPENCLAW_HTTP_STATUS = {
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  NOT_FOUND: 404,
  INTERNAL_SERVER_ERROR: 500,
  PROVIDER_DEPENDENCY: 503,
  CAPABILITY_TIMEOUT: 504,
} as const;

export const OPENCLAW_HTTP_STATUS_RANGES = {
  SERVER_ERROR_MIN: OPENCLAW_HTTP_STATUS.INTERNAL_SERVER_ERROR,
} as const;

export class OpenClawBoundaryError extends Error {
  public override readonly name = 'OpenClawBoundaryError';

  constructor(
    public readonly category: OpenClawErrorCategory,
    public readonly httpStatus: number,
    public readonly upstreamError: string,
    public readonly capabilityName: string,
  ) {
    super(`OpenClaw ${capabilityName}: ${upstreamError}`);
  }
}

export function normalizeOpenClawErrorKey(
  errorString: string | undefined,
): string {
  return errorString?.trim().toLowerCase() ?? '';
}

export function classifyOpenClawError(
  httpStatus: number,
  errorString: string | undefined,
): OpenClawErrorCategory {
  const errorKey = normalizeOpenClawErrorKey(errorString);

  if (errorKey === OPENCLAW_ERROR_CATEGORIES.UNAUTHORIZED) {
    return OPENCLAW_ERROR_CATEGORIES.UNAUTHORIZED;
  }
  if (errorKey === OPENCLAW_ERROR_CATEGORIES.CAPABILITY_TIMEOUT) {
    return OPENCLAW_ERROR_CATEGORIES.CAPABILITY_TIMEOUT;
  }
  if (errorKey === OPENCLAW_ERROR_CATEGORIES.PROVIDER_CONFIG_INVALID) {
    return OPENCLAW_ERROR_CATEGORIES.PROVIDER_CONFIG_INVALID;
  }
  if (errorKey === OPENCLAW_ERROR_CATEGORIES.PROVIDER_UNSUPPORTED) {
    return OPENCLAW_ERROR_CATEGORIES.PROVIDER_UNSUPPORTED;
  }
  if (errorKey === OPENCLAW_ERROR_CATEGORIES.EMBEDDING_PROVIDER_UNSUPPORTED) {
    return OPENCLAW_ERROR_CATEGORIES.EMBEDDING_PROVIDER_UNSUPPORTED;
  }
  if (errorKey === OPENCLAW_ERROR_CATEGORIES.NOT_FOUND) {
    return OPENCLAW_ERROR_CATEGORIES.NOT_FOUND;
  }
  if (errorKey === OPENCLAW_ERROR_CATEGORIES.INTERNAL_ERROR) {
    return OPENCLAW_ERROR_CATEGORIES.INTERNAL_ERROR;
  }
  if (errorKey === OPENCLAW_ERROR_CATEGORIES.BAD_REQUEST) {
    return OPENCLAW_ERROR_CATEGORIES.BAD_REQUEST;
  }

  if (errorKey.startsWith('unknown capability')) {
    return OPENCLAW_ERROR_CATEGORIES.CAPABILITY_RESOLUTION;
  }
  if (
    errorKey.includes('no-api-key')
    || errorKey.includes('rate-limited')
    || errorKey.includes('embedding unavailable')
  ) {
    return OPENCLAW_ERROR_CATEGORIES.PROVIDER_DEPENDENCY;
  }

  if (httpStatus === OPENCLAW_HTTP_STATUS.UNAUTHORIZED) {
    return OPENCLAW_ERROR_CATEGORIES.UNAUTHORIZED;
  }
  if (httpStatus === OPENCLAW_HTTP_STATUS.NOT_FOUND) {
    return OPENCLAW_ERROR_CATEGORIES.NOT_FOUND;
  }
  if (httpStatus === OPENCLAW_HTTP_STATUS.CAPABILITY_TIMEOUT) {
    return OPENCLAW_ERROR_CATEGORIES.CAPABILITY_TIMEOUT;
  }
  if (httpStatus === OPENCLAW_HTTP_STATUS.PROVIDER_DEPENDENCY) {
    return OPENCLAW_ERROR_CATEGORIES.PROVIDER_DEPENDENCY;
  }
  if (httpStatus >= OPENCLAW_HTTP_STATUS_RANGES.SERVER_ERROR_MIN) {
    return OPENCLAW_ERROR_CATEGORIES.INTERNAL_ERROR;
  }
  if (httpStatus === OPENCLAW_HTTP_STATUS.BAD_REQUEST) {
    return OPENCLAW_ERROR_CATEGORIES.BAD_REQUEST;
  }

  return OPENCLAW_ERROR_CATEGORIES.UNKNOWN;
}

export function defaultHttpStatusForOpenClawCategory(
  category: OpenClawErrorCategory,
): number {
  switch (category) {
    case OPENCLAW_ERROR_CATEGORIES.UNAUTHORIZED:
      return OPENCLAW_HTTP_STATUS.UNAUTHORIZED;
    case OPENCLAW_ERROR_CATEGORIES.NOT_FOUND:
      return OPENCLAW_HTTP_STATUS.NOT_FOUND;
    case OPENCLAW_ERROR_CATEGORIES.CAPABILITY_TIMEOUT:
      return OPENCLAW_HTTP_STATUS.CAPABILITY_TIMEOUT;
    case OPENCLAW_ERROR_CATEGORIES.PROVIDER_DEPENDENCY:
      return OPENCLAW_HTTP_STATUS.PROVIDER_DEPENDENCY;
    case OPENCLAW_ERROR_CATEGORIES.INTERNAL_ERROR:
    case OPENCLAW_ERROR_CATEGORIES.UNKNOWN:
      return OPENCLAW_HTTP_STATUS.INTERNAL_SERVER_ERROR;
    default:
      return OPENCLAW_HTTP_STATUS.BAD_REQUEST;
  }
}
