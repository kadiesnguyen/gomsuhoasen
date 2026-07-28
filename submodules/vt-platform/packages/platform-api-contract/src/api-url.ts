const ABSOLUTE_HTTP_URL_PATTERN = /^https?:\/\//i;
export const DEFAULT_API_VERSION_PREFIX = 'v2';

export interface ApiVersionPrefixDuplicationOptions {
  versionPrefix?: string;
}

export function trimTrailingSlashes(value: string): string {
  return value.replace(/\/+$/, '');
}

export function trimLeadingSlashes(value: string): string {
  return value.replace(/^\/+/, '');
}

export function isAbsoluteHttpUrl(
  value: string | null | undefined,
): value is string {
  return typeof value === 'string' && ABSOLUTE_HTTP_URL_PATTERN.test(value);
}

export function stripApiSuffix(value: string): string {
  return trimTrailingSlashes(value).replace(/\/api(?:\/v\d+)?$/i, '');
}

export function joinApiBaseAndPath(
  baseUrl: string,
  requestPath: string,
): string {
  const base = trimTrailingSlashes(baseUrl);
  const path = trimLeadingSlashes(requestPath);
  return path ? `${base}/${path}` : base;
}

export type UrlPathSegment = string | number | boolean;
export type UrlQueryValue = string | number | boolean | null | undefined;
export type ApiRouteParamValue = string | number | boolean;

export interface ApplyApiRouteParamsOptions {
  encode?: boolean;
}

export function encodeUrlPathSegment(value: UrlPathSegment): string {
  return encodeURIComponent(String(value));
}

export function appendUrlPathSegments(
  path: string,
  ...segments: UrlPathSegment[]
): string {
  const cleanPath = trimTrailingSlashes(path);
  const encodedSegments = segments
    .map((segment) => encodeUrlPathSegment(segment))
    .join('/');
  if (!cleanPath) return `/${encodedSegments}`;
  return encodedSegments ? `${cleanPath}/${encodedSegments}` : cleanPath;
}

export function joinApiRoutePath(...parts: string[]): string {
  return parts
    .map((part) => trimTrailingSlashes(trimLeadingSlashes(part)))
    .filter(Boolean)
    .join('/');
}

export function buildApiPath(apiPrefix: string, ...parts: string[]): string {
  const routePath = joinApiRoutePath(apiPrefix, ...parts);
  return routePath ? `/${routePath}` : '/';
}

export function applyApiRouteParams(
  route: string,
  params: Record<string, ApiRouteParamValue>,
  options: ApplyApiRouteParamsOptions = {},
): string {
  return Object.entries(params).reduce((resolved, [key, value]) => {
    const replacement = options.encode
      ? encodeUrlPathSegment(value)
      : String(value);
    return resolved.split(`:${key}`).join(replacement);
  }, route);
}

export function buildUrlQueryString(
  params: Record<string, UrlQueryValue>,
): string {
  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue;
    searchParams.set(key, String(value));
  }
  return searchParams.toString();
}

export function appendUrlQueryString(
  url: string,
  params: Record<string, UrlQueryValue>,
): string {
  const queryString = buildUrlQueryString(params);
  if (!queryString) return url;
  return `${url}${url.includes('?') ? '&' : '?'}${queryString}`;
}

export function hasDuplicateApiVersionPrefix(
  baseUrl: string | null | undefined,
  requestPath: string | null | undefined,
  options: ApiVersionPrefixDuplicationOptions = {},
): boolean {
  if (!baseUrl || !requestPath || isAbsoluteHttpUrl(requestPath)) {
    return false;
  }

  const versionPrefix = normalizeVersionPrefix(
    options.versionPrefix ?? DEFAULT_API_VERSION_PREFIX,
  );
  if (!versionPrefix) {
    return false;
  }

  const normalizedBase = trimTrailingSlashes(baseUrl).toLowerCase();
  const normalizedPath = trimLeadingSlashes(requestPath).toLowerCase();
  const baseEndsWithVersion =
    normalizedBase.endsWith(`/api/${versionPrefix}`) ||
    normalizedBase.endsWith(`/${versionPrefix}`);

  return baseEndsWithVersion && normalizedPath.startsWith(`${versionPrefix}/`);
}

function normalizeVersionPrefix(value: string): string {
  return trimTrailingSlashes(trimLeadingSlashes(value)).toLowerCase();
}
