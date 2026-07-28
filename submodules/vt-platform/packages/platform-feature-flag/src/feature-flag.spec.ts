import {
  EnvFeatureFlagStore,
  FEATURE_FLAG_ERROR_MESSAGES,
  FeatureFlagService,
  MemoryFeatureFlagStore,
  normalizeBooleanFeatureFlags,
  RedisFeatureFlagStore,
  type IFeatureFlagRedisClient,
} from './feature-flag';

describe('FeatureFlagService (Memory Store)', () => {
  let store: MemoryFeatureFlagStore;
  let service: FeatureFlagService;

  beforeEach(() => {
    store = new MemoryFeatureFlagStore();
    service = new FeatureFlagService(store);
  });

  it('should return defaultValue if not configured', async () => {
    expect(await service.isEnabled('test-flag')).toBe(false);
    expect(await service.isEnabled('test-flag', undefined, true)).toBe(true);
  });

  it('should resolve global flag', async () => {
    await service.setGlobal('test-flag', true);
    expect(await service.isEnabled('test-flag', undefined, false)).toBe(true);

    await service.setGlobal('test-flag', false);
    expect(await service.isEnabled('test-flag', undefined, true)).toBe(false);
  });

  it('should resolve tenant override', async () => {
    await service.setGlobal('test-flag', false);
    await service.setTenant('test-flag', 'tenant-1', true);

    // Tenant 1 gets true
    expect(await service.isEnabled('test-flag', { tenantId: 'tenant-1' }, false)).toBe(true);
    
    // Other tenants get global false
    expect(await service.isEnabled('test-flag', { tenantId: 'tenant-2' }, false)).toBe(false);
    
    // Global gets global false
    expect(await service.isEnabled('test-flag', undefined, false)).toBe(false);
  });

  it('should clear tenant override and fallback to global', async () => {
    await service.setGlobal('test-flag', true);
    await service.setTenant('test-flag', 'tenant-1', false);
    
    expect(await service.isEnabled('test-flag', { tenantId: 'tenant-1' })).toBe(false);

    await service.clearTenant('test-flag', 'tenant-1');
    expect(await service.isEnabled('test-flag', { tenantId: 'tenant-1' })).toBe(true);
  });

  it('should cache results for 5s', async () => {
    const mockStore = new MemoryFeatureFlagStore();
    const getSpy = vi.spyOn(mockStore, 'get');
    const cacheService = new FeatureFlagService(mockStore);

    await cacheService.setGlobal('cache-flag', true);
    getSpy.mockClear();

    // First call hits store
    expect(await cacheService.isEnabled('cache-flag')).toBe(true);
    expect(getSpy).toHaveBeenCalledTimes(1);

    // Second call hits cache
    expect(await cacheService.isEnabled('cache-flag')).toBe(true);
    expect(getSpy).toHaveBeenCalledTimes(1);

    // clearCache invalidates it
    cacheService.clearCache('cache-flag');
    expect(await cacheService.isEnabled('cache-flag')).toBe(true);
    expect(getSpy).toHaveBeenCalledTimes(2);
  });
});

describe('RedisFeatureFlagStore', () => {
  it('should get and set string values correctly', async () => {
    const map = new Map<string, string>();
    const mockRedis: IFeatureFlagRedisClient = {
      get: async (k) => map.get(k) || null,
      set: async (k, v) => { map.set(k, v); return 'OK'; },
      del: async (...keys) => {
        let deleted = 0;
        keys.forEach((k) => {
          if (map.has(k)) { map.delete(k); deleted++; }
        });
        return deleted;
      },
    };

    const store = new RedisFeatureFlagStore(mockRedis);

    expect(await store.get('key1')).toBeNull();

    await store.set('key1', true);
    expect(await store.get('key1')).toBe(true);
    expect(map.get('key1')).toBe('1');

    await store.set('key1', false);
    expect(await store.get('key1')).toBe(false);
    expect(map.get('key1')).toBe('0');

    await store.delete('key1');
    expect(await store.get('key1')).toBeNull();
  });

  it('should throw on redis errors', async () => {
    const mockRedis: IFeatureFlagRedisClient = {
      get: async () => { throw new Error('Redis down'); },
      set: async () => { throw new Error('Redis down'); },
      del: async () => { throw new Error('Redis down'); },
    };

    const logger = { error: vi.fn() };
    const store = new RedisFeatureFlagStore(mockRedis, logger);

    await expect(store.get('key1')).rejects.toThrow('Redis down');
    expect(logger.error).toHaveBeenCalledWith(FEATURE_FLAG_ERROR_MESSAGES.REDIS_READ_FAILED('key1', 'Redis down'));
  });
});

