import {
  TELEGRAM_BOT_PUBLISH_PUBLIC_ERROR_MESSAGES,
  TelegramBotPublishClient,
  TelegramBotResponseContractError,
} from './telegram-bot-publish';

describe('TelegramBotPublishClient', () => {
  it('publishes a message and keeps public-channel URL semantics', async () => {
    const fetch = vi.fn()
      .mockResolvedValueOnce({
        status: 200,
        body: { ok: true, result: { message_id: 55 } },
      })
      .mockResolvedValueOnce({
        status: 200,
        body: { ok: true, result: { message_id: 77 } },
      });
    const client = new TelegramBotPublishClient({ fetch });

    const result = await client.publish({
      chatId: '@demo_channel',
      botToken: 'bot-token',
      content: {
        title: 'Launch',
        body: 'Body',
        imageUrl: 'https://cdn.example.com/img.png',
      },
    });

    expect(result).toEqual({
      success: true,
      externalPostId: '55',
      externalUrl: 'https://t.me/demo_channel/77',
    });
  });

  it('truncates caption/message and escapes title HTML', async () => {
    const fetch = vi.fn()
      .mockResolvedValueOnce({
        status: 200,
        body: { ok: true, result: { message_id: 1 } },
      })
      .mockResolvedValueOnce({
        status: 200,
        body: { ok: true, result: { message_id: 2 } },
      });
    const client = new TelegramBotPublishClient({ fetch }, { messageMaxLength: 20, captionMaxLength: 5 });

    await client.publish({
      chatId: '@demo_channel',
      botToken: 'bot-token',
      content: {
        title: '<Launch title>',
        body: 'Body goes long',
        imageUrl: 'https://cdn.example.com/img.png',
        callToAction: 'Read more',
      },
    });

    expect(fetch).toHaveBeenNthCalledWith(
      1,
      'https://api.telegram.org/botbot-token/sendPhoto',
      expect.objectContaining({
        body: JSON.stringify({
          chat_id: '@demo_channel',
          photo: 'https://cdn.example.com/img.png',
          caption: '<Laun',
          parse_mode: 'HTML',
        }),
      }),
    );
    expect(fetch).toHaveBeenNthCalledWith(
      2,
      'https://api.telegram.org/botbot-token/sendMessage',
      expect.objectContaining({
        body: JSON.stringify({
          chat_id: '@demo_channel',
          text: '<b>&lt;Launch title&',
          parse_mode: 'HTML',
          disable_web_page_preview: true,
        }),
      }),
    );
  });

  it('returns vendor-declared failures for sendMessage errors', async () => {
    const fetch = vi.fn().mockResolvedValue({
      status: 429,
      body: {
        ok: false,
        description: 'Too many requests',
        error_code: 429,
      },
    });
    const client = new TelegramBotPublishClient({ fetch });

    await expect(client.publish({
      chatId: '@demo_channel',
      botToken: 'bot-token',
      content: {
        title: 'Launch',
        body: 'Body',
      },
    })).resolves.toEqual({
      success: false,
      vendorErrorCode: 429,
      vendorMessage: 'Too many requests',
    });
  });

  it('throws stable contract errors for invalid envelopes and missing message ids', async () => {
    const invalidEnvelopeClient = new TelegramBotPublishClient({
      fetch: async () => ({
        status: 200,
        body: [],
      }),
    });
    const missingMessageIdClient = new TelegramBotPublishClient({
      fetch: async () => ({
        status: 200,
        body: { ok: true, result: {} },
      }),
    });

    await expect(invalidEnvelopeClient.publish({
      chatId: '@demo_channel',
      botToken: 'bot-token',
      content: { title: 'Launch', body: 'Body' },
    })).rejects.toThrow(new TelegramBotResponseContractError(
      TELEGRAM_BOT_PUBLISH_PUBLIC_ERROR_MESSAGES.RESPONSE_ENVELOPE_INVALID,
    ));

    await expect(missingMessageIdClient.publish({
      chatId: '@demo_channel',
      botToken: 'bot-token',
      content: { title: 'Launch', body: 'Body' },
    })).rejects.toThrow(new TelegramBotResponseContractError(
      TELEGRAM_BOT_PUBLISH_PUBLIC_ERROR_MESSAGES.SUCCESS_MESSAGE_ID_MISSING,
    ));
  });

  it('returns false for invalid credential payloads or transport failures', async () => {
    const invalidPayloadClient = new TelegramBotPublishClient({
      fetch: async () => ({
        status: 200,
        body: { ok: false },
      }),
    });
    const failingClient = new TelegramBotPublishClient({
      fetch: async () => {
        throw new Error('boom');
      },
    });

    await expect(invalidPayloadClient.validateCredentials('bot-token')).resolves.toBe(false);
    await expect(failingClient.validateCredentials('bot-token')).resolves.toBe(false);
  });
});
