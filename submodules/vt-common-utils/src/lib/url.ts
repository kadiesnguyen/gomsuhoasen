export function isAbsoluteUrl(value: string): boolean {
  return /^(https?:)?\/\//.test(value);
}

export function joinUrl(origin: string, path: string): string {
  const cleanOrigin = origin.replace(/\/+$/, '');
  const cleanPath = path.replace(/^\/+/, '');
  return `${cleanOrigin}/${cleanPath}`;
}

export type UrlPathSegment = string | number | boolean;
export type UrlQueryValue = string | number | boolean | null | undefined;

export function encodeUrlPathSegment(value: UrlPathSegment): string {
  return encodeURIComponent(String(value));
}

export function appendUrlPathSegments(path: string, ...segments: UrlPathSegment[]): string {
  const cleanPath = path.replace(/\/+$/, '');
  const encodedSegments = segments.map((segment) => encodeUrlPathSegment(segment)).join('/');
  if (!cleanPath) return `/${encodedSegments}`;
  return encodedSegments ? `${cleanPath}/${encodedSegments}` : cleanPath;
}

export function replaceUrlPathParam(
  template: string,
  paramName: string,
  value: UrlPathSegment,
): string {
  const cleanParamName = paramName.trim();
  if (!cleanParamName) {
    throw new Error('replaceUrlPathParam: paramName is required');
  }
  const pattern = new RegExp(`:${cleanParamName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'g');
  return template.replace(pattern, encodeUrlPathSegment(value));
}

export function buildUrlQueryString(params: Record<string, UrlQueryValue>): string {
  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue;
    searchParams.set(key, String(value));
  }
  return searchParams.toString();
}

export function appendUrlQueryString(url: string, params: Record<string, UrlQueryValue>): string {
  const queryString = buildUrlQueryString(params);
  if (!queryString) return url;
  return `${url}${url.includes('?') ? '&' : '?'}${queryString}`;
}

export function toAssetUrl(path: string | null | undefined, apiOrigin: string): string | undefined {
  if (!path) return undefined;
  if (isAbsoluteUrl(path)) return path;
  if (path.startsWith('/uploads/')) return `${apiOrigin}${path}`;
  if (path.startsWith('uploads/')) return joinUrl(apiOrigin, path);
  if (path.startsWith('/')) return path;
  return `/${path.replace(/^\/+/, '')}`;
}