describe('FeatureFlagService Fail-Open/Closed', () => {
  it('should return defaultValue if store throws', async () => {
    const failingStore = {
      get: async () => { throw new Error('DB down'); },
      set: async () => {},
      delete: async () => {},
    };
    
    const logger = { warn: vi.fn() };
    const service = new FeatureFlagService(failingStore, logger);

    // Fail-open
    expect(await service.isEnabled('flag1', undefined, true)).toBe(true);
    // Fail-closed
    expect(await service.isEnabled('flag1', undefined, false)).toBe(false);

    expect(logger.warn).toHaveBeenCalledWith(
      FEATURE_FLAG_ERROR_MESSAGES.STORE_RESOLUTION_FAILED('feature:flag1:global', 'DB down'),
    );
  });
});

describe('EnvFeatureFlagStore', () => {
  it('resolves FeatureFlagService global keys from environment variables', async () => {
    const store = new EnvFeatureFlagStore({
      env: {
        ENABLE_RUNTIME_FEATURE: 'yes',
        DISABLE_RUNTIME_FEATURE: 'off',
      },
    });
    const service = new FeatureFlagService(store);

    expect(await service.isEnabled('ENABLE_RUNTIME_FEATURE')).toBe(true);
    expect(await service.isEnabled('DISABLE_RUNTIME_FEATURE', undefined, true)).toBe(false);
    expect(await service.isEnabled('MISSING_RUNTIME_FEATURE', undefined, true)).toBe(true);
  });

  it('is read-only and reports invalid boolean values as not configured', async () => {
    const logger = { warn: vi.fn() };
    const store = new EnvFeatureFlagStore({
      env: { BROKEN_FEATURE: 'maybe' },
      logger,
    });

    expect(await store.get('feature:BROKEN_FEATURE:global')).toBeNull();
    expect(logger.warn).toHaveBeenCalledWith(
      FEATURE_FLAG_ERROR_MESSAGES.INVALID_BOOLEAN_ENV_VALUE('BROKEN_FEATURE', 'maybe'),
    );
    await expect(store.set('feature:BROKEN_FEATURE:global', true)).rejects.toThrow(
      FEATURE_FLAG_ERROR_MESSAGES.ENV_STORE_READ_ONLY_SET('feature:BROKEN_FEATURE:global'),
    );
    await expect(store.delete('feature:BROKEN_FEATURE:global')).rejects.toThrow(
      FEATURE_FLAG_ERROR_MESSAGES.ENV_STORE_READ_ONLY_DELETE('feature:BROKEN_FEATURE:global'),
    );
  });
});

describe('normalizeBooleanFeatureFlags', () => {
  it('keeps only top-level boolean flags', () => {
    expect(normalizeBooleanFeatureFlags({
      enabled: true,
      disabled: false,
      text: 'yes',
      count: 1,
      nested: { ok: true },
      unset: null,
    })).toEqual({
      enabled: true,
      disabled: false,
    });
  });

  it('supports document-like sources through toObject', () => {
    expect(normalizeBooleanFeatureFlags({
      toObject: () => ({
        alpha: true,
        beta: 'false',
      }),
    })).toEqual({ alpha: true });
  });

  it('returns an empty map for non-object sources', () => {
    expect(normalizeBooleanFeatureFlags(null)).toEqual({});
    expect(normalizeBooleanFeatureFlags(['x'])).toEqual({});
    expect(normalizeBooleanFeatureFlags('x')).toEqual({});
  });
});
