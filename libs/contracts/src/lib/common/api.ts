import { joinApiBaseAndPath, stripApiSuffix, trimTrailingSlashes } from '@vt/platform-api-contract/browser';
import { readTrimmedString, toAssetUrl as toCommonAssetUrl } from '@vt/common-utils';

const DEFAULT_API_URL = '/api';

export interface ApiUrlRuntimeEnv {
  API_ORIGIN?: string;
  NEXT_PUBLIC_API_URL?: string;
  VITE_API_URL?: string;
}

function readProcessEnv(): ApiUrlRuntimeEnv | undefined {
  try {
    if (typeof process === 'undefined') {
      return undefined;
    }
    return {
      API_ORIGIN: process.env['API_ORIGIN'],
      NEXT_PUBLIC_API_URL: process.env['NEXT_PUBLIC_API_URL'],
      VITE_API_URL: process.env['VITE_API_URL'],
    };
  } catch (e) {
    return undefined;
  }
}

function firstConfiguredApiUrl(env?: ApiUrlRuntimeEnv): string | undefined {
  const configured = env?.NEXT_PUBLIC_API_URL ?? env?.VITE_API_URL;
  const configuredUrl = readTrimmedString(configured);
  return configuredUrl === undefined ? undefined : trimTrailingSlashes(configuredUrl);
}

function firstConfiguredApiOrigin(env?: ApiUrlRuntimeEnv): string | undefined {
  const configuredOrigin = readTrimmedString(env?.API_ORIGIN);
  return configuredOrigin === undefined ? undefined : trimTrailingSlashes(configuredOrigin);
}

function browserApiUrl(): string | undefined {
  try {
    if (typeof window === 'undefined') {
      return undefined;
    }
    const origin = readTrimmedString(window.location?.origin);
    if (!origin || origin === 'null') {
      return undefined;
    }
    return `${trimTrailingSlashes(origin)}/api`;
  } catch {
    return undefined;
  }
}

/**
 * Resolve the full API URL including the /api prefix.
 * Reads explicit runtime env first, then process env for Next.js/Vite.
 * Browser builds use the current origin so production cannot silently call localhost.
 */
export function resolveApiUrl(env?: ApiUrlRuntimeEnv): string {
  return (
    firstConfiguredApiUrl(env) ??
    firstConfiguredApiUrl(readProcessEnv()) ??
    browserApiUrl() ??
    DEFAULT_API_URL
  );
}

/**
 * Resolve the API origin (without /api suffix).
 * Used for constructing asset URLs like /uploads/...
 */
export function resolveApiOrigin(env?: ApiUrlRuntimeEnv): string {
  return (
    firstConfiguredApiOrigin(env) ??
    firstConfiguredApiOrigin(readProcessEnv()) ??
    stripApiSuffix(resolveApiUrl(env))
  );
}

/**
 * Build a full API endpoint URL from a GHS_API request path.
 */
export function toApiUrl(requestPath: string, env?: ApiUrlRuntimeEnv): string {
  return joinApiBaseAndPath(resolveApiOrigin(env), requestPath);
}

/**
 * Convert a relative asset path to a full URL via the API origin.
 *
 * Rules:
 * - null/undefined → undefined
 * - Absolute URLs (http://, https://, //) → pass through
 * - /uploads/... → prepend apiOrigin
 * - uploads/... → prepend apiOrigin + /
 * - /anything → strip leading slash (relative to public root)
 * - anything else → return as-is
 *
 * @param path   - The raw asset path from API data
 * @param apiOrigin - Explicit API origin; defaults to resolveApiOrigin()
 */
export function toAssetUrl(path: string | null | undefined, apiOrigin?: string): string | undefined {
  return toCommonAssetUrl(path, apiOrigin ?? resolveApiOrigin());
}
