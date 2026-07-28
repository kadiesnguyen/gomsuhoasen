import {
  DefaultResourceRegistry,
  REDIS_CACHE_ERROR_POLICIES,
  REDIS_ERROR_MESSAGES,
  RedisClientManager,
  DistributedLock,
  RedisCacheStore,
  createIoRedisClientFactory,
  type IRedisClient,
  type IRedisClientFactory,
} from './redis';

class MockRedisClient implements IRedisClient {
  private store = new Map<string, string>();
  public connected = false;
  public disconnected = false;

  async get(key: string): Promise<string | null> {
    return this.store.get(key) || null;
  }

  async set(key: string, value: string, ...args: (string | number)[]): Promise<string | null> {
    // simplified mock for set nx
    if (args.includes('NX') && this.store.has(key)) {
      return null;
    }
    this.store.set(key, value);
    return 'OK';
  }

  async setex(key: string, ttl: number, value: string): Promise<string> {
    this.store.set(key, value);
    return 'OK';
  }

  async del(...keys: string[]): Promise<number> {
    let deleted = 0;
    for (const key of keys) {
      if (this.store.has(key)) {
        this.store.delete(key);
        deleted++;
      }
    }
    return deleted;
  }

  async quit(): Promise<string> {
    this.disconnected = true;
    return 'OK';
  }

  async eval(script: string, numkeys: number, ...args: (string | number)[]): Promise<any> {
    if (script.includes('redis.call("get",KEYS[1]) == ARGV[1]')) {
      const key = args[0] as string;
      const token = args[1] as string;
      if (this.store.get(key) === token) {
        this.store.delete(key);
        return 1;
      }
      return 0;
    }
    return 0;
  }

  disconnect(): void {
    this.disconnected = true;
  }

  async connect(): Promise<void> {
    this.connected = true;
  }
}

class MockRedisFactory implements IRedisClientFactory {
  create(uri: string): IRedisClient {
    return new MockRedisClient();
  }
}

class FakeIoRedisClient extends MockRedisClient {
  static readonly instances: Array<{ uri: string; options?: Record<string, unknown> }> = [];

  constructor(uri: string, options?: Record<string, unknown>) {
    super();
    FakeIoRedisClient.instances.push({ uri, options });
  }
}

describe('DefaultResourceRegistry', () => {
  it('should register and execute teardowns on shutdownAll', async () => {
    const registry = new DefaultResourceRegistry();
    let counter = 0;
    
    registry.register('res1', () => { counter += 1; });
    registry.register('res2', () => { counter += 2; });
    
    expect(registry.size).toBe(2);
    
    await registry.shutdownAll();
    
    expect(registry.size).toBe(0);
    expect(counter).toBe(3);
  });
  
  it('should ignore teardown errors', async () => {
    const registry = new DefaultResourceRegistry();
    let called = false;
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    
    registry.register('errorRes', () => { throw new Error('Fail'); });
    registry.register('goodRes', () => { called = true; });
    
    await expect(registry.shutdownAll()).resolves.not.toThrow();
    expect(called).toBe(true);
    expect(warnSpy).toHaveBeenCalledWith(
      REDIS_ERROR_MESSAGES.RESOURCE_TEARDOWN_FAILED('errorRes', 'Fail'),
    );
    warnSpy.mockRestore();
  });
});

