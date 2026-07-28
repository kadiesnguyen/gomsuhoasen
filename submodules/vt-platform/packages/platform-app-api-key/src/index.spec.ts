import {
  authenticateAppApiKey,
  authenticateAppApiKeyWithPorts,
  createStaticAppApiKeyRecord,
  signAppApiRequest,
} from './index';
import type {
  AppApiKeyAuditPort,
  AppApiKeyRegistryPort,
  AppApiNonceStorePort,
  AppApiUsageStorePort,
} from './ports';

import type { MockedFunction } from 'vitest';
type MockedPortMethod<T extends (...args: never[]) => unknown> = MockedFunction<T>;

function createPorts(record: ReturnType<typeof createStaticAppApiKeyRecord>): {
  registry: AppApiKeyRegistryPort;
  nonceStore: AppApiNonceStorePort;
  usageStore: AppApiUsageStorePort;
  audit: AppApiKeyAuditPort;
  findCandidates: MockedPortMethod<AppApiKeyRegistryPort['findCandidates']>;
  touchLastUsed: MockedPortMethod<AppApiKeyRegistryPort['touchLastUsed']>;
  nonceConsume: MockedPortMethod<AppApiNonceStorePort['consume']>;
  usageConsume: MockedPortMethod<AppApiUsageStorePort['consume']>;
  auditAppend: MockedPortMethod<AppApiKeyAuditPort['append']>;
} {
  const findCandidates = vi.fn() as MockedPortMethod<AppApiKeyRegistryPort['findCandidates']>;
  const touchLastUsed = vi.fn() as MockedPortMethod<AppApiKeyRegistryPort['touchLastUsed']>;
  const nonceConsume = vi.fn() as MockedPortMethod<AppApiNonceStorePort['consume']>;
  const usageConsume = vi.fn() as MockedPortMethod<AppApiUsageStorePort['consume']>;
  const auditAppend = vi.fn() as MockedPortMethod<AppApiKeyAuditPort['append']>;

  findCandidates.mockResolvedValue([record]);
  touchLastUsed.mockResolvedValue(undefined);
  nonceConsume.mockResolvedValue(true);
  usageConsume.mockResolvedValue({ minuteCount: 1, dailyCount: 1 });
  auditAppend.mockResolvedValue(undefined);

  return {
    registry: {
      findCandidates: findCandidates as AppApiKeyRegistryPort['findCandidates'],
      insert: vi.fn(async () => undefined) as AppApiKeyRegistryPort['insert'],
      replace: vi.fn(async () => undefined) as AppApiKeyRegistryPort['replace'],
      touchLastUsed: touchLastUsed as AppApiKeyRegistryPort['touchLastUsed'],
    },
    nonceStore: {
      consume: nonceConsume as AppApiNonceStorePort['consume'],
    },
    usageStore: {
      consume: usageConsume as AppApiUsageStorePort['consume'],
    },
    audit: {
      append: auditAppend as AppApiKeyAuditPort['append'],
    },
    findCandidates,
    touchLastUsed,
    nonceConsume,
    usageConsume,
    auditAppend,
  };
}

