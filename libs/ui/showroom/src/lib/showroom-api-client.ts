import { createJsonApiClient } from '@vt/platform-api-client';
import { resolveApiOrigin } from '@gomhoasen/contracts';

const showroomJsonApiClient = createJsonApiClient({
  baseUrl: resolveApiOrigin(),
});

export function showroomApiGet<T>(path: string): Promise<T> {
  return showroomJsonApiClient.get<T>(path);
}

export function showroomApiPost<T = unknown>(path: string, body: unknown): Promise<T> {
  return showroomJsonApiClient.post<T>(path, body, { withAuth: false });
}
