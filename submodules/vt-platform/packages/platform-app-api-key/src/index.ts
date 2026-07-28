import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import * as ipaddrNamespace from 'ipaddr.js';
import type {
  AppApiKeyAuditPort,
  AppApiKeyRegistryPort,
  AppApiNonceStorePort,
  AppApiUsageStorePort,
} from './ports.js';

export const APP_API_SCOPES = [
  'product:read',
  'product:write',
  'pricing:read',
  'pricing:write',
  'history:read',
  'history:write',
  'conversation:read',
  'answer:request',
  'extension:bridge',
  'debug:read',
  'knowledge:write',
  'knowledge:read',
  'appkey:admin',
] as const;

export type AppApiScope = (typeof APP_API_SCOPES)[number];

export function isAppApiScope(value: string): value is AppApiScope {
  return (APP_API_SCOPES as readonly string[]).includes(value);
}

export interface AppApiKeyRecord {
  id: string;
  tenantId: string;
  keyPrefix: string;
  secretHash: string;
  scopes: AppApiScope[];
  status: 'active' | 'revoked';
  label?: string;
  signaturePolicy: 'optional' | 'required';
  allowedClockSkewMs: number;
  replayWindowMs: number;
  rateLimitPerMinute?: number;
  dailyQuota?: number;
  channelAccountIds?: string[];
  allowedOrigins?: string[];
  allowedCidrs?: string[];
}

export interface AuthenticatedApp {
  keyId: string;
  tenantId: string;
  scopes: AppApiScope[];
  signed: boolean;
  channelAccountIds?: string[];
}

export interface AppApiSignedRequestHeaders {
  timestamp: string;
  nonce: string;
  signature: string;
}

export interface AppApiSignedRequestInput {
  method: string;
  pathWithQuery: string;
  body: Buffer;
  headers?: AppApiSignedRequestHeaders;
  nowMs?: number;
}

export interface AppApiReplayGuard {
  assertAndStore(input: {
    keyId: string;
    nonce: string;
    nowMs: number;
    replayWindowMs: number;
  }): void;
}

export interface AppApiRateLimitGuard {
  assertAndConsume(input: {
    keyId: string;
    nowMs: number;
    rateLimitPerMinute?: number;
    dailyQuota?: number;
  }): void;
}

export interface AppApiKeyAuthAuditEvent {
  tenantId?: string;
  keyId?: string;
  keyPrefix?: string;
  outcome: 'success' | 'failure';
  requiredScopes: AppApiScope[];
  signed: boolean;
  errorCode?: string;
}

export class AppApiKeyError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'AppApiKeyError';
  }
}

type IpAddrRuntime = typeof import('ipaddr.js');
const ipaddr = ((ipaddrNamespace as unknown as { default?: IpAddrRuntime }).default
  ?? ipaddrNamespace) as unknown as IpAddrRuntime;

function matchesParsedCidr(address: ReturnType<typeof ipaddr.process>, range: ReturnType<typeof ipaddr.parseCIDR>): boolean {
  return (address as unknown as { match(value: unknown): boolean }).match(range);
}

export function hashAppApiKey(plainKey: string): string {
  return createHash('sha256').update(plainKey, 'utf8').digest('hex');
}

export function hashRequestBody(body: Buffer): string {
  return createHash('sha256').update(body).digest('hex');
}

export function buildSignedRequestCanonicalString(input: {
  method: string;
  pathWithQuery: string;
  timestamp: string;
  nonce: string;
  bodySha256: string;
}): string {
  return [
    input.method.toUpperCase(),
    input.pathWithQuery,
    input.timestamp,
    input.nonce,
    input.bodySha256,
  ].join('\n');
}

function signatureKeyFromSecretHash(secretHash: string): Buffer {
  return Buffer.from(secretHash, 'hex');
}

export function signAppApiRequest(input: {
  plainKey: string;
  method: string;
  pathWithQuery: string;
  timestamp: string;
  nonce: string;
  body: Buffer | string;
}): string {
  const bodyBuffer = Buffer.isBuffer(input.body) ? input.body : Buffer.from(input.body, 'utf8');
  const bodySha256 = hashRequestBody(bodyBuffer);
  const canonical = buildSignedRequestCanonicalString({
    method: input.method,
    pathWithQuery: input.pathWithQuery,
    timestamp: input.timestamp,
    nonce: input.nonce,
    bodySha256,
  });
  return createHmac('sha256', signatureKeyFromSecretHash(hashAppApiKey(input.plainKey)))
    .update(canonical, 'utf8')
    .digest('hex');
}

