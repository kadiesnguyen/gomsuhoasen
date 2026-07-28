import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  ZALO_CS_HTTP_STATUS,
  ZaloCsClient,
  ZaloCsHttpError,
  ZaloCsInputError,
  ZaloCsProviderError,
  type ZaloCsTransportPort,
} from './zalo-cs';

function response(ok: boolean, status: number, body: unknown) {
  return { ok, status, json: async () => body };
}

describe('ZaloCsClient', () => {
  it('sends text message through Zalo CS endpoint', async () => {
    let captured: { url: string; init: { headers: Record<string, string>; body: string } } | undefined;
    const transport: ZaloCsTransportPort = {
      fetch: async (url, init) => {
        captured = { url, init };
        return response(true, ZALO_CS_HTTP_STATUS.OK, { error: 0 });
      },
    };

    await new ZaloCsClient(transport).send({
      accessToken: 'access-token',
      recipientId: 'user-1',
      type: 'text',
      text: 'Hello',
    });

    assert.equal(captured?.url, 'https://openapi.zalo.me/v3.0/oa/message/cs');
    assert.equal(captured?.init.headers.access_token, 'access-token');
    assert.deepEqual(JSON.parse(captured?.init.body ?? '{}'), {
      recipient: { user_id: 'user-1' },
      message: { text: 'Hello' },
    });
  });

  it('builds media payloads for images and files', () => {
    const client = new ZaloCsClient({
      fetch: async () => response(true, ZALO_CS_HTTP_STATUS.OK, { error: 0 }),
    });

    assert.deepEqual(client.buildBody({
      accessToken: 'token',
      recipientId: 'user-1',
      type: 'image',
      mediaUrl: 'https://cdn.example.com/image.jpg',
    }), {
      recipient: { user_id: 'user-1' },
      message: {
        attachment: {
          type: 'template',
          payload: {
            template_type: 'media',
            elements: [{ media_type: 'image', url: 'https://cdn.example.com/image.jpg' }],
          },
        },
      },
    });
  });

  it('rejects text messages without non-empty text', () => {
    const client = new ZaloCsClient({
      fetch: async () => response(true, ZALO_CS_HTTP_STATUS.OK, { error: 0 }),
    });

    assert.throws(
      () => client.buildBody({
        accessToken: 'token',
        recipientId: 'user-1',
        type: 'text',
      }),
      (error) => error instanceof ZaloCsInputError && error.code === 'ZALO_CS_MESSAGE_TEXT_REQUIRED',
    );

    assert.throws(
      () => client.buildBody({
        accessToken: 'token',
        recipientId: 'user-1',
        type: 'text',
        text: '   ',
      }),
      (error) => error instanceof ZaloCsInputError && error.code === 'ZALO_CS_MESSAGE_TEXT_REQUIRED',
    );
  });

  it('rejects media messages without non-empty media URL', () => {
    const client = new ZaloCsClient({
      fetch: async () => response(true, ZALO_CS_HTTP_STATUS.OK, { error: 0 }),
    });

    assert.throws(
      () => client.buildBody({
        accessToken: 'token',
        recipientId: 'user-1',
        type: 'file',
      }),
      (error) => error instanceof ZaloCsInputError && error.code === 'ZALO_CS_MESSAGE_MEDIA_URL_REQUIRED',
    );
  });

  it('throws typed errors for HTTP and provider failures', async () => {
    await assert.rejects(
      () => new ZaloCsClient({
        fetch: async () => response(false, ZALO_CS_HTTP_STATUS.INTERNAL_SERVER_ERROR, {
          error: -1,
          message: 'Server error',
        }),
      }, { maxRetries: 0 }).send({
        accessToken: 'token',
        recipientId: 'user-1',
        type: 'text',
        text: 'Hello',
      }),
      (error) => error instanceof ZaloCsHttpError
        && error.status === ZALO_CS_HTTP_STATUS.INTERNAL_SERVER_ERROR,
    );

    await assert.rejects(
      () => new ZaloCsClient({
        fetch: async () => response(true, ZALO_CS_HTTP_STATUS.OK, {
          error: -216,
          message: 'User blocked OA',
        }),
      }).send({
        accessToken: 'token',
        recipientId: 'user-1',
        type: 'text',
        text: 'Hello',
      }),
      (error) => error instanceof ZaloCsProviderError && error.vendorErrorCode === -216,
    );
  });
});
