import {
  appendUrlQueryString,
  extractApiErrorCode,
  extractApiErrorMessage,
  isAbsoluteHttpUrl,
  joinApiBaseAndPath,
  unwrapApiData,
  type UrlQueryValue,
} from '@vt/platform-api-contract/browser';

export type JsonApiMethod = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';

export type JsonApiQueryParams = Record<string, UrlQueryValue>;

export interface JsonApiClientOptions {
  baseUrl: string;
  defaultHeaders?: HeadersInit | (() => HeadersInit);
  fetchImpl?: typeof fetch;
  getAuthToken?: () => string | null | undefined;
}

export interface JsonApiRequestOptions extends Omit<RequestInit, 'body' | 'headers' | 'method'> {
  body?: unknown;
  headers?: HeadersInit;
  params?: JsonApiQueryParams;
  withAuth?: boolean;
}

export class ApiClientError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
  ) {
    super(message);
    this.name = 'ApiClientError';
  }
}

export function buildJsonApiUrl(
  baseUrl: string,
  path: string,
  params?: JsonApiQueryParams,
): string {
  const url = isAbsoluteHttpUrl(path) ? path : joinApiBaseAndPath(baseUrl, path);
  return params ? appendUrlQueryString(url, params) : url;
}

export async function parseJsonApiResponse<T>(
  response: Response,
  source: string,
): Promise<T> {
  const raw = await response.text();
  if (!response.ok) {
    throw parseApiClientError(raw, response.status, `${source} failed`);
  }

  if (!raw) return undefined as T;

  const parsed = parseJsonText(raw, source, response.status);
  return unwrapJsonApiPayload<T>(parsed, source, response.status);
}

export function unwrapJsonApiPayload<T>(
  payload: unknown,
  source: string,
  status = 0,
): T {
  try {
    return unwrapApiData<T>(payload, source);
  } catch {
    throw new ApiClientError(
      extractApiErrorMessage(payload, 'Unknown API error'),
      status,
      extractApiErrorCode(payload),
    );
  }
}

export function createJsonApiClient(options: JsonApiClientOptions) {
  async function request<T>(
    method: JsonApiMethod,
    path: string,
    requestOptions: JsonApiRequestOptions = {},
  ): Promise<T> {
    const {
      body,
      headers,
      params,
      withAuth = true,
      ...init
    } = requestOptions;
    const url = buildJsonApiUrl(options.baseUrl, path, params);
    const requestHeaders = buildRequestHeaders(options, headers, body, withAuth);
    const response = await resolveFetch(options.fetchImpl)(url, {
      ...init,
      method,
      headers: requestHeaders,
      body: body === undefined ? undefined : JSON.stringify(body),
    });

    return parseJsonApiResponse<T>(response, `${method} ${path}`);
  }

  return {
    request,
    get: <T>(path: string, params?: JsonApiQueryParams, options?: JsonApiRequestOptions) =>
      request<T>('GET', path, { ...options, params }),
    post: <T>(path: string, body?: unknown, options?: JsonApiRequestOptions) =>
      request<T>('POST', path, { ...options, body }),
    patch: <T>(path: string, body?: unknown, options?: JsonApiRequestOptions) =>
      request<T>('PATCH', path, { ...options, body }),
    put: <T>(path: string, body?: unknown, options?: JsonApiRequestOptions) =>
      request<T>('PUT', path, { ...options, body }),
    delete: <T>(path: string, body?: unknown, options?: JsonApiRequestOptions) =>
      request<T>('DELETE', path, { ...options, body }),
  };
}

function buildRequestHeaders(
  options: JsonApiClientOptions,
  headers: HeadersInit | undefined,
  body: unknown,
  withAuth: boolean,
): Headers {
  const requestHeaders = new Headers(resolveDefaultHeaders(options.defaultHeaders));
  requestHeaders.set('Accept', requestHeaders.get('Accept') ?? 'application/json');

  if (body !== undefined && !requestHeaders.has('Content-Type')) {
    requestHeaders.set('Content-Type', 'application/json');
  }

  const extraHeaders = new Headers(headers);
  extraHeaders.forEach((value, key) => requestHeaders.set(key, value));

  const token = withAuth ? readAuthToken(options.getAuthToken) : undefined;
  if (token && !requestHeaders.has('Authorization')) {
    requestHeaders.set('Authorization', `Bearer ${token}`);
  }

  return requestHeaders;
}

function resolveDefaultHeaders(headers: JsonApiClientOptions['defaultHeaders']): HeadersInit | undefined {
  return typeof headers === 'function' ? headers() : headers;
}

function readAuthToken(reader: JsonApiClientOptions['getAuthToken']): string | undefined {
  const token = reader?.();
  return typeof token === 'string' && token.trim().length > 0 ? token.trim() : undefined;
}

function resolveFetch(fetchImpl: typeof fetch | undefined): typeof fetch {
  const resolved = fetchImpl ?? globalThis.fetch;
  if (!resolved) {
    throw new ApiClientError('Fetch implementation is not available', 0);
  }
  return resolved;
}

function parseApiClientError(raw: string, status: number, fallback: string): ApiClientError {
  if (!raw) return new ApiClientError(fallback, status);

  try {
    const parsed = JSON.parse(raw) as unknown;
    return new ApiClientError(
      extractApiErrorMessage(parsed, fallback),
      status,
      extractApiErrorCode(parsed),
    );
  } catch {
    return new ApiClientError(raw, status);
  }
}

function parseJsonText(raw: string, source: string, status: number): unknown {
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    throw new ApiClientError(`Invalid JSON response from ${source}`, status);
  }
}
