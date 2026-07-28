/**
 * @vt/platform-redis — Redis client pool + distributed lock.
 *
 * Provides:
 * - IResourceRegistry: port for lifecycle-managed resource teardown
 * - IRedisClientFactory: port interface for Redis client creation
 * - RedisClientManager: pooled client manager with lazy connect + graceful shutdown
 * - DistributedLock: SETNX-based distributed lock with TTL + fail-closed fallback
 * - RedisCacheStore: generic get/set/del with memory fallback
 *
 * Peer dependency: ioredis (consumers install).
 */

// ─── Resource Registry Port ──────────────────────────

export const REDIS_TIME = {
  MILLISECONDS_PER_SECOND: 1000,
} as const;

export const REDIS_CACHE_ERROR_POLICIES = {
  FALLBACK: 'fallback',
  THROW: 'throw',
} as const;

export const REDIS_ERROR_MESSAGES = {
  RESOURCE_TEARDOWN_FAILED: (resourceId: string, message: string) =>
    `Resource teardown failed (${resourceId}): ${message}`,
  IOREDIS_REQUIRED: '@vt/platform-redis requires "ioredis" unless RedisConstructor is provided.',
  CLIENT_UNAVAILABLE: (clientId: string, message: string) => `[${clientId}] Redis unavailable: ${message}`,
  CACHE_READ_FAILED: (key: string, message: string) => `Redis cache read failed for ${key}: ${message}`,
  CACHE_WRITE_FAILED: (key: string, message: string) => `Redis cache write failed for ${key}: ${message}`,
  CACHE_DELETE_FAILED: (key: string, message: string) => `Redis cache del failed for ${key}: ${message}`,
} as const;

export type RedisCacheErrorPolicy =
  typeof REDIS_CACHE_ERROR_POLICIES[keyof typeof REDIS_CACHE_ERROR_POLICIES];

export type ResourceTeardownFn = () => Promise<void> | void;

export interface IResourceRegistry {
  register(resourceId: string, teardown: ResourceTeardownFn): void;
  unregister(resourceId: string): void;
}

/**
 * Default in-process resource registry.
 * Tracks teardown functions and executes them in reverse order on shutdown.
 */
export class DefaultResourceRegistry implements IResourceRegistry {
  private readonly teardowns = new Map<string, ResourceTeardownFn>();

  register(resourceId: string, teardown: ResourceTeardownFn): void {
    this.teardowns.set(resourceId, teardown);
  }

  unregister(resourceId: string): void {
    this.teardowns.delete(resourceId);
  }

  async shutdownAll(): Promise<void> {
    const entries = Array.from(this.teardowns.entries()).reverse();
    this.teardowns.clear();

    for (const [resourceId, teardown] of entries) {
      try {
        await teardown();
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.warn(REDIS_ERROR_MESSAGES.RESOURCE_TEARDOWN_FAILED(resourceId, message));
      }
    }
  }

  get size(): number {
    return this.teardowns.size;
  }
}

// ─── Redis Client Types ──────────────────────────────

export interface RedisClientOptions {
  clientId: string;
  uri?: string;
  disabled?: boolean;
  onUnavailable?: (error: unknown) => void;
}

/**
 * Minimal Redis client interface.
 * Matches the subset of ioredis API used by platform packages.
 * Consumers can pass a real ioredis instance.
 */
export interface IRedisClient {
  get(key: string): Promise<string | null>;
  set(...args: unknown[]): Promise<string | null>;
  setex(...args: unknown[]): Promise<string>;
  del(...keys: string[]): Promise<number>;
  eval(script: string, numkeys: number, ...args: (string | number)[]): Promise<any>;
  quit(): Promise<string>;
  disconnect(): void;
  connect?(): Promise<void>;
}

export interface IRedisClientFactory {
  create(uri: string): IRedisClient;
}

type IoRedisConstructor = new (uri: string, options?: Record<string, unknown>) => IRedisClient;

