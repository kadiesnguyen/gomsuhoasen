import { ZaloOaPublishClient, ZaloOaResponseContractError } from './zalo-oa-publish';

describe('platform-comms-zalo-oa', () => {
  it('maps successful article publish responses', async () => {
    const fetchJson = vi.fn().mockResolvedValue({
      error: 0,
      data: { token: 'article-001' },
    });
    const client = new ZaloOaPublishClient({ fetchJson });

    await expect(client.publish({
      oaId: 'oa-001',
      accessToken: 'token-abc',
      content: {
        title: 'Launch',
        body: 'Body text',
        imageUrl: 'https://cdn.example.com/banner.png',
        callToAction: 'Read more',
        tags: ['launch', 'promo'],
      },
      scheduledAt: '2026-05-16T08:00:00.000Z',
    })).resolves.toEqual({
      success: true,
      externalPostId: 'article-001',
      externalUrl: 'https://oa.zalo.me/article/article-001',
    });

    expect(fetchJson).toHaveBeenCalledWith(
      'https://openapi.zalo.me/v2.0/oa/article/create',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ access_token: 'token-abc' }),
        body: expect.any(String),
      }),
    );
  });

  it('returns vendor failures without throwing', async () => {
    const client = new ZaloOaPublishClient({
      fetchJson: vi.fn().mockResolvedValue({
        error: 401,
        message: 'Invalid token',
      }),
    });

    await expect(client.publish({
      oaId: 'oa-001',
      accessToken: 'bad-token',
      content: { title: 'Launch', body: 'Body text' },
    })).resolves.toEqual({
      success: false,
      vendorErrorCode: 401,
      vendorMessage: 'Invalid token',
    });
  });

  it('throws stable contract errors for invalid response shapes', async () => {
    const client = new ZaloOaPublishClient({
      fetchJson: vi.fn().mockResolvedValue({ message: 'missing error code' }),
    });

    await expect(client.publish({
      oaId: 'oa-001',
      accessToken: 'token-abc',
      content: { title: 'Launch', body: 'Body text' },
    })).rejects.toThrow(new ZaloOaResponseContractError('Zalo API returned an invalid response envelope'));
  });

  it('returns false when credential validation transport fails', async () => {
    const client = new ZaloOaPublishClient({
      fetchJson: vi.fn().mockRejectedValue(new Error('timeout')),
    });

    await expect(client.validateCredentials('oa-001', 'token-abc')).resolves.toBe(false);
  });
});