export function generateAppApiPlainKey(): string {
  return `ak_${randomBytes(24).toString('hex')}`;
}

function normalizeBoundValues(values: string[] | undefined): string[] | undefined {
  if (!values) return undefined;
  const normalized = [...new Set(values.map((value) => value.trim()).filter(Boolean))];
  return normalized.length > 0 ? normalized : undefined;
}

function normalizeOrigin(value: string): string {
  const normalized = value.trim().replace(/\/$/, '');
  if (!/^[a-z][a-z0-9+.-]*:\/\/[^\s/]+$/i.test(normalized)) {
    throw new AppApiKeyError('APP_KEY_ORIGIN_INVALID', `Invalid allowed origin: ${value}`);
  }
  return normalized;
}

export function normalizeAllowedOrigins(values: string[] | undefined): string[] | undefined {
  const normalizedValues = normalizeBoundValues(values);
  if (!normalizedValues) return undefined;
  return [...new Set(normalizedValues.map(normalizeOrigin))];
}

export function normalizeAllowedCidrs(values: string[] | undefined): string[] | undefined {
  const normalizedValues = normalizeBoundValues(values);
  if (!normalizedValues) return undefined;
  return [...new Set(normalizedValues.map((value) => {
    try {
      ipaddr.parseCIDR(value);
    } catch {
      throw new AppApiKeyError('APP_KEY_CIDR_INVALID', `Invalid allowed CIDR: ${value}`);
    }
    return value;
  }))];
}

export function isIpAllowedByCidrs(ip: string, cidrs: string[]): boolean {
  if (!ipaddr.isValid(ip)) return false;
  const address = ipaddr.process(ip);
  return cidrs.some((cidr) => {
    try {
      const range = ipaddr.parseCIDR(cidr);
      return matchesParsedCidr(address, range);
    } catch {
      return false;
    }
  });
}

export function createStaticAppApiKeyRecord(input: {
  id: string;
  tenantId: string;
  plainKey: string;
  scopes: AppApiScope[];
  label?: string;
  status?: 'active' | 'revoked';
  signaturePolicy?: 'optional' | 'required';
  allowedClockSkewMs?: number;
  replayWindowMs?: number;
  rateLimitPerMinute?: number;
  dailyQuota?: number;
  channelAccountIds?: string[];
  allowedOrigins?: string[];
  allowedCidrs?: string[];
}): AppApiKeyRecord {
  const normalizedKey = input.plainKey.trim();
  if (!normalizedKey) {
    throw new AppApiKeyError('APP_KEY_EMPTY', 'plain app key is required');
  }
  return {
    id: input.id,
    tenantId: input.tenantId,
    keyPrefix: normalizedKey.slice(0, 12),
    secretHash: hashAppApiKey(normalizedKey),
    scopes: [...new Set(input.scopes)],
    status: input.status ?? 'active',
    label: input.label,
    signaturePolicy: input.signaturePolicy ?? 'optional',
    allowedClockSkewMs: input.allowedClockSkewMs ?? 5 * 60_000,
    replayWindowMs: input.replayWindowMs ?? 5 * 60_000,
    rateLimitPerMinute: input.rateLimitPerMinute,
    dailyQuota: input.dailyQuota,
    channelAccountIds: normalizeBoundValues(input.channelAccountIds),
    allowedOrigins: normalizeAllowedOrigins(input.allowedOrigins),
    allowedCidrs: normalizeAllowedCidrs(input.allowedCidrs),
  };
}

export function issueAppApiKey(input: {
  id: string;
  tenantId: string;
  scopes: AppApiScope[];
  label?: string;
  status?: 'active' | 'revoked';
  signaturePolicy?: 'optional' | 'required';
  allowedClockSkewMs?: number;
  replayWindowMs?: number;
  rateLimitPerMinute?: number;
  dailyQuota?: number;
  channelAccountIds?: string[];
  allowedOrigins?: string[];
  allowedCidrs?: string[];
}): {
  plainKey: string;
  record: AppApiKeyRecord;
} {
  const plainKey = generateAppApiPlainKey();
  return {
    plainKey,
    record: createStaticAppApiKeyRecord({
      ...input,
      plainKey,
    }),
  };
}

