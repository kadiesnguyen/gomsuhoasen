import { buildJsonApiUrl, parseJsonApiResponse } from '@vt/platform-api-client';
import { expectApiArray, expectApiObject, resolveApiOrigin } from '@gomhoasen/contracts';

// In Vite, env vars are exposed via import.meta.env
// For development, we fallback to resolveApiOrigin() if VITE_API_URL is not set.
function getApiBase() {
  return resolveApiOrigin({
    VITE_API_URL:
      typeof import.meta !== 'undefined' && import.meta.env
        ? import.meta.env.VITE_API_URL
        : undefined,
  });
}

export async function fetchOptionalApiData<T>(
  requestPath: string,
  source: string,
  init?: RequestInit,
): Promise<T | null> {
  try {
    const apiBase = getApiBase();
    const response = await fetch(buildJsonApiUrl(apiBase, requestPath), init);
    if (!response.ok) return null;
    return await parseJsonApiResponse<T>(response, source);
  } catch (error) {
    console.error(`[Showroom V2 API] Failed to fetch ${requestPath}`, error);
    return null;
  }
}

export async function fetchOptionalApiObject<T>(
  requestPath: string,
  source: string,
  init?: RequestInit,
): Promise<T | null> {
  const payload = await fetchOptionalApiData<unknown>(requestPath, source, init);
  return payload === null ? null : expectApiObject<T>(payload, source);
}

export async function fetchOptionalApiArray<T>(
  requestPath: string,
  source: string,
  init?: RequestInit,
): Promise<T[]> {
  const payload = await fetchOptionalApiData<unknown>(requestPath, source, init);
  return payload === null ? [] : expectApiArray<T>(payload, source);
}