describe('RedisClientManager', () => {
  let registry: DefaultResourceRegistry;
  let factory: MockRedisFactory;
  let manager: RedisClientManager;

  beforeEach(() => {
    registry = new DefaultResourceRegistry();
    factory = new MockRedisFactory();
    manager = new RedisClientManager(factory, registry);
  });

  it('should return undefined if disabled or no URI', () => {
    expect(manager.getOrCreate({ clientId: 'test', disabled: true, uri: 'redis://localhost' })).toBeUndefined();
    expect(manager.getOrCreate({ clientId: 'test2' })).toBeUndefined();
  });

  it('should create and return client', () => {
    const client = manager.getOrCreate({ clientId: 'app1', uri: 'redis://localhost' }) as MockRedisClient;
    expect(client).toBeDefined();
    expect(client.connected).toBe(true);
    expect(manager.size).toBe(1);
    expect(registry.size).toBe(1);
  });

  it('should return existing client', () => {
    const client1 = manager.getOrCreate({ clientId: 'app1', uri: 'redis://localhost' });
    const client2 = manager.getOrCreate({ clientId: 'app1', uri: 'redis://localhost' });
    expect(client1).toBe(client2);
    expect(manager.size).toBe(1);
  });

  it('should unregister and disconnect on shutdown', async () => {
    const client = manager.getOrCreate({ clientId: 'app1', uri: 'redis://localhost' }) as MockRedisClient;
    
    await registry.shutdownAll();
    
    expect(client.disconnected).toBe(true);
    expect(manager.size).toBe(0);
  });

  it('should log and evict unavailable clients on async connect failure', async () => {
    const client = new MockRedisClient();
    vi.spyOn(client, 'connect').mockRejectedValue(new Error('Redis down'));
    const failingFactory: IRedisClientFactory = {
      create: vi.fn(() => client),
    };
    const logger = { warn: vi.fn() };
    const onUnavailable = vi.fn();
    const failingManager = new RedisClientManager(failingFactory, registry, logger);

    const created = failingManager.getOrCreate({
      clientId: 'app1',
      uri: 'redis://localhost',
      onUnavailable,
    });
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(created).toBe(client);
    expect(logger.warn).toHaveBeenCalledWith(
      REDIS_ERROR_MESSAGES.CLIENT_UNAVAILABLE('app1', 'Redis down'),
    );
    expect(onUnavailable).toHaveBeenCalledWith(expect.any(Error));
    expect(client.disconnected).toBe(true);
    expect(failingManager.size).toBe(0);
    expect(registry.size).toBe(0);
  });
});

describe('createIoRedisClientFactory', () => {
  beforeEach(() => {
    FakeIoRedisClient.instances.length = 0;
  });

  it('creates clients with the platform default ioredis options', () => {
    const factory = createIoRedisClientFactory({
      RedisConstructor: FakeIoRedisClient,
      clientOptions: { keyPrefix: 'tenant-a:' },
    });

    const client = factory.create('redis://localhost:6379');

    expect(client).toBeInstanceOf(FakeIoRedisClient);
    expect(FakeIoRedisClient.instances).toEqual([
      {
        uri: 'redis://localhost:6379',
        options: {
          lazyConnect: true,
          maxRetriesPerRequest: 1,
          enableOfflineQueue: false,
          keyPrefix: 'tenant-a:',
        },
      },
    ]);
  });
});

describe('DistributedLock', () => {
  it('should acquire and release lock when client provided', async () => {
    const client = new MockRedisClient();
    const lock = new DistributedLock(client);
    
    const token = await lock.acquire('test-lock', 10);
    expect(token).toBeTruthy();
    
    const tokenAgain = await lock.acquire('test-lock', 10);
    expect(tokenAgain).toBeNull();
    
    // Attempt release with wrong token
    const releasedWrong = await lock.release('test-lock', 'wrong-token');
    expect(releasedWrong).toBe(false);
    
    // Release with correct token
    const released = await lock.release('test-lock', token!);
    expect(released).toBe(true);
    
    const tokenAfterRelease = await lock.acquire('test-lock', 10);
    expect(tokenAfterRelease).toBeTruthy();
  });
  
  it('should fail closed if no client provided (by default)', async () => {
    const lock = new DistributedLock();
    expect(await lock.acquire('some-lock')).toBeNull();
    expect(await lock.release('some-lock', 'token')).toBe(false);
  });

  it('should fail open if configured to do so', async () => {
    const lock = new DistributedLock(undefined, true);
    const token = await lock.acquire('some-lock');
    expect(token).toBe('unsafe-token');
    expect(await lock.release('some-lock', token!)).toBe(true);
  });
});