export interface IoRedisClientFactoryOptions {
  RedisConstructor?: IoRedisConstructor;
  clientOptions?: Record<string, unknown>;
}

export function createIoRedisClientFactory(
  options: IoRedisClientFactoryOptions = {},
): IRedisClientFactory {
  return {
    create(uri: string): IRedisClient {
      const RedisConstructor = options.RedisConstructor ?? loadIoRedisConstructor();
      return new RedisConstructor(uri, {
        lazyConnect: true,
        maxRetriesPerRequest: 1,
        enableOfflineQueue: false,
        ...options.clientOptions,
      });
    },
  };
}

function loadIoRedisConstructor(): IoRedisConstructor {
  try {
     
    const loaded = require('ioredis') as IoRedisConstructor | { default?: IoRedisConstructor };
    if (typeof loaded === 'function') {
      return loaded;
    }
    if (typeof loaded.default === 'function') {
      return loaded.default;
    }
  } catch {
    // Handled below with a stable message.
  }

  throw new Error(REDIS_ERROR_MESSAGES.IOREDIS_REQUIRED);
}

// ─── Redis Client Manager ────────────────────────────

/**
 * Pooled Redis client manager.
 * Creates clients lazily, tracks them via resource registry for graceful shutdown.
 */
export class RedisClientManager {
  private readonly clients = new Map<string, IRedisClient>();

  constructor(
    private readonly factory: IRedisClientFactory,
    private readonly registry: IResourceRegistry,
    private readonly logger?: { warn?(msg: string): void },
  ) {}

  getOrCreate(options: RedisClientOptions): IRedisClient | undefined {
    const { clientId, uri, disabled, onUnavailable } = options;
    if (disabled || !uri) return undefined;

    const existing = this.clients.get(clientId);
    if (existing) return existing;

    const client = this.factory.create(uri);
    this.clients.set(clientId, client);

    this.registry.register(`redis:${clientId}`, async () => {
      const registered = this.clients.get(clientId);
      if (!registered) return;
      try {
        await registered.quit();
      } catch {
        registered.disconnect();
      } finally {
        this.clients.delete(clientId);
      }
    });

    // Lazy connect (fire-and-forget)
    if (client.connect) {
      client.connect().catch((error) => {
        const message = error instanceof Error ? error.message : String(error);
        this.logger?.warn?.(REDIS_ERROR_MESSAGES.CLIENT_UNAVAILABLE(clientId, message));
        this.clients.delete(clientId);
        this.registry.unregister(`redis:${clientId}`);
        client.disconnect();
        onUnavailable?.(error);
      });
    }

    return client;
  }

  get(clientId: string): IRedisClient | undefined {
    return this.clients.get(clientId);
  }

  get size(): number {
    return this.clients.size;
  }
}

// ─── Distributed Lock ────────────────────────────────

export interface IDistributedLock {
  /** Returns a lock token if acquired, or null if failed/disabled */
  acquire(key: string, ttlSeconds?: number): Promise<string | null>;
  /** Releases the lock only if the token matches. Returns true if released, false if not held/matched */
  release(key: string, token: string): Promise<boolean>;
}

/**
 * SETNX-based distributed lock.
 * Fails closed (returns null) when Redis is unavailable, unless configured otherwise.
 */
export class DistributedLock implements IDistributedLock {
  constructor(
    private readonly client?: IRedisClient,
    private readonly unsafeFailOpen = false
  ) {}

  async acquire(key: string, ttlSeconds = 300): Promise<string | null> {
    if (!this.client) {
      return this.unsafeFailOpen ? 'unsafe-token' : null;
    }
    const lockKey = `lock:${key}`;
    const token = Math.random().toString(36).substring(2) + Date.now().toString(36);
    
    const result = await this.client.set(lockKey, token, 'EX', ttlSeconds, 'NX');
    return result === 'OK' ? token : null;
  }

