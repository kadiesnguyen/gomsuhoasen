import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  FACEBOOK_MESSENGER_HTTP_STATUS,
  FacebookMessengerClient,
  FacebookMessengerHttpError,
  FacebookMessengerInputError,
  type FacebookMessengerTransportPort,
} from './facebook-messenger';

function response(ok: boolean, status: number, body: unknown) {
  return { ok, status, json: async () => body };
}

describe('FacebookMessengerClient', () => {
  it('sends text message through Facebook Send API', async () => {
    let captured: { url: string; init: { body: string } } | undefined;
    const transport: FacebookMessengerTransportPort = {
      fetch: async (url, init) => {
        captured = { url, init };
        return response(true, FACEBOOK_MESSENGER_HTTP_STATUS.OK, { message_id: 'mid.1' });
      },
    };

    await new FacebookMessengerClient(transport).send({
      accessToken: 'access-token',
      recipientId: 'psid-1',
      type: 'text',
      text: 'Hello',
    });

    assert.match(captured?.url ?? '', /^https:\/\/graph\.facebook\.com\/v21\.0\/me\/messages\?/);
    assert.match(captured?.url ?? '', /access_token=access-token/);
    assert.deepEqual(JSON.parse(captured?.init.body ?? '{}'), {
      messaging_type: 'RESPONSE',
      recipient: { id: 'psid-1' },
      message: { text: 'Hello' },
    });
  });

  it('builds image and file attachment payloads', () => {
    const client = new FacebookMessengerClient({
      fetch: async () => response(true, FACEBOOK_MESSENGER_HTTP_STATUS.OK, {}),
    });

    assert.deepEqual(client.buildBody({
      accessToken: 'token',
      recipientId: 'psid-1',
      type: 'file',
      mediaUrl: 'https://cdn.example.com/doc.pdf',
    }), {
      messaging_type: 'RESPONSE',
      recipient: { id: 'psid-1' },
      message: {
        attachment: {
          type: 'file',
          payload: {
            url: 'https://cdn.example.com/doc.pdf',
            is_reusable: true,
          },
        },
      },
    });
  });

  it('rejects text messages without non-empty text', () => {
    const client = new FacebookMessengerClient({
      fetch: async () => response(true, FACEBOOK_MESSENGER_HTTP_STATUS.OK, {}),
    });

    assert.throws(
      () => client.buildBody({
        accessToken: 'token',
        recipientId: 'psid-1',
        type: 'text',
      }),
      (error) => error instanceof FacebookMessengerInputError && error.code === 'FACEBOOK_MESSAGE_TEXT_REQUIRED',
    );

    assert.throws(
      () => client.buildBody({
        accessToken: 'token',
        recipientId: 'psid-1',
        type: 'text',
        text: '   ',
      }),
      (error) => error instanceof FacebookMessengerInputError && error.code === 'FACEBOOK_MESSAGE_TEXT_REQUIRED',
    );
  });

  it('rejects media messages without non-empty media URL', () => {
    const client = new FacebookMessengerClient({
      fetch: async () => response(true, FACEBOOK_MESSENGER_HTTP_STATUS.OK, {}),
    });

    assert.throws(
      () => client.buildBody({
        accessToken: 'token',
        recipientId: 'psid-1',
        type: 'image',
      }),
      (error) => error instanceof FacebookMessengerInputError && error.code === 'FACEBOOK_MESSAGE_MEDIA_URL_REQUIRED',
    );
  });

  it('throws typed HTTP errors with parsed provider detail', async () => {
    await assert.rejects(
      () => new FacebookMessengerClient({
        fetch: async () => response(false, FACEBOOK_MESSENGER_HTTP_STATUS.BAD_REQUEST, {
          error: { code: 100, message: 'Invalid PSID' },
        }),
      }, { maxRetries: 0 }).send({
        accessToken: 'token',
        recipientId: 'psid-1',
        type: 'text',
        text: 'Hello',
      }),
      (error) => error instanceof FacebookMessengerHttpError
        && error.status === FACEBOOK_MESSENGER_HTTP_STATUS.BAD_REQUEST
        && /Invalid PSID/.test(error.detail),
    );
  });
});