describe('RedisCacheStore', () => {
  it('exports explicit cache error policy constants', () => {
    expect(REDIS_CACHE_ERROR_POLICIES.FALLBACK).toBe('fallback');
    expect(REDIS_CACHE_ERROR_POLICIES.THROW).toBe('throw');
  });

  it('should use Redis client if provided', async () => {
    const client = new MockRedisClient();
    const cache = new RedisCacheStore(client);
    
    expect(cache.isRedisMode).toBe(true);
    
    await cache.set('key1', 'val1');
    expect(await cache.get('key1')).toBe('val1');
    
    await cache.del('key1');
    expect(await cache.get('key1')).toBeNull();
  });

  it('should fallback to memory if client throws', async () => {
    const client = new MockRedisClient();
    vi.spyOn(client, 'setex').mockRejectedValue(new Error('Redis down'));
    vi.spyOn(client, 'get').mockRejectedValue(new Error('Redis down'));
    
    const cache = new RedisCacheStore(client);
    
    await cache.set('key1', 'val1', 10);
    expect(cache.memoryCacheSize).toBe(1);
    
    expect(await cache.get('key1')).toBe('val1');
  });

  it('should log cache errors through named constants before fallback', async () => {
    const client = new MockRedisClient();
    vi.spyOn(client, 'setex').mockRejectedValue(new Error('Redis down'));
    vi.spyOn(client, 'get').mockRejectedValue(new Error('Redis down'));
    vi.spyOn(client, 'del').mockRejectedValue(new Error('Redis down'));
    const logger = { error: vi.fn() };

    const cache = new RedisCacheStore(client, logger);

    await cache.set('key1', 'val1', 10);
    await cache.get('key1');
    await cache.del('key1');

    expect(logger.error).toHaveBeenNthCalledWith(
      1,
      REDIS_ERROR_MESSAGES.CACHE_WRITE_FAILED('key1', 'Redis down'),
    );
    expect(logger.error).toHaveBeenNthCalledWith(
      2,
      REDIS_ERROR_MESSAGES.CACHE_READ_FAILED('key1', 'Redis down'),
    );
    expect(logger.error).toHaveBeenNthCalledWith(
      3,
      REDIS_ERROR_MESSAGES.CACHE_DELETE_FAILED('key1', 'Redis down'),
    );
  });

  it('should throw on Redis command error when configured fail-closed', async () => {
    const client = new MockRedisClient();
    vi.spyOn(client, 'setex').mockRejectedValue(new Error('Redis down'));
    vi.spyOn(client, 'get').mockRejectedValue(new Error('Redis down'));
    vi.spyOn(client, 'del').mockRejectedValue(new Error('Redis down'));

    const cache = new RedisCacheStore(client, { onError: REDIS_CACHE_ERROR_POLICIES.THROW });

    await expect(cache.set('key1', 'val1', 10)).rejects.toThrow('Redis down');
    await expect(cache.get('key1')).rejects.toThrow('Redis down');
    await expect(cache.del('key1')).rejects.toThrow('Redis down');
  });
  
  it('should fallback to memory if no client provided', async () => {
    const cache = new RedisCacheStore();
    
    expect(cache.isRedisMode).toBe(false);
    
    await cache.set('key1', 'val1', 10);
    expect(await cache.get('key1')).toBe('val1');
    expect(cache.memoryCacheSize).toBe(1);
    
    await cache.del('key1');
    expect(await cache.get('key1')).toBeNull();
  });
  
  it('should expire memory cache', async () => {
    const cache = new RedisCacheStore();
    await cache.set('key1', 'val1', -1); // expired instantly
    
    expect(await cache.get('key1')).toBeNull();
    
    // cleanup
    await cache.set('key2', 'val2', -1);
    const deleted = cache.cleanupExpired();
    expect(deleted).toBeGreaterThan(0);
  });
});
