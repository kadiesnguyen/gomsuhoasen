import {
  LINKEDIN_PAGE_PUBLISH_PUBLIC_ERROR_MESSAGES,
  LINKEDIN_PAGE_HTTP_STATUS,
  LinkedInPagePublishClient,
} from './linkedin-page-publish';

describe('LinkedInPagePublishClient', () => {
  it('maps successful publish responses and builds the ugc payload', async () => {
    const fetch = vi.fn().mockResolvedValue({
      status: LINKEDIN_PAGE_HTTP_STATUS.CREATED,
      headers: { 'x-restli-id': 'urn:li:share:12345' },
    });
    const client = new LinkedInPagePublishClient({ fetch }, { maxBodyLength: 10 });

    await expect(client.publish({
      authorUrn: 'urn:li:organization:123',
      accessToken: 'token-abc',
      content: {
        title: 'Launch',
        body: '0123456789-truncated',
        callToAction: 'Read more',
        tags: ['growth', 'launch'],
        imageUrl: 'https://cdn.example.com/image.png',
      },
    })).resolves.toEqual({
      success: true,
      externalPostId: 'urn:li:share:12345',
      externalUrl: 'https://www.linkedin.com/feed/update/urn:li:share:12345',
    });

    expect(fetch).toHaveBeenCalledWith(
      'https://api.linkedin.com/v2/ugcPosts',
      expect.objectContaining({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer token-abc',
          'X-Restli-Protocol-Version': '2.0.0',
        },
      }),
    );

    const body = JSON.parse(fetch.mock.calls[0][1].body as string) as Record<string, unknown>;
    const shareContent = (body['specificContent'] as Record<string, unknown>)['com.linkedin.ugc.ShareContent'] as Record<string, unknown>;
    expect((shareContent['shareCommentary'] as Record<string, unknown>)['text']).toBe('Launch\n\n01');
    expect(shareContent['shareMediaCategory']).toBe('IMAGE');
  });

  it('returns explicit vendor failures from LinkedIn error payloads', async () => {
    const client = new LinkedInPagePublishClient({
      fetch: vi.fn().mockResolvedValue({
        status: LINKEDIN_PAGE_HTTP_STATUS.FORBIDDEN,
        headers: {},
        body: {
          message: 'Not enough permissions',
          status: LINKEDIN_PAGE_HTTP_STATUS.FORBIDDEN,
        },
      }),
    });

    await expect(client.publish({
      authorUrn: 'urn:li:organization:123',
      accessToken: 'bad-token',
      content: { title: 'Launch', body: 'Body text' },
    })).resolves.toEqual({
      success: false,
      vendorErrorCode: LINKEDIN_PAGE_HTTP_STATUS.FORBIDDEN,
      vendorMessage: 'Not enough permissions',
    });
  });

  it('throws a contract error when success has no x-restli-id or body id', async () => {
    const client = new LinkedInPagePublishClient({
      fetch: vi.fn().mockResolvedValue({
        status: LINKEDIN_PAGE_HTTP_STATUS.CREATED,
        headers: {},
        body: {},
      }),
    });

    await expect(client.publish({
      authorUrn: 'urn:li:organization:123',
      accessToken: 'token-abc',
      content: { title: 'Launch', body: 'Body text' },
    })).rejects.toThrow(LINKEDIN_PAGE_PUBLISH_PUBLIC_ERROR_MESSAGES.SUCCESS_POST_ID_MISSING);
  });

  it('throws a contract error for malformed error payloads', async () => {
    const client = new LinkedInPagePublishClient({
      fetch: vi.fn().mockResolvedValue({
        status: LINKEDIN_PAGE_HTTP_STATUS.BAD_REQUEST,
        headers: {},
        body: ['invalid'],
      }),
    });

    await expect(client.publish({
      authorUrn: 'urn:li:organization:123',
      accessToken: 'token-abc',
      content: { title: 'Launch', body: 'Body text' },
    })).rejects.toThrow(LINKEDIN_PAGE_PUBLISH_PUBLIC_ERROR_MESSAGES.ERROR_PAYLOAD_INVALID);
  });

  it('returns false when credential validation transport fails', async () => {
    const client = new LinkedInPagePublishClient({
      fetch: vi.fn().mockRejectedValue(new Error('timeout')),
    });

    await expect(client.validateCredentials('urn:li:organization:123', 'token-abc')).resolves.toBe(false);
  });
});
