import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  ApiClientError,
  buildJsonApiUrl,
  createJsonApiClient,
  unwrapJsonApiPayload,
} from './index';

describe('platform-api-client URL handling', () => {
  it('joins base URLs, paths, and query params through the platform contract helpers', () => {
    assert.equal(
      buildJsonApiUrl('https://api.example.test/api/', '/v2/products', {
        page: 2,
        q: 'tea cup',
        empty: '',
        missing: undefined,
      }),
      'https://api.example.test/api/v2/products?page=2&q=tea+cup',
    );
  });

  it('keeps absolute request URLs intact before appending query params', () => {
    assert.equal(
      buildJsonApiUrl('https://ignored.test', 'https://cdn.example.test/items', { page: 1 }),
      'https://cdn.example.test/items?page=1',
    );
  });
});

describe('platform-api-client JSON requests', () => {
  it('injects auth headers and unwraps successful API envelopes', async () => {
    const calls: Array<{ input: string; init?: RequestInit }> = [];
    const client = createJsonApiClient({
      baseUrl: 'https://api.example.test',
      getAuthToken: () => ' token-1 ',
      fetchImpl: async (input, init) => {
        calls.push({ input: String(input), init });
        return new Response(JSON.stringify({ success: true, data: { ok: true } }), { status: 200 });
      },
    });

    const result = await client.post<{ ok: boolean }>('/orders', { sku: 'A1' });

    assert.deepEqual(result, { ok: true });
    assert.equal(calls[0]?.input, 'https://api.example.test/orders');
    assert.equal(calls[0]?.init?.method, 'POST');
    assert.equal((calls[0]?.init?.headers as Headers).get('Authorization'), 'Bearer token-1');
    assert.equal((calls[0]?.init?.headers as Headers).get('Content-Type'), 'application/json');
    assert.equal(calls[0]?.init?.body, JSON.stringify({ sku: 'A1' }));
  });

  it('allows auth suppression per request', async () => {
    let headers: Headers | undefined;
    const client = createJsonApiClient({
      baseUrl: 'https://api.example.test',
      getAuthToken: () => 'token-1',
      fetchImpl: async (_input, init) => {
        headers = init?.headers as Headers;
        return new Response(JSON.stringify({ data: { ok: true } }), { status: 200 });
      },
    });

    await client.get('/public', undefined, { withAuth: false });

    assert.equal(headers?.has('Authorization'), false);
  });

  it('throws structured errors for non-2xx responses', async () => {
    const client = createJsonApiClient({
      baseUrl: 'https://api.example.test',
      fetchImpl: async () =>
        new Response(
          JSON.stringify({ success: false, error: { code: 'NOT_FOUND', message: 'Missing item' } }),
          { status: 404 },
        ),
    });

    await assert.rejects(
      () => client.get('/missing'),
      (error) => {
        assert.equal(error instanceof ApiClientError, true);
        assert.equal((error as ApiClientError).status, 404);
        assert.equal((error as ApiClientError).code, 'NOT_FOUND');
        assert.equal((error as Error).message, 'Missing item');
        return true;
      },
    );
  });

  it('throws structured errors for success=false envelopes returned with 2xx status', async () => {
    const client = createJsonApiClient({
      baseUrl: 'https://api.example.test',
      fetchImpl: async () =>
        new Response(
          JSON.stringify({ success: false, error: { code: 'VALIDATION', message: 'Invalid payload' } }),
          { status: 200 },
        ),
    });

    await assert.rejects(
      () => client.post('/orders', {}),
      (error) => {
        assert.equal(error instanceof ApiClientError, true);
        assert.equal((error as ApiClientError).status, 200);
        assert.equal((error as ApiClientError).code, 'VALIDATION');
        assert.equal((error as Error).message, 'Invalid payload');
        return true;
      },
    );
  });
});

describe('platform-api-client payload unwrap', () => {
  it('unwraps API envelopes without a fetch Response', () => {
    assert.deepEqual(
      unwrapJsonApiPayload<{ ok: boolean }>({ success: true, data: { ok: true } }, 'axios.payload', 202),
      { ok: true },
    );
  });

  it('throws ApiClientError with caller-supplied status for success=false payloads', () => {
    assert.throws(
      () =>
        unwrapJsonApiPayload(
          { success: false, error: { code: 'FORBIDDEN', message: 'Denied' } },
          'axios.payload',
          403,
        ),
      (error) => {
        assert.equal(error instanceof ApiClientError, true);
        assert.equal((error as ApiClientError).status, 403);
        assert.equal((error as ApiClientError).code, 'FORBIDDEN');
        assert.equal((error as Error).message, 'Denied');
        return true;
      },
    );
  });
});
