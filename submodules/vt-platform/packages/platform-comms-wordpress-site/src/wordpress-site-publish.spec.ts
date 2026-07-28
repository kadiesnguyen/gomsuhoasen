import {
  WORDPRESS_SITE_PUBLISH_PUBLIC_ERROR_MESSAGES,
  WORDPRESS_SITE_HTTP_STATUS,
  WordPressSitePublishClient,
  WordPressSiteResponseContractError,
} from './wordpress-site-publish';

describe('WordPressSitePublishClient', () => {
  it('publishes a post and falls back to permalink by id when link is missing', async () => {
    const fetch = vi.fn().mockResolvedValue({
      status: WORDPRESS_SITE_HTTP_STATUS.CREATED,
      body: { id: 123 },
    });
    const client = new WordPressSitePublishClient({ fetch });

    const result = await client.publish({
      siteUrl: 'https://example.com/',
      accessToken: 'basic-token',
      content: {
        title: 'Launch',
        body: 'Body',
      },
    });

    expect(result).toEqual({
      success: true,
      externalPostId: '123',
      externalUrl: 'https://example.com/?p=123',
    });
    expect(fetch).toHaveBeenCalledWith(
      'https://example.com/wp-json/wp/v2/posts',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Basic basic-token',
        }),
      }),
    );
  });

  it('builds scheduled payloads with HTML content, tags, and truncated title', async () => {
    const fetch = vi.fn().mockResolvedValue({
      status: WORDPRESS_SITE_HTTP_STATUS.CREATED,
      body: { id: 456, link: 'https://example.com/posts/456' },
    });
    const client = new WordPressSitePublishClient({ fetch }, { titleMaxLength: 5 });

    await client.publish({
      siteUrl: 'https://example.com',
      accessToken: 'basic-token',
      scheduledAt: '2026-05-16T01:00:00.000Z',
      content: {
        title: 'Launch title',
        body: 'Body',
        imageUrl: 'https://cdn.example.com/img.png',
        callToAction: 'Read more',
        tags: ['news', 'launch'],
      },
    });

    expect(fetch).toHaveBeenCalledWith(
      'https://example.com/wp-json/wp/v2/posts',
      expect.objectContaining({
        body: JSON.stringify({
          title: 'Launc',
          content: '<figure><img src="https://cdn.example.com/img.png" alt="Launch title" /></figure>\nBody\n<p><strong>Read more</strong></p>\n<p>#news #launch</p>',
          status: 'future',
          date: '2026-05-16T01:00:00.000Z',
          tags_input: ['news', 'launch'],
        }),
      }),
    );
  });

  it('returns vendor-declared failures with status fallback', async () => {
    const fetch = vi.fn().mockResolvedValue({
      status: WORDPRESS_SITE_HTTP_STATUS.UNAUTHORIZED,
      body: {
        message: 'Invalid credentials',
        data: { status: WORDPRESS_SITE_HTTP_STATUS.UNAUTHORIZED },
      },
    });
    const client = new WordPressSitePublishClient({ fetch });

    await expect(client.publish({
      siteUrl: 'https://example.com',
      accessToken: 'basic-token',
      content: {
        title: 'Launch',
        body: 'Body',
      },
    })).resolves.toEqual({
      success: false,
      vendorErrorCode: WORDPRESS_SITE_HTTP_STATUS.UNAUTHORIZED,
      vendorMessage: 'Invalid credentials',
    });
  });

  it('throws stable contract errors for malformed error payloads and missing success ids', async () => {
    const invalidErrorClient = new WordPressSitePublishClient({
      fetch: async () => ({
        status: WORDPRESS_SITE_HTTP_STATUS.INTERNAL_SERVER_ERROR,
        body: ['invalid'],
      }),
    });
    const missingIdClient = new WordPressSitePublishClient({
      fetch: async () => ({
        status: WORDPRESS_SITE_HTTP_STATUS.CREATED,
        body: { link: 'https://example.com/posts/1' },
      }),
    });

    await expect(invalidErrorClient.publish({
      siteUrl: 'https://example.com',
      accessToken: 'basic-token',
      content: {
        title: 'Launch',
        body: 'Body',
      },
    })).rejects.toThrow(new WordPressSiteResponseContractError(
      WORDPRESS_SITE_PUBLISH_PUBLIC_ERROR_MESSAGES.ERROR_PAYLOAD_INVALID,
    ));

    await expect(missingIdClient.publish({
      siteUrl: 'https://example.com',
      accessToken: 'basic-token',
      content: {
        title: 'Launch',
        body: 'Body',
      },
    })).rejects.toThrow(new WordPressSiteResponseContractError(
      WORDPRESS_SITE_PUBLISH_PUBLIC_ERROR_MESSAGES.SUCCESS_POST_ID_MISSING,
    ));
  });

  it('returns false for invalid credential responses or transport failures', async () => {
    const invalidBodyClient = new WordPressSitePublishClient({
      fetch: async () => ({
        status: WORDPRESS_SITE_HTTP_STATUS.OK,
        body: {},
      }),
    });
    const failingClient = new WordPressSitePublishClient({
      fetch: async () => {
        throw new Error('boom');
      },
    });

    await expect(invalidBodyClient.validateCredentials('https://example.com', 'token')).resolves.toBe(false);
    await expect(failingClient.validateCredentials('https://example.com', 'token')).resolves.toBe(false);
  });
});
