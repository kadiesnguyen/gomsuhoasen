/**
 * Distributed Feature Flag (kill-switch) system.
 * Supports boolean flags with global and tenant-level overrides.
 * Fails open or closed based on service configuration if store is unavailable.
 */

export interface FeatureFlagContext {
  tenantId?: string;
  userId?: string; // reserved for future
  roles?: string[]; // reserved for future
}

export interface IFeatureFlagStore {
  get(key: string): Promise<boolean | null>;
  set(key: string, enabled: boolean): Promise<void>;
  delete(key: string): Promise<void>;
}

export function normalizeBooleanFeatureFlags(value: unknown): Record<string, boolean> {
  const source = normalizeObjectSource(value);
  const flags: Record<string, boolean> = {};

  if (!source || typeof source !== 'object' || Array.isArray(source)) {
    return flags;
  }

  for (const [key, flag] of Object.entries(source as Record<string, unknown>)) {
    if (typeof flag === 'boolean') {
      flags[key] = flag;
    }
  }

  return flags;
}

export const FEATURE_FLAG_ERROR_MESSAGES = {
  REDIS_READ_FAILED: (key: string, message: string) => `Redis feature flag read failed for ${key}: ${message}`,
  REDIS_WRITE_FAILED: (key: string, message: string) => `Redis feature flag write failed for ${key}: ${message}`,
  REDIS_DELETE_FAILED: (key: string, message: string) => `Redis feature flag delete failed for ${key}: ${message}`,
  INVALID_BOOLEAN_ENV_VALUE: (envKey: string, value: string) => `Invalid boolean feature flag value for ${envKey}: ${value}`,
  ENV_STORE_READ_ONLY_SET: (key: string) => `EnvFeatureFlagStore is read-only; cannot set ${key}`,
  ENV_STORE_READ_ONLY_DELETE: (key: string) => `EnvFeatureFlagStore is read-only; cannot delete ${key}`,
  STORE_RESOLUTION_FAILED: (key: string, message: string) => `Store error resolving feature flag ${key}, bypassing cache: ${message}`,
} as const;

function normalizeObjectSource(value: unknown): unknown {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return value;
  }

  const maybeDocument = value as { toObject?: () => unknown };
  return typeof maybeDocument.toObject === 'function' ? maybeDocument.toObject() : value;
}

export interface EnvFeatureFlagStoreOptions {
  env?: Record<string, string | undefined>;
  logger?: { warn?(msg: string): void };
}

/**
 * Minimal Redis interface for feature flags.
 * Compatible with IRedisClient from @vt/platform-redis.
 */
export interface IFeatureFlagRedisClient {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<string | null>;
  del(...keys: string[]): Promise<number>;
}

/**
 * Redis-backed feature flag store.
 */
export class RedisFeatureFlagStore implements IFeatureFlagStore {
  constructor(
    private readonly client: IFeatureFlagRedisClient,
    private readonly logger?: { error?(msg: string): void }
  ) {}

  async get(key: string): Promise<boolean | null> {
    try {
      const val = await this.client.get(key);
      if (val === '1' || val === 'true') return true;
      if (val === '0' || val === 'false') return false;
      return null; // Not configured
    } catch (error) {
      this.logger?.error?.(FEATURE_FLAG_ERROR_MESSAGES.REDIS_READ_FAILED(key, (error as Error).message));
      throw error;
    }
  }

  async set(key: string, enabled: boolean): Promise<void> {
    try {
      await this.client.set(key, enabled ? '1' : '0');
    } catch (error) {
      this.logger?.error?.(FEATURE_FLAG_ERROR_MESSAGES.REDIS_WRITE_FAILED(key, (error as Error).message));
      throw error;
    }
  }

  async delete(key: string): Promise<void> {
    try {
      await this.client.del(key);
    } catch (error) {
      this.logger?.error?.(FEATURE_FLAG_ERROR_MESSAGES.REDIS_DELETE_FAILED(key, (error as Error).message));
      throw error;
    }
  }
}

/**
 * In-memory feature flag store for development or standalone use.
 */
export class MemoryFeatureFlagStore implements IFeatureFlagStore {
  private readonly store = new Map<string, boolean>();

  async get(key: string): Promise<boolean | null> {
    const val = this.store.get(key);
    return val !== undefined ? val : null;
  }

  async set(key: string, enabled: boolean): Promise<void> {
    this.store.set(key, enabled);
  }

  async delete(key: string): Promise<void> {
    this.store.delete(key);
  }
}

/**
 * Read-only feature flag store backed by process/env variables.
 * Works with FeatureFlagService keys such as `feature:MY_FLAG:global`
 * by resolving `MY_FLAG` from the environment.
 */
export class EnvFeatureFlagStore implements IFeatureFlagStore {
  constructor(private readonly options: EnvFeatureFlagStoreOptions = {}) {}

