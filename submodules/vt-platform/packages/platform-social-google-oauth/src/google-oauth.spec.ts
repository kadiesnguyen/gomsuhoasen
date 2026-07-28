import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  GOOGLE_OAUTH_ENDPOINTS,
  GOOGLE_OAUTH_ERROR_CODE,
  GOOGLE_OAUTH_ERROR_MESSAGES,
  GoogleOAuthClient,
  GoogleOAuthError,
  type GoogleOAuthHttpClient,
} from './google-oauth';

function createHttp(overrides: Partial<GoogleOAuthHttpClient> = {}): GoogleOAuthHttpClient {
  return {
    get: async <T = unknown>() => ({ data: {} as T }),
    post: async <T = unknown>() => ({ data: {} as T }),
    ...overrides,
  };
}

describe('GoogleOAuthClient', () => {
  it('exchanges authorization code for an access token', async () => {
    const client = new GoogleOAuthClient(createHttp({
      post: async <T = unknown>(url: string, body?: unknown) => {
        assert.equal(url, GOOGLE_OAUTH_ENDPOINTS.ACCESS_TOKEN);
        assert.deepEqual(body, {
          code: 'auth-code',
          client_id: 'client-id',
          client_secret: 'client-secret',
          redirect_uri: 'https://example.com/callback',
          grant_type: 'authorization_code',
        });
        return { data: { access_token: 'google-token' } as T };
      },
    }));

    assert.equal(await client.exchangeAuthorizationCode({
      clientId: 'client-id',
      clientSecret: 'client-secret',
      code: 'auth-code',
      redirectUri: 'https://example.com/callback',
    }), 'google-token');
  });

  it('throws typed error when token payload is missing access token', async () => {
    const client = new GoogleOAuthClient(createHttp({
      post: async <T = unknown>() => ({ data: {} as T }),
    }));

    await assert.rejects(
      () => client.exchangeAuthorizationCode({
        clientId: 'client-id',
        clientSecret: 'client-secret',
        code: 'auth-code',
        redirectUri: 'https://example.com/callback',
      }),
      (error) => error instanceof GoogleOAuthError
        && error.code === GOOGLE_OAUTH_ERROR_CODE.ACCESS_TOKEN_MISSING
        && error.message === GOOGLE_OAUTH_ERROR_MESSAGES.ACCESS_TOKEN_MISSING,
    );
  });

  it('fetches profile with bearer token header', async () => {
    const client = new GoogleOAuthClient(createHttp({
      get: async <T = unknown>(url: string, config?: { headers?: Record<string, string> }) => {
        assert.equal(url, GOOGLE_OAUTH_ENDPOINTS.USER_INFO);
        assert.equal(config?.headers?.Authorization, 'Bearer google-token');
        return { data: { id: 'google-user-1', email: 'user@example.com', name: 'Google User' } as T };
      },
    }));

    assert.deepEqual(await client.fetchProfile('google-token'), {
      id: 'google-user-1',
      email: 'user@example.com',
      name: 'Google User',
    });
  });

  it('throws typed error when profile has no id', async () => {
    const client = new GoogleOAuthClient(createHttp({
      get: async <T = unknown>() => ({ data: { email: 'user@example.com' } as T }),
    }));

    await assert.rejects(
      () => client.fetchProfile('google-token'),
      (error) => error instanceof GoogleOAuthError
        && error.code === GOOGLE_OAUTH_ERROR_CODE.PROFILE_INVALID
        && error.message === GOOGLE_OAUTH_ERROR_MESSAGES.PROFILE_MISSING_ID,
    );
  });
});
