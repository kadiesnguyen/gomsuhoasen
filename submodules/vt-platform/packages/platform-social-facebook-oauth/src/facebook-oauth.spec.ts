import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  FACEBOOK_OAUTH_ENDPOINTS,
  FACEBOOK_OAUTH_ERROR_CODE,
  FACEBOOK_OAUTH_ERROR_MESSAGES,
  FacebookOAuthClient,
  FacebookOAuthError,
  type FacebookOAuthHttpClient,
} from './facebook-oauth';

function createHttp(overrides: Partial<FacebookOAuthHttpClient> = {}): FacebookOAuthHttpClient {
  return {
    get: async <T = unknown>() => ({ data: {} as T }),
    ...overrides,
  };
}

describe('FacebookOAuthClient', () => {
  it('exchanges authorization code for an access token', async () => {
    const client = new FacebookOAuthClient(createHttp({
      get: async <T = unknown>(url: string, config?: { params?: Record<string, string> }) => {
        assert.equal(url, FACEBOOK_OAUTH_ENDPOINTS.ACCESS_TOKEN);
        assert.deepEqual(config?.params, {
          client_id: 'app-id',
          client_secret: 'app-secret',
          redirect_uri: 'https://example.com/callback',
          code: 'auth-code',
        });
        return { data: { access_token: 'facebook-token' } as T };
      },
    }));

    assert.equal(await client.exchangeAuthorizationCode({
      appId: 'app-id',
      appSecret: 'app-secret',
      code: 'auth-code',
      redirectUri: 'https://example.com/callback',
    }), 'facebook-token');
  });

  it('throws typed error when token payload is missing access token', async () => {
    const client = new FacebookOAuthClient(createHttp({
      get: async <T = unknown>() => ({ data: {} as T }),
    }));

    await assert.rejects(
      () => client.exchangeAuthorizationCode({
        appId: 'app-id',
        appSecret: 'app-secret',
        code: 'auth-code',
        redirectUri: 'https://example.com/callback',
      }),
      (error) => error instanceof FacebookOAuthError
        && error.code === FACEBOOK_OAUTH_ERROR_CODE.ACCESS_TOKEN_MISSING
        && error.message === FACEBOOK_OAUTH_ERROR_MESSAGES.ACCESS_TOKEN_MISSING,
    );
  });

  it('fetches profile with expected fields and access token params', async () => {
    const client = new FacebookOAuthClient(createHttp({
      get: async <T = unknown>(url: string, config?: { params?: Record<string, string> }) => {
        assert.equal(url, FACEBOOK_OAUTH_ENDPOINTS.PROFILE);
        assert.deepEqual(config?.params, { fields: 'id,name,email', access_token: 'facebook-token' });
        return { data: { id: 'facebook-user-1', email: 'user@example.com', name: 'Facebook User' } as T };
      },
    }));

    assert.deepEqual(await client.fetchProfile('facebook-token'), {
      id: 'facebook-user-1',
      email: 'user@example.com',
      name: 'Facebook User',
    });
  });

  it('refreshes long-lived access tokens through the configured graph version', async () => {
    const client = new FacebookOAuthClient(createHttp({
      get: async <T = unknown>(url: string, config?: { params?: Record<string, string> }) => {
        assert.equal(url, 'https://graph.facebook.com/v21.0/oauth/access_token');
        assert.deepEqual(config?.params, {
          grant_type: 'fb_exchange_token',
          client_id: 'client-id',
          client_secret: 'client-secret',
          fb_exchange_token: 'current-token',
        });
        return { data: { access_token: 'next-token', expires_in: 3600 } as T };
      },
    }));

    assert.deepEqual(await client.refreshLongLivedAccessToken({
      clientId: 'client-id',
      clientSecret: 'client-secret',
      currentToken: 'current-token',
      graphApiVersion: 'v21.0',
    }), {
      accessToken: 'next-token',
      expiresIn: 3600,
    });
  });

  it('exchanges authorization code with explicit graph API version and returns token metadata', async () => {
    const client = new FacebookOAuthClient(createHttp({
      get: async <T = unknown>(url: string, config?: { params?: Record<string, string> }) => {
        assert.equal(url, 'https://graph.facebook.com/v21.0/oauth/access_token');
        assert.equal(config?.params?.code, 'auth-code');
        return { data: { access_token: 'token', expires_in: 120, token_type: 'bearer' } as T };
      },
    }));

    assert.deepEqual(await client.exchangeAuthorizationCodeForToken({
      appId: 'app-id',
      appSecret: 'app-secret',
      code: 'auth-code',
      redirectUri: 'https://example.com/callback',
      graphApiVersion: 'v21.0',
    }), {
      accessToken: 'token',
      expiresIn: 120,
      tokenType: 'bearer',
      refreshToken: undefined,
    });
  });

  it('debugs and revokes tokens through graph lifecycle endpoints', async () => {
    const calls: string[] = [];
    const client = new FacebookOAuthClient({
      get: async <T = unknown>(url: string, config?: { params?: Record<string, string> }) => {
        calls.push(url);
        assert.equal(config?.params?.input_token, 'input-token');
        assert.equal(config?.params?.access_token, 'app-id|app-secret');
        return { data: { data: { is_valid: true, expires_at: 123 } } as T };
      },
      delete: async <T = unknown>(url: string, config?: { params?: Record<string, string> }) => {
        calls.push(url);
        assert.equal(config?.params?.access_token, 'access-token');
        return { data: {} as T };
      },
    });

    assert.deepEqual(await client.debugToken({
      inputToken: 'input-token',
      appId: 'app-id',
      appSecret: 'app-secret',
      graphApiVersion: 'v21.0',
    }), {
      isValid: true,
      expiresAt: 123,
    });
    await client.revokePermissions({ accessToken: 'access-token', graphApiVersion: 'v21.0' });
    assert.deepEqual(calls, [
      'https://graph.facebook.com/v21.0/debug_token',
      'https://graph.facebook.com/v21.0/me/permissions',
    ]);
  });

  it('throws typed error when profile has no id', async () => {
    const client = new FacebookOAuthClient(createHttp({
      get: async <T = unknown>() => ({ data: { email: 'user@example.com' } as T }),
    }));

    await assert.rejects(
      () => client.fetchProfile('facebook-token'),
      (error) => error instanceof FacebookOAuthError
        && error.code === FACEBOOK_OAUTH_ERROR_CODE.PROFILE_INVALID
        && error.message === FACEBOOK_OAUTH_ERROR_MESSAGES.PROFILE_MISSING_ID,
    );
  });
});