  async release(key: string, token: string): Promise<boolean> {
    if (!this.client) {
      return this.unsafeFailOpen && token === 'unsafe-token';
    }
    const lockKey = `lock:${key}`;
    
    if (this.client) {
      const script = `
        if redis.call("get",KEYS[1]) == ARGV[1] then
            return redis.call("del",KEYS[1])
        else
            return 0
        end
      `;
      const result = await this.client.eval(script, 1, lockKey, token);
      return result === 1;
    }
    return false; // unreachable because of !this.client check above
  }
}

// ─── Generic Cache Store ─────────────────────────────

type MemoryCacheEntry = { value: string; expiresAt: number };

export interface RedisCacheStoreOptions {
  error?(msg: string): void;
  onError?: RedisCacheErrorPolicy;
}

/**
 * Redis-backed cache with automatic memory fallback.
 */
export class RedisCacheStore {
  private readonly memoryFallback = new Map<string, MemoryCacheEntry>();
  private readonly logger?: { error?(msg: string): void };
  private readonly onError: RedisCacheErrorPolicy;

  constructor(
    private readonly client?: IRedisClient,
    loggerOrOptions?: { error?(msg: string): void } | RedisCacheStoreOptions,
  ) {
    this.logger = loggerOrOptions;
    this.onError = 'onError' in (loggerOrOptions ?? {})
      ? (loggerOrOptions as RedisCacheStoreOptions).onError ?? REDIS_CACHE_ERROR_POLICIES.FALLBACK
      : REDIS_CACHE_ERROR_POLICIES.FALLBACK;
  }

  async get(key: string): Promise<string | null> {
    if (this.client) {
      try {
        const val = await this.client.get(key);
        return val; // If null, it means not in cache. Do not fallthrough to memory to avoid stale data.
      } catch (error) {
        this.logger?.error?.(REDIS_ERROR_MESSAGES.CACHE_READ_FAILED(key, (error as Error).message));
        if (this.onError === REDIS_CACHE_ERROR_POLICIES.THROW) throw error;
        // Fallthrough to memory ONLY on connection/command error
      }
    }
    const entry = this.memoryFallback.get(key);
    if (!entry) return null;
    if (entry.expiresAt <= Date.now()) {
      this.memoryFallback.delete(key);
      return null;
    }
    return entry.value;
  }

  async set(key: string, value: string, ttlSeconds = 300): Promise<void> {
    if (this.client) {
      try {
        await this.client.setex(key, ttlSeconds, value);
        return;
      } catch (error) {
        this.logger?.error?.(REDIS_ERROR_MESSAGES.CACHE_WRITE_FAILED(key, (error as Error).message));
        if (this.onError === REDIS_CACHE_ERROR_POLICIES.THROW) throw error;
        // Fallthrough to memory
      }
    }
    this.memoryFallback.set(key, {
      value,
      expiresAt: Date.now() + ttlSeconds * REDIS_TIME.MILLISECONDS_PER_SECOND,
    });
  }

  async del(key: string): Promise<void> {
    if (this.client) {
      try {
        await this.client.del(key);
      } catch (error) {
        this.logger?.error?.(REDIS_ERROR_MESSAGES.CACHE_DELETE_FAILED(key, (error as Error).message));
        if (this.onError === REDIS_CACHE_ERROR_POLICIES.THROW) throw error;
        // Fallthrough to memory
      }
    }
    this.memoryFallback.delete(key);
  }

  get isRedisMode(): boolean {
    return this.client != null;
  }

  get memoryCacheSize(): number {
    return this.memoryFallback.size;
  }

  cleanupExpired(): number {
    const now = Date.now();
    let deleted = 0;
    for (const [key, entry] of this.memoryFallback.entries()) {
      if (entry.expiresAt <= now) {
        this.memoryFallback.delete(key);
        deleted++;
      }
    }
    return deleted;
  }
}