  async get(key: string): Promise<boolean | null> {
    const envKey = this.extractFlagKey(key);
    if (!envKey) {
      return null;
    }

    const value = (this.options.env ?? process.env)[envKey];
    if (value === undefined) {
      return null;
    }

    const normalized = value.trim().toLowerCase();
    if (['1', 'true', 'yes', 'on'].includes(normalized)) return true;
    if (['0', 'false', 'no', 'off'].includes(normalized)) return false;

    this.options.logger?.warn?.(FEATURE_FLAG_ERROR_MESSAGES.INVALID_BOOLEAN_ENV_VALUE(envKey, value));
    return null;
  }

  async set(key: string, _enabled: boolean): Promise<void> {
    throw new Error(FEATURE_FLAG_ERROR_MESSAGES.ENV_STORE_READ_ONLY_SET(key));
  }

  async delete(key: string): Promise<void> {
    throw new Error(FEATURE_FLAG_ERROR_MESSAGES.ENV_STORE_READ_ONLY_DELETE(key));
  }

  private extractFlagKey(storageKey: string): string | null {
    const match = /^feature:(.+):(?:global|tenant:.+)$/.exec(storageKey);
    return match?.[1] ?? null;
  }
}

/**
 * Local cache entry to prevent spamming the store.
 */
type CacheEntry = {
  value: boolean | null;
  expiresAt: number;
};

export const FEATURE_FLAG_TIME = {
  LOCAL_CACHE_TTL_MS: 5_000,
} as const;

/**
 * Service to evaluate and manage feature flags.
 * Hierarchy: Tenant Override > Global > DefaultValue.
 */
export class FeatureFlagService {
  private readonly localCache = new Map<string, CacheEntry>();
  private readonly CACHE_TTL_MS = FEATURE_FLAG_TIME.LOCAL_CACHE_TTL_MS;

  constructor(
    private readonly store: IFeatureFlagStore,
    private readonly logger?: { warn?(msg: string): void }
  ) {}

  private getGlobalKey(flagKey: string): string {
    return `feature:${flagKey}:global`;
  }

  private getTenantKey(flagKey: string, tenantId: string): string {
    return `feature:${flagKey}:tenant:${tenantId}`;
  }

  private async fetchWithCache(key: string): Promise<boolean | null> {
    const cached = this.localCache.get(key);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.value;
    }

    try {
      const val = await this.store.get(key);
      if (val !== null) {
        this.localCache.set(key, {
          value: val,
          expiresAt: Date.now() + this.CACHE_TTL_MS,
        });
      }
      return val;
    } catch (error) {
      this.logger?.warn?.(FEATURE_FLAG_ERROR_MESSAGES.STORE_RESOLUTION_FAILED(key, (error as Error).message));
      return null; // On error, treat as not configured to fallback to default
    }
  }

  /**
   * Evaluate if a feature is enabled.
   * Resolves in order:
   * 1. Tenant-specific override (if context.tenantId provided)
   * 2. Global setting
   * 3. Default value
   */
  async isEnabled(flagKey: string, context?: FeatureFlagContext, defaultValue = false): Promise<boolean> {
    if (context?.tenantId) {
      const tenantKey = this.getTenantKey(flagKey, context.tenantId);
      const tenantVal = await this.fetchWithCache(tenantKey);
      if (tenantVal !== null) {
        return tenantVal;
      }
    }

    const globalKey = this.getGlobalKey(flagKey);
    const globalVal = await this.fetchWithCache(globalKey);
    if (globalVal !== null) {
      return globalVal;
    }

    return defaultValue;
  }

  async setGlobal(flagKey: string, enabled: boolean): Promise<void> {
    const key = this.getGlobalKey(flagKey);
    await this.store.set(key, enabled);
    this.clearCache(flagKey); // Invalidate local cache
  }

  async setTenant(flagKey: string, tenantId: string, enabled: boolean): Promise<void> {
    const key = this.getTenantKey(flagKey, tenantId);
    await this.store.set(key, enabled);
    this.clearCache(flagKey);
  }

  async clearTenant(flagKey: string, tenantId: string): Promise<void> {
    const key = this.getTenantKey(flagKey, tenantId);
    await this.store.delete(key);
    this.clearCache(flagKey);
  }

  async clearGlobal(flagKey: string): Promise<void> {
    const key = this.getGlobalKey(flagKey);
    await this.store.delete(key);
    this.clearCache(flagKey);
  }

  /**
   * Clears the short-lived local cache.
   * If flagKey is provided, clears only keys related to that flag.
   */
  clearCache(flagKey?: string): void {
    if (!flagKey) {
      this.localCache.clear();
      return;
    }

    // Clear any cache entry that belongs to this flagKey
    const prefix = `feature:${flagKey}:`;
    for (const key of this.localCache.keys()) {
      if (key.startsWith(prefix)) {
        this.localCache.delete(key);
      }
    }
  }
}
