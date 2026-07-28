import type { AppApiKeyRecord } from './index.js';

export interface AppApiKeyRegistryPort {
  findCandidates(keyPrefix: string): Promise<readonly AppApiKeyRecord[]>;
  insert(record: AppApiKeyRecord): Promise<void>;
  replace(record: AppApiKeyRecord): Promise<void>;
  touchLastUsed(input: { keyId: string; tenantId: string; usedAt: Date }): Promise<void>;
}

export interface AppApiNonceStorePort {
  consume(input: {
    tenantId: string;
    keyId: string;
    nonce: string;
    expiresAt: Date;
  }): Promise<boolean>;
}

export interface AppApiUsageStorePort {
  consume(input: {
    tenantId: string;
    keyId: string;
    now: Date;
    rateLimitPerMinute?: number;
    dailyQuota?: number;
  }): Promise<{ minuteCount: number; dailyCount: number }>;
}

export interface AppApiKeyAuditPort {
  append(input: {
    tenantId?: string;
    keyId?: string;
    keyPrefix?: string;
    outcome: 'success' | 'failure';
    requiredScopes: string[];
    signed: boolean;
    errorCode?: string;
    occurredAt: Date;
  }): Promise<void>;
}
