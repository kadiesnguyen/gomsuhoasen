import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  createZaloAppSecretProof,
  normalizeVietnamPhoneE164,
  ZALO_OAUTH_ENDPOINTS,
  ZALO_OAUTH_ERROR_CODE,
  ZALO_OAUTH_ERROR_MESSAGES,
  ZaloOAuthClient,
  ZaloOAuthError,
  type ZaloOAuthHttpClient,
} from './zalo-oauth';

function createHttp(overrides: Partial<ZaloOAuthHttpClient> = {}): ZaloOAuthHttpClient {
  return {
    get: async <T = unknown>() => ({ data: {} as T }),
    post: async <T = unknown>() => ({ data: {} as T }),
    ...overrides,
  };
}

describe('ZaloOAuthClient', () => {
  it('creates deterministic appsecret_proof values', () => {
    assert.equal(
      createZaloAppSecretProof('access-token', 'secret'),
      createZaloAppSecretProof('access-token', 'secret'),
    );
    assert.notEqual(
      createZaloAppSecretProof('access-token', 'secret'),
      createZaloAppSecretProof('access-token-2', 'secret'),
    );
  });

  it('exchanges authorization code for an access token', async () => {
    let capturedBody = '';
    const client = new ZaloOAuthClient(createHttp({
      post: async <T = unknown>(url: string, body?: unknown) => {
        assert.equal(url, ZALO_OAUTH_ENDPOINTS.ACCESS_TOKEN);
        capturedBody = String(body);
        return { data: { access_token: 'zalo-token' } as T };
      },
    }));

    const token = await client.exchangeAuthorizationCode({
      appId: 'app-id',
      appSecret: 'secret',
      code: 'auth-code',
      codeVerifier: 'verifier',
      redirectUri: 'https://example.com/callback',
    });

    assert.equal(token, 'zalo-token');
    assert.match(capturedBody, /grant_type=authorization_code/);
    assert.match(capturedBody, /app_id=app-id/);
  });

  it('verifies an access token and returns profile payload', async () => {
    const client = new ZaloOAuthClient(createHttp({
      get: async <T = unknown>(url: string, config?: { params?: Record<string, string> }) => {
        assert.equal(url, ZALO_OAUTH_ENDPOINTS.PROFILE);
        assert.equal(config?.params?.fields, 'id,name,picture');
        assert.equal(config?.params?.access_token, 'zalo-token');
        assert.ok(config?.params?.appsecret_proof);
        return { data: { id: 'zalo-user-1', name: 'Zalo User' } as T };
      },
    }));

    assert.deepEqual(await client.verifyAccessToken('zalo-token', 'secret'), {
      id: 'zalo-user-1',
      name: 'Zalo User',
    });
  });

  it('refreshes OA access tokens using the dedicated OA token endpoint', async () => {
    let capturedBody = '';
    const client = new ZaloOAuthClient(createHttp({
      post: async <T = unknown>(url: string, body?: unknown) => {
        assert.equal(url, ZALO_OAUTH_ENDPOINTS.OA_ACCESS_TOKEN);
        capturedBody = String(body);
        return { data: { access_token: 'access-token', refresh_token: 'next-refresh', expires_in: 3600 } as T };
      },
    }));

    assert.deepEqual(await client.refreshOaAccessToken({
      appId: 'app-id',
      appSecret: 'secret',
      refreshToken: 'refresh-token',
    }), {
      accessToken: 'access-token',
      refreshToken: 'next-refresh',
      expiresIn: 3600,
    });
    assert.match(capturedBody, /grant_type=refresh_token/);
    assert.match(capturedBody, /refresh_token=refresh-token/);
  });

  it('normalizes provider rejected responses into typed errors', async () => {
    const client = new ZaloOAuthClient(createHttp({
      get: async <T = unknown>() => ({ data: { error: 'invalid_token', message: 'Invalid token' } as T }),
    }));

    await assert.rejects(
      () => client.verifyAccessToken('bad-token', 'secret'),
      (error) => error instanceof ZaloOAuthError && error.code === ZALO_OAUTH_ERROR_CODE.PROVIDER_REJECTED,
    );
  });

  it('exchanges phone tokens and normalizes Vietnamese E164 values', async () => {
    const client = new ZaloOAuthClient(createHttp({
      get: async <T = unknown>(url: string) => {
        assert.equal(url, ZALO_OAUTH_ENDPOINTS.PHONE);
        return { data: { data: { number: ' 0901234567 ' } } as T };
      },
    }));

    assert.deepEqual(await client.exchangePhoneToken({
      phoneToken: 'phone-token',
      accessToken: 'zalo-token',
      appSecret: 'secret',
    }), {
      phoneNumber: '0901234567',
      phoneNumberE164: '84901234567',
    });
  });

  it('rejects phone token responses without a non-empty number', async () => {
    const client = new ZaloOAuthClient(createHttp({
      get: async <T = unknown>() => ({ data: { data: { number: '' } } as T }),
    }));

    await assert.rejects(
      () => client.exchangePhoneToken({
        phoneToken: 'phone-token',
        accessToken: 'zalo-token',
        appSecret: 'secret',
      }),
      (error) => error instanceof ZaloOAuthError
        && error.code === ZALO_OAUTH_ERROR_CODE.PHONE_INVALID
        && error.message === ZALO_OAUTH_ERROR_MESSAGES.PHONE_MISSING_NUMBER,
    );
  });

  it('keeps already normalized phone numbers unchanged', () => {
    assert.equal(normalizeVietnamPhoneE164('84901234567'), '84901234567');
  });
});