export function readPlainAppApiKey(input: {
  authorizationHeader?: string | string[];
  appApiKeyHeader?: string | string[];
}): string {
  const header = Array.isArray(input.authorizationHeader)
    ? input.authorizationHeader[0]
    : input.authorizationHeader;
  const apiKeyHeader = Array.isArray(input.appApiKeyHeader)
    ? input.appApiKeyHeader[0]
    : input.appApiKeyHeader;
  const bearer = header?.startsWith('Bearer ') ? header.slice('Bearer '.length) : undefined;
  const plain = bearer ?? apiKeyHeader;
  if (!plain?.trim()) {
    throw new AppApiKeyError('APP_KEY_MISSING', 'App API Key is required');
  }
  return plain.trim();
}

function readHeaderValue(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

export function readAppApiSignedHeaders(input: {
  timestampHeader?: string | string[];
  nonceHeader?: string | string[];
  signatureHeader?: string | string[];
}): AppApiSignedRequestHeaders | undefined {
  const timestamp = readHeaderValue(input.timestampHeader)?.trim();
  const nonce = readHeaderValue(input.nonceHeader)?.trim();
  const signature = readHeaderValue(input.signatureHeader)?.trim();
  if (!timestamp && !nonce && !signature) return undefined;
  if (!timestamp) {
    throw new AppApiKeyError('APP_SIGNATURE_TIMESTAMP_MISSING', 'Signed request timestamp is required');
  }
  if (!nonce) {
    throw new AppApiKeyError('APP_SIGNATURE_NONCE_MISSING', 'Signed request nonce is required');
  }
  if (!signature) {
    throw new AppApiKeyError('APP_SIGNATURE_MISSING', 'Signed request signature is required');
  }
  return { timestamp, nonce, signature };
}

function hashEquals(leftHex: string, rightHex: string): boolean {
  const left = Buffer.from(leftHex, 'hex');
  const right = Buffer.from(rightHex, 'hex');
  if (left.byteLength !== right.byteLength) return false;
  return timingSafeEqual(left, right);
}

export function resolveAppApiKeyRecord(plainKey: string, records: AppApiKeyRecord[]): AppApiKeyRecord | undefined {
  const normalized = plainKey.trim();
  const prefix = normalized.slice(0, 12);
  const hash = hashAppApiKey(normalized);
  return records.find((candidate) =>
    candidate.keyPrefix === prefix && hashEquals(candidate.secretHash, hash),
  );
}

function parseTimestampMs(raw: string): number {
  if (/^\d+$/.test(raw)) {
    const parsed = Number(raw);
    if (Number.isFinite(parsed)) return parsed;
  }
  const parsed = Date.parse(raw);
  if (!Number.isNaN(parsed)) return parsed;
  throw new AppApiKeyError('APP_SIGNATURE_TIMESTAMP_INVALID', 'Signed request timestamp is invalid');
}

export function verifyAppApiSignedRequest(input: {
  record: AppApiKeyRecord;
  signedRequest: AppApiSignedRequestInput;
  replayGuard?: AppApiReplayGuard;
}): void {
  const headers = input.signedRequest.headers;
  if (!headers) {
    if (input.record.signaturePolicy === 'required') {
      throw new AppApiKeyError('APP_SIGNATURE_REQUIRED', 'Signed request is required for this App API Key');
    }
    return;
  }

  const nowMs = input.signedRequest.nowMs ?? Date.now();
  const timestampMs = parseTimestampMs(headers.timestamp);
  const driftMs = Math.abs(nowMs - timestampMs);
  if (driftMs > input.record.allowedClockSkewMs) {
    throw new AppApiKeyError('APP_SIGNATURE_TIMESTAMP_EXPIRED', 'Signed request timestamp is outside allowed window');
  }

  const bodySha256 = hashRequestBody(input.signedRequest.body);
  const canonical = buildSignedRequestCanonicalString({
    method: input.signedRequest.method,
    pathWithQuery: input.signedRequest.pathWithQuery,
    timestamp: headers.timestamp,
    nonce: headers.nonce,
    bodySha256,
  });
  const expectedSignature = createHmac('sha256', signatureKeyFromSecretHash(input.record.secretHash))
    .update(canonical, 'utf8')
    .digest('hex');
  if (!hashEquals(expectedSignature, headers.signature)) {
    throw new AppApiKeyError('APP_SIGNATURE_INVALID', 'Signed request signature is invalid');
  }

  input.replayGuard?.assertAndStore({
    keyId: input.record.id,
    nonce: headers.nonce,
    nowMs,
    replayWindowMs: input.record.replayWindowMs,
  });
}

export function authenticateAppApiKey(input: {
  plainKey: string;
  records: AppApiKeyRecord[];
  requiredScopes: AppApiScope[];
  signedRequest?: AppApiSignedRequestInput;
  requestOrigin?: string;
  remoteAddress?: string;
  replayGuard?: AppApiReplayGuard;
  rateLimitGuard?: AppApiRateLimitGuard;
  onAudit?: (event: AppApiKeyAuthAuditEvent) => void;
}): AuthenticatedApp {
  const plainKey = input.plainKey.trim();
  const prefix = plainKey.slice(0, 12);
  const signed = Boolean(input.signedRequest?.headers);
  const record = resolveAppApiKeyRecord(plainKey, input.records);
  if (!record) {
    input.onAudit?.({
      keyPrefix: prefix,
      outcome: 'failure',
      requiredScopes: input.requiredScopes,
      signed,
      errorCode: 'APP_KEY_INVALID',
    });
    throw new AppApiKeyError('APP_KEY_INVALID', 'App API Key is invalid');
  }
  if (record.status !== 'active') {
    input.onAudit?.({
      tenantId: record.tenantId,
      keyId: record.id,
      keyPrefix: record.keyPrefix,
      outcome: 'failure',
      requiredScopes: input.requiredScopes,
      signed,
      errorCode: 'APP_KEY_REVOKED',
    });
    throw new AppApiKeyError('APP_KEY_REVOKED', 'App API Key is revoked');
  }
  const missingScopes = input.requiredScopes.filter((scope) => !record.scopes.includes(scope));
  if (missingScopes.length > 0) {
    input.onAudit?.({
      tenantId: record.tenantId,
      keyId: record.id,
      keyPrefix: record.keyPrefix,
      outcome: 'failure',
      requiredScopes: input.requiredScopes,
      signed,
      errorCode: 'APP_KEY_SCOPE_DENIED',
    });
    throw new AppApiKeyError('APP_KEY_SCOPE_DENIED', 'App API Key is missing required scope');
  }
  if (record.allowedOrigins && record.allowedOrigins.length > 0) {
    let requestOrigin: string | undefined;
    try {
      requestOrigin = input.requestOrigin ? normalizeOrigin(input.requestOrigin) : undefined;
    } catch (error) {
      input.onAudit?.({
        tenantId: record.tenantId,
        keyId: record.id,
        keyPrefix: record.keyPrefix,
        outcome: 'failure',
        requiredScopes: input.requiredScopes,
        signed,
        errorCode: error instanceof AppApiKeyError ? error.code : 'APP_KEY_ORIGIN_INVALID',
      });
      throw error;
    }
    if (!requestOrigin || !record.allowedOrigins.includes(requestOrigin)) {
      input.onAudit?.({
        tenantId: record.tenantId,
        keyId: record.id,
        keyPrefix: record.keyPrefix,
        outcome: 'failure',
        requiredScopes: input.requiredScopes,
        signed,
        errorCode: 'APP_KEY_ORIGIN_DENIED',
      });
      throw new AppApiKeyError('APP_KEY_ORIGIN_DENIED', 'App API Key origin is not allowed');
    }
  }
  if (record.allowedCidrs && record.allowedCidrs.length > 0) {
    const remoteAddress = input.remoteAddress?.trim();
    if (!remoteAddress || !isIpAllowedByCidrs(remoteAddress, record.allowedCidrs)) {
      input.onAudit?.({
        tenantId: record.tenantId,
        keyId: record.id,
        keyPrefix: record.keyPrefix,
        outcome: 'failure',
        requiredScopes: input.requiredScopes,
        signed,
        errorCode: 'APP_KEY_CIDR_DENIED',
      });
      throw new AppApiKeyError('APP_KEY_CIDR_DENIED', 'App API Key IP is not allowed');
    }
  }
  try {
    verifyAppApiSignedRequest({
      record,
      signedRequest: input.signedRequest ?? {
        method: 'GET',
        pathWithQuery: '/',
        body: Buffer.alloc(0),
      },
      replayGuard: input.replayGuard,
    });
  } catch (error) {
    input.onAudit?.({
      tenantId: record.tenantId,
      keyId: record.id,
      keyPrefix: record.keyPrefix,
      outcome: 'failure',
      requiredScopes: input.requiredScopes,
      signed,
      errorCode: error instanceof AppApiKeyError ? error.code : 'APP_SIGNATURE_INVALID',
    });
    throw error;
  }
  try {
    input.rateLimitGuard?.assertAndConsume({
      keyId: record.id,
      nowMs: input.signedRequest?.nowMs ?? Date.now(),
      rateLimitPerMinute: record.rateLimitPerMinute,
      dailyQuota: record.dailyQuota,
    });
  } catch (error) {
    input.onAudit?.({
      tenantId: record.tenantId,
      keyId: record.id,
      keyPrefix: record.keyPrefix,
      outcome: 'failure',
      requiredScopes: input.requiredScopes,
      signed,
      errorCode: error instanceof AppApiKeyError ? error.code : 'APP_KEY_RATE_LIMITED',
    });
    throw error;
  }
  input.onAudit?.({
    tenantId: record.tenantId,
    keyId: record.id,
    keyPrefix: record.keyPrefix,
    outcome: 'success',
    requiredScopes: input.requiredScopes,
    signed,
  });
  return {
    keyId: record.id,
    tenantId: record.tenantId,
    scopes: record.scopes,
    signed: Boolean(input.signedRequest?.headers),
    channelAccountIds: record.channelAccountIds,
  };
}

export async function authenticateAppApiKeyWithPorts(input: {
  plainKey: string;
  requiredScopes: AppApiScope[];
  signedRequest: AppApiSignedRequestInput;
  registry: AppApiKeyRegistryPort;
  nonceStore?: AppApiNonceStorePort;
  usageStore?: AppApiUsageStorePort;
  audit?: AppApiKeyAuditPort;
}): Promise<AuthenticatedApp> {
  const plainKey = input.plainKey.trim();
  const keyPrefix = plainKey.slice(0, 12);
  const signed = Boolean(input.signedRequest.headers);
  const candidates = await input.registry.findCandidates(keyPrefix);
  const record = resolveAppApiKeyRecord(plainKey, [...candidates]);
  const appendAudit = async (outcome: 'success' | 'failure', errorCode?: string) => {
    await input.audit?.append({
      tenantId: record?.tenantId,
      keyId: record?.id,
      keyPrefix,
      outcome,
      requiredScopes: input.requiredScopes,
      signed,
      errorCode,
      occurredAt: new Date(input.signedRequest.nowMs ?? Date.now()),
    });
  };

  try {
    if (!record) throw new AppApiKeyError('APP_KEY_INVALID', 'App API Key is invalid');
    if (record.status !== 'active') {
      throw new AppApiKeyError('APP_KEY_REVOKED', 'App API Key is revoked');
    }
    const missingScopes = input.requiredScopes.filter((scope) => !record.scopes.includes(scope));
    if (missingScopes.length > 0) {
      throw new AppApiKeyError('APP_KEY_SCOPE_DENIED', 'App API Key is missing required scope');
    }
    verifyAppApiSignedRequest({ record, signedRequest: input.signedRequest });
    const nowMs = input.signedRequest.nowMs ?? Date.now();
    if (input.signedRequest.headers && input.nonceStore) {
      const consumed = await input.nonceStore.consume({
        tenantId: record.tenantId,
        keyId: record.id,
        nonce: input.signedRequest.headers.nonce,
        expiresAt: new Date(nowMs + record.replayWindowMs),
      });
      if (!consumed) {
        throw new AppApiKeyError('APP_SIGNATURE_REPLAYED', 'Signed request nonce has already been used');
      }
    }
    if (input.usageStore) {
      const usage = await input.usageStore.consume({
        tenantId: record.tenantId,
        keyId: record.id,
        now: new Date(nowMs),
        rateLimitPerMinute: record.rateLimitPerMinute,
        dailyQuota: record.dailyQuota,
      });
      if (record.rateLimitPerMinute !== undefined && usage.minuteCount > record.rateLimitPerMinute) {
        throw new AppApiKeyError('APP_KEY_RATE_LIMITED', 'App API Key rate limit exceeded');
      }
      if (record.dailyQuota !== undefined && usage.dailyCount > record.dailyQuota) {
        throw new AppApiKeyError('APP_KEY_DAILY_QUOTA_EXCEEDED', 'App API Key daily quota exceeded');
      }
    }
    await input.registry.touchLastUsed({
      keyId: record.id,
      tenantId: record.tenantId,
      usedAt: new Date(nowMs),
    });
    await appendAudit('success');
    return {
      keyId: record.id,
      tenantId: record.tenantId,
      scopes: record.scopes,
      signed,
    };
  } catch (error) {
    await appendAudit(
      'failure',
      error instanceof AppApiKeyError ? error.code : 'APP_KEY_AUTH_FAILED',
    );
    throw error;
  }
}