describe('@vt/platform-app-api-key', () => {
  const plainKey = 'ak_demo_platform_key_secret_001';
  const nowMs = Date.parse('2026-07-01T03:00:00.000Z');
  const timestamp = new Date(nowMs).toISOString();

  it('normalizes and deduplicates origin, cidr, and channel bindings', () => {
    const record = createStaticAppApiKeyRecord({
      id: 'key-1',
      tenantId: 'tenant-1',
      plainKey,
      scopes: ['history:write', 'history:write'],
      channelAccountIds: ['shop-1', ' shop-1 ', 'shop-2'],
      allowedOrigins: ['https://admin.example.com/', ' https://admin.example.com '],
      allowedCidrs: ['127.0.0.1/32', '127.0.0.1/32'],
    });

    expect(record.scopes).toEqual(['history:write']);
    expect(record.channelAccountIds).toEqual(['shop-1', 'shop-2']);
    expect(record.allowedOrigins).toEqual(['https://admin.example.com']);
    expect(record.allowedCidrs).toEqual(['127.0.0.1/32']);
  });

  it('authenticates a signed request with origin and cidr restrictions', () => {
    const record = createStaticAppApiKeyRecord({
      id: 'key-1',
      tenantId: 'tenant-1',
      plainKey,
      scopes: ['history:write', 'conversation:read'],
      signaturePolicy: 'required',
      channelAccountIds: ['shop-1'],
      allowedOrigins: ['https://admin.example.com/'],
      allowedCidrs: ['127.0.0.1/32'],
    });
    const body = Buffer.from(JSON.stringify({ source: 'archive' }), 'utf8');
    const nonce = 'nonce-1';
    const signature = signAppApiRequest({
      plainKey,
      method: 'POST',
      pathWithQuery: '/v1/history/import?source=archive',
      timestamp,
      nonce,
      body,
    });
    const replayGuard = { assertAndStore: vi.fn() };

    const auth = authenticateAppApiKey({
      plainKey,
      records: [record],
      requiredScopes: ['history:write'],
      requestOrigin: 'https://admin.example.com/',
      remoteAddress: '127.0.0.1',
      replayGuard,
      signedRequest: {
        method: 'POST',
        pathWithQuery: '/v1/history/import?source=archive',
        body,
        headers: {
          timestamp,
          nonce,
          signature,
        },
        nowMs,
      },
    });

    expect(auth).toEqual({
      keyId: 'key-1',
      tenantId: 'tenant-1',
      scopes: ['history:write', 'conversation:read'],
      signed: true,
      channelAccountIds: ['shop-1'],
    });
    expect(replayGuard.assertAndStore).toHaveBeenCalledWith({
      keyId: 'key-1',
      nonce,
      nowMs,
      replayWindowMs: 300000,
    });
  });

  it('records replay failures through the port-backed authentication path', async () => {
    const record = createStaticAppApiKeyRecord({
      id: 'key-1',
      tenantId: 'tenant-1',
      plainKey,
      scopes: ['history:write'],
      signaturePolicy: 'required',
    });
    const ports = createPorts(record);
    ports.nonceConsume.mockResolvedValue(false);
    const body = Buffer.from('{"replay":true}', 'utf8');
    const nonce = 'nonce-replayed';
    const signature = signAppApiRequest({
      plainKey,
      method: 'POST',
      pathWithQuery: '/v1/history/import',
      timestamp,
      nonce,
      body,
    });

    await expect(authenticateAppApiKeyWithPorts({
      plainKey,
      requiredScopes: ['history:write'],
      signedRequest: {
        method: 'POST',
        pathWithQuery: '/v1/history/import',
        body,
        headers: {
          timestamp,
          nonce,
          signature,
        },
        nowMs,
      },
      registry: ports.registry,
      nonceStore: ports.nonceStore,
      usageStore: ports.usageStore,
      audit: ports.audit,
    })).rejects.toMatchObject({
      code: 'APP_SIGNATURE_REPLAYED',
    });

    expect(ports.touchLastUsed).not.toHaveBeenCalled();
    expect(ports.auditAppend).toHaveBeenCalledWith(expect.objectContaining({
      tenantId: 'tenant-1',
      keyId: 'key-1',
      keyPrefix: plainKey.slice(0, 12),
      outcome: 'failure',
      errorCode: 'APP_SIGNATURE_REPLAYED',
      signed: true,
    }));
  });

  it('touches usage and audit on successful port-backed authentication', async () => {
    const record = createStaticAppApiKeyRecord({
      id: 'key-1',
      tenantId: 'tenant-1',
      plainKey,
      scopes: ['history:write', 'knowledge:write'],
      signaturePolicy: 'required',
      rateLimitPerMinute: 5,
      dailyQuota: 10,
    });
    const ports = createPorts(record);
    const body = Buffer.from('{"import":1}', 'utf8');
    const nonce = 'nonce-ok';
    const signature = signAppApiRequest({
      plainKey,
      method: 'POST',
      pathWithQuery: '/v1/history/import',
      timestamp,
      nonce,
      body,
    });

    const auth = await authenticateAppApiKeyWithPorts({
      plainKey,
      requiredScopes: ['history:write'],
      signedRequest: {
        method: 'POST',
        pathWithQuery: '/v1/history/import',
        body,
        headers: {
          timestamp,
          nonce,
          signature,
        },
        nowMs,
      },
      registry: ports.registry,
      nonceStore: ports.nonceStore,
      usageStore: ports.usageStore,
      audit: ports.audit,
    });

    expect(auth).toEqual({
      keyId: 'key-1',
      tenantId: 'tenant-1',
      scopes: ['history:write', 'knowledge:write'],
      signed: true,
    });
    expect(ports.usageConsume).toHaveBeenCalledWith({
      tenantId: 'tenant-1',
      keyId: 'key-1',
      now: new Date(nowMs),
      rateLimitPerMinute: 5,
      dailyQuota: 10,
    });
    expect(ports.touchLastUsed).toHaveBeenCalledWith({
      keyId: 'key-1',
      tenantId: 'tenant-1',
      usedAt: new Date(nowMs),
    });
    expect(ports.auditAppend).toHaveBeenCalledWith(expect.objectContaining({
      outcome: 'success',
      signed: true,
    }));
  });
});
