/**
 * @vt/platform-audit-log — Shared audit logging for all projects.
 *
 * Provides:
 * 1. AuditLog schema (Mongoose)
 * 2. AuditLoggerService (fire-and-forget write + query)
 * 3. AuditLogModule (dynamic NestJS module)
 */

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Model } from 'mongoose';
import { Injectable, Logger, Module, DynamicModule } from '@nestjs/common';
import { getModelToken, InjectModel, MongooseModule } from '@nestjs/mongoose';

export type AuditPayloadValue =
  | string
  | number
  | boolean
  | null
  | AuditPayloadValue[]
  | AuditPayloadObject;

export interface AuditPayloadObject {
  [key: string]: AuditPayloadValue;
}

export interface AuditPayloadSanitizerOptions {
  sensitiveKeys?: ReadonlyArray<string>;
  replacement?: string;
  bufferReplacement?: string;
  circularReplacement?: string;
}

const DEFAULT_SENSITIVE_KEYS = [
  'password',
  'secret',
  'token',
  'authorization',
  'apikey',
  'api_key',
  'access_token',
  'refresh_token',
];

export const AUDIT_LOG_SANITIZER_DEFAULTS = {
  REPLACEMENT: '***MASKED***',
  BUFFER_REPLACEMENT: '[BUFFER]',
  CIRCULAR_REPLACEMENT: '[Circular]',
} as const;

function isSensitiveKey(key: string, sensitiveKeys: ReadonlyArray<string>): boolean {
  const normalizedKey = key.toLowerCase();
  return sensitiveKeys.some((sensitiveKey) => normalizedKey.includes(sensitiveKey.toLowerCase()));
}

function sanitizeAuditValue(
  value: unknown,
  options: Required<AuditPayloadSanitizerOptions>,
  seen: WeakSet<object>,
): AuditPayloadValue {
  if (value === null) return null;
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'boolean') return value;
  if (value instanceof Date) return value.toISOString();
  if (Buffer.isBuffer(value)) return options.bufferReplacement;
  if (typeof value === 'bigint') return value.toString();
  if (typeof value === 'undefined' || typeof value === 'function' || typeof value === 'symbol') return null;

  if (Array.isArray(value)) {
    return value.map((entry) => sanitizeAuditValue(entry, options, seen));
  }

  if (typeof value === 'object') {
    const toHexString = (value as { toHexString?: unknown }).toHexString;
    if (typeof toHexString === 'function') {
      const converted = (toHexString as () => string).call(value);
      return converted.length > 0 ? converted : null;
    }

    if (seen.has(value)) {
      return options.circularReplacement;
    }
    seen.add(value);

    const sanitized: AuditPayloadObject = {};
    for (const [key, nestedValue] of Object.entries(value as Record<string, unknown>)) {
      sanitized[key] = isSensitiveKey(key, options.sensitiveKeys)
        ? options.replacement
        : sanitizeAuditValue(nestedValue, options, seen);
    }
    seen.delete(value);
    return sanitized;
  }

  return null;
}

export function sanitizeAuditPayload(
  value: unknown,
  options: AuditPayloadSanitizerOptions = {},
): AuditPayloadValue {
  return sanitizeAuditValue(value, {
    sensitiveKeys: options.sensitiveKeys ?? DEFAULT_SENSITIVE_KEYS,
    replacement: options.replacement ?? AUDIT_LOG_SANITIZER_DEFAULTS.REPLACEMENT,
    bufferReplacement: options.bufferReplacement ?? AUDIT_LOG_SANITIZER_DEFAULTS.BUFFER_REPLACEMENT,
    circularReplacement: options.circularReplacement ?? AUDIT_LOG_SANITIZER_DEFAULTS.CIRCULAR_REPLACEMENT,
  }, new WeakSet<object>());
}

export function sanitizeAuditObject(
  value: Record<string, unknown>,
  options: AuditPayloadSanitizerOptions = {},
): AuditPayloadObject {
  const sanitized = sanitizeAuditPayload(value, options);
  return sanitized && typeof sanitized === 'object' && !Array.isArray(sanitized)
    ? sanitized as AuditPayloadObject
    : {};
}

// ────────────────────────────────────────────────
// Schema
// ────────────────────────────────────────────────

@Schema({ collection: 'audit_logs', timestamps: true })
export class AuditLog {
  @Prop({ type: String })
  tenantId?: string;

  @Prop({ type: String })
  userId?: string;

  @Prop({ type: String })
  principalType?: string;

