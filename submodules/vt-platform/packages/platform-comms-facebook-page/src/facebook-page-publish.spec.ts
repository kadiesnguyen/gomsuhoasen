import {
  FACEBOOK_PAGE_PUBLISH_PUBLIC_ERROR_MESSAGES,
  FacebookPagePublishClient,
} from './facebook-page-publish';

describe('FacebookPagePublishClient', () => {
  it('maps successful publish responses and builds the graph payload', async () => {
    const fetchJson = vi.fn().mockResolvedValue({ id: '123_456' });
    const client = new FacebookPagePublishClient({ fetchJson }, { maxBodyLength: 10 });

    await expect(client.publish({
      pageId: 'page-001',
      accessToken: 'token-abc',
      content: {
        title: 'Launch',
        body: '0123456789-truncated',
        callToAction: 'Read more',
        tags: ['news', 'launch'],
        imageUrl: 'https://cdn.example.com/image.png',
      },
      scheduledAt: '2026-05-16T10:30:00.000Z',
    })).resolves.toEqual({
      success: true,
      externalPostId: '123_456',
      externalUrl: 'https://www.facebook.com/123/posts/456',
    });

    expect(fetchJson).toHaveBeenCalledWith(
      'https://graph.facebook.com/v19.0/page-001/feed',
      expect.objectContaining({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer token-abc',
        },
      }),
    );

    const body = JSON.parse(fetchJson.mock.calls[0][1].body as string) as Record<string, unknown>;
    expect(body).toMatchObject({
      link: 'https://cdn.example.com/image.png',
      published: false,
      scheduled_publish_time: 1778927400,
    });
    expect(body['message']).toBe('Launch\n\n0123456789\n\nRead more\n\n#news #launch');
  });

  it('returns explicit vendor failures from Graph API error payloads', async () => {
    const client = new FacebookPagePublishClient({
      fetchJson: vi.fn().mockResolvedValue({
        error: { code: 401, message: 'Invalid OAuth access token.' },
      }),
    });

    await expect(client.publish({
      pageId: 'page-001',
      accessToken: 'bad-token',
      content: { title: 'Launch', body: 'Body text' },
    })).resolves.toEqual({
      success: false,
      vendorErrorCode: 401,
      vendorMessage: 'Invalid OAuth access token.',
    });
  });

  it('throws a contract error for invalid response envelopes', async () => {
    const client = new FacebookPagePublishClient({
      fetchJson: vi.fn().mockResolvedValue({ ok: true }),
    });

    await expect(client.publish({
      pageId: 'page-001',
      accessToken: 'token-abc',
      content: { title: 'Launch', body: 'Body text' },
    })).rejects.toThrow(FACEBOOK_PAGE_PUBLISH_PUBLIC_ERROR_MESSAGES.RESPONSE_ENVELOPE_INVALID);
  });

  it('throws a contract error for malformed Graph API error payloads', async () => {
    const client = new FacebookPagePublishClient({
      fetchJson: vi.fn().mockResolvedValue({ error: true }),
    });

    await expect(client.publish({
      pageId: 'page-001',
      accessToken: 'token-abc',
      content: { title: 'Launch', body: 'Body text' },
    })).rejects.toThrow(FACEBOOK_PAGE_PUBLISH_PUBLIC_ERROR_MESSAGES.ERROR_PAYLOAD_INVALID);
  });

  it('returns false when credential validation transport fails', async () => {
    const client = new FacebookPagePublishClient({
      fetchJson: vi.fn().mockRejectedValue(new Error('timeout')),
    });

    await expect(client.validateCredentials('page-001', 'token-abc')).resolves.toBe(false);
  });
});