  @Prop({ type: String })
  principalId?: string;

  @Prop({ type: String, required: true })
  action!: string;

  @Prop({ type: String })
  entity?: string;

  @Prop({ type: String })
  entityId?: string;

  @Prop({ type: Object })
  payload?: AuditPayloadObject;

  @Prop({ type: String })
  ip?: string;

  @Prop({ type: String })
  userAgent?: string;

  @Prop({ type: String, index: true })
  requestId?: string;

  @Prop({ type: String, index: true })
  correlationId?: string;

  @Prop({ type: String })
  causationId?: string;

  @Prop({ type: String })
  eventId?: string;

  @Prop({ type: String })
  jobId?: string;

  @Prop({ type: String })
  outcome?: 'succeeded' | 'failed' | 'denied';
}

export type AuditLogDocument = AuditLog & Document;
export const AuditLogSchema = SchemaFactory.createForClass(AuditLog);

AuditLogSchema.index({ createdAt: -1 });
AuditLogSchema.index({ tenantId: 1, createdAt: -1 });
AuditLogSchema.index({ userId: 1 });
AuditLogSchema.index({ action: 1 });
AuditLogSchema.index({ entity: 1, entityId: 1 });
AuditLogSchema.index({ tenantId: 1, correlationId: 1, createdAt: -1 });

// ────────────────────────────────────────────────
// Data types
// ────────────────────────────────────────────────

export interface AuditLogEntry {
  tenantId?: string;
  userId?: string;
  principalType?: string;
  principalId?: string;
  action: string;
  entity?: string;
  entityId?: string;
  payload?: AuditPayloadObject;
  ip?: string;
  userAgent?: string;
  requestId?: string;
  correlationId?: string;
  causationId?: string;
  eventId?: string;
  jobId?: string;
  outcome?: 'succeeded' | 'failed' | 'denied';
}

export interface AuditLogQuery {
  tenantId?: string;
  actor?: string;
  action?: string;
  entity?: string;
  date?: string;
  limit?: number;
}

// ────────────────────────────────────────────────
// Service
// ────────────────────────────────────────────────

@Injectable()
export class AuditLoggerService {
  private readonly logger = new Logger(AuditLoggerService.name);

  constructor(
    @InjectModel(AuditLog.name) private readonly auditLogModel: Model<AuditLogDocument>,
  ) {}

  /**
   * Append an audit log entry.
   * Never throws — callers may await it when deterministic test shutdown matters.
   */
  log(data: AuditLogEntry): Promise<void> {
    return this.logOrThrow(data).catch((err: unknown) => {
      const stack = err instanceof Error ? err.stack : undefined;
      this.logger.error('Failed to write audit log:', stack);
    });
  }

  async logOrThrow(data: AuditLogEntry): Promise<void> {
    await this.auditLogModel.create({
      ...data,
      payload: data.payload ? sanitizeAuditObject(data.payload) : undefined,
    });
  }

  /**
   * Query audit logs with optional filters.
   */
  async list(query: AuditLogQuery = {}): Promise<{ items: AuditLogDocument[] }> {
    const filter: Record<string, unknown> = {};
    if (query.tenantId) filter['tenantId'] = query.tenantId;
    if (query.actor) filter['userId'] = query.actor;
    if (query.action) filter['action'] = query.action;
    if (query.entity) filter['entity'] = query.entity;
    if (query.date) {
      const start = new Date(query.date);
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setDate(start.getDate() + 1);
      filter['createdAt'] = { $gte: start, $lt: end };
    }

    const items = await this.auditLogModel
      .find(filter)
      .sort({ createdAt: -1 })
      .limit(query.limit ?? 50)
      .exec();

    return { items };
  }
}

// ────────────────────────────────────────────────
// Module
// ────────────────────────────────────────────────

@Module({})
export class AuditLogModule {
  static register(options: { connectionName?: string } = {}): DynamicModule {
    const connectionName = options.connectionName?.trim() || undefined;
    const serviceProvider = connectionName
      ? {
          provide: AuditLoggerService,
          inject: [getModelToken(AuditLog.name, connectionName)],
          useFactory: (model: Model<AuditLogDocument>) => new AuditLoggerService(model),
        }
      : AuditLoggerService;
    return {
      module: AuditLogModule,
      imports: [
        MongooseModule.forFeature(
          [{ name: AuditLog.name, schema: AuditLogSchema }],
          connectionName,
        ),
      ],
      providers: [serviceProvider],
      exports: [AuditLoggerService],
    };
  }
}
