export const SYSTEM_LOG_LEVELS = {
  DEBUG: 'debug',
  INFO: 'info',
  WARN: 'warn',
  ERROR: 'error',
} as const;

export type SystemLogLevel = typeof SYSTEM_LOG_LEVELS[keyof typeof SYSTEM_LOG_LEVELS];

export const SYSTEM_LOG_HTTP_STATUS_RANGES = {
  CLIENT_ERROR_MIN: 400,
  SERVER_ERROR_MIN: 500,
} as const;

export const SYSTEM_LOG_MESSAGES = {
  HTTP_REQUEST: 'http.request',
} as const;

export const SYSTEM_LOG_EVENTS = {
  RESPONSE_FINISH: 'finish',
} as const;

export const SYSTEM_LOG_REDACTION = {
  MASK: '[REDACTED]',
} as const;

export type SystemLogFinishEvent = typeof SYSTEM_LOG_EVENTS.RESPONSE_FINISH;

export interface SystemLogRecord {
  timestamp: string;
  level: SystemLogLevel;
  message: string;
  context?: string;
  requestId?: string;
  tenantId?: string;
  userId?: string;
  method?: string;
  path?: string;
  statusCode?: number;
  durationMs?: number;
  ip?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
}

export interface SystemLogger {
  write(record: SystemLogRecord): void;
}

export interface ConsoleJsonSystemLoggerOptions {
  writer?: Pick<Console, 'debug' | 'info' | 'warn' | 'error'>;
}

export class ConsoleJsonSystemLogger implements SystemLogger {
  private readonly writer: Pick<Console, 'debug' | 'info' | 'warn' | 'error'>;

  constructor(options: ConsoleJsonSystemLoggerOptions = {}) {
    this.writer = options.writer ?? console;
  }

  write(record: SystemLogRecord): void {
    const line = JSON.stringify(normalizeLogRecord(record));
    if (record.level === SYSTEM_LOG_LEVELS.ERROR) {
      this.writer.error(line);
      return;
    }
    if (record.level === SYSTEM_LOG_LEVELS.WARN) {
      this.writer.warn(line);
      return;
    }
    if (record.level === SYSTEM_LOG_LEVELS.DEBUG) {
      this.writer.debug(line);
      return;
    }
    this.writer.info(line);
  }
}

export interface RequestLike {
  method?: string;
  originalUrl?: string;
  url?: string;
  path?: string;
  ip?: string;
  headers?: Record<string, string | string[] | undefined>;
  user?: Record<string, unknown>;
  tenantId?: string;
}

export interface ResponseLike {
  statusCode?: number;
  once?(event: SystemLogFinishEvent, listener: () => void): unknown;
  on?(event: SystemLogFinishEvent, listener: () => void): unknown;
}

export interface HttpRequestLogInput {
  request: RequestLike;
  statusCode?: number;
  durationMs: number;
  now?: Date;
  context?: string;
  requestId?: string;
  tenantId?: string;
  userId?: string;
  metadata?: Record<string, unknown>;
}

export interface HttpRequestLoggerOptions {
  logger?: SystemLogger;
  context?: string;
  skipPaths?: readonly (string | RegExp)[];
  getRequestId?: (request: RequestLike) => string | undefined;
  getTenantId?: (request: RequestLike) => string | undefined;
  getUserId?: (request: RequestLike) => string | undefined;
  getMetadata?: (request: RequestLike, response: ResponseLike) => Record<string, unknown> | undefined;
  now?: () => number;
}

const DEFAULT_REDACTED_HEADERS = new Set([
  'authorization',
  'cookie',
  'set-cookie',
  'x-api-key',
  'x-auth-token',
]);

export function redactHeaders(
  headers: Record<string, string | string[] | undefined>,
  redactedNames: ReadonlySet<string> = DEFAULT_REDACTED_HEADERS,
): Record<string, string | string[] | undefined> {
  return Object.fromEntries(
    Object.entries(headers).map(([name, value]) => [
      name,
      redactedNames.has(name.toLowerCase()) ? SYSTEM_LOG_REDACTION.MASK : value,
    ]),
  );
}

export function createHttpRequestLogRecord(input: HttpRequestLogInput): SystemLogRecord {
  const request = input.request;
  const statusCode = input.statusCode ?? 0;
  const headers = request.headers ?? {};
  return {
    timestamp: (input.now ?? new Date()).toISOString(),
    level: levelForStatusCode(statusCode),
    message: SYSTEM_LOG_MESSAGES.HTTP_REQUEST,
    context: input.context,
    requestId: input.requestId ?? headerValue(headers['x-request-id']),
    tenantId: input.tenantId ?? request.tenantId,
    userId: input.userId ?? stringValue(request.user?.sub ?? request.user?.id),
    method: request.method,
    path: readRequestPath(request),
    statusCode,
    durationMs: input.durationMs,
    ip: request.ip,
    userAgent: headerValue(headers['user-agent']),
    metadata: input.metadata,
  };
}

export function createHttpRequestLogger(options: HttpRequestLoggerOptions = {}) {
  const logger = options.logger ?? new ConsoleJsonSystemLogger();
  const now = options.now ?? Date.now;

  return (request: RequestLike, response: ResponseLike, next: () => void): void => {
    if (shouldSkipPath(request, options.skipPaths ?? [])) {
      next();
      return;
    }
    const startedAt = now();
    const writeLog = () => {
      logger.write(createHttpRequestLogRecord({
        request,
        statusCode: response.statusCode,
        durationMs: Math.max(0, now() - startedAt),
        context: options.context,
        requestId: options.getRequestId?.(request),
        tenantId: options.getTenantId?.(request),
        userId: options.getUserId?.(request),
        metadata: options.getMetadata?.(request, response),
      }));
    };

    if (typeof response.once === 'function') {
      response.once(SYSTEM_LOG_EVENTS.RESPONSE_FINISH, writeLog);
    } else if (typeof response.on === 'function') {
      response.on(SYSTEM_LOG_EVENTS.RESPONSE_FINISH, writeLog);
    }
    next();
  };
}

export function levelForStatusCode(statusCode: number): SystemLogLevel {
  if (statusCode >= SYSTEM_LOG_HTTP_STATUS_RANGES.SERVER_ERROR_MIN) return SYSTEM_LOG_LEVELS.ERROR;
  if (statusCode >= SYSTEM_LOG_HTTP_STATUS_RANGES.CLIENT_ERROR_MIN) return SYSTEM_LOG_LEVELS.WARN;
  return SYSTEM_LOG_LEVELS.INFO;
}

function shouldSkipPath(request: RequestLike, patterns: readonly (string | RegExp)[]): boolean {
  const path = readRequestPath(request);
  if (path === undefined) {
    return false;
  }

  return patterns.some((pattern) => (
    typeof pattern === 'string'
      ? path === pattern || path.startsWith(pattern)
      : pattern.test(path)
  ));
}

function normalizeLogRecord(record: SystemLogRecord): SystemLogRecord {
  return {
    ...record,
    metadata: record.metadata ? normalizeMetadata(record.metadata) : undefined,
  };
}

function normalizeMetadata(metadata: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(metadata).map(([key, value]) => [
      key,
      value instanceof Error
        ? { name: value.name, message: value.message, stack: value.stack }
        : value,
    ]),
  );
}

function readRequestPath(request: RequestLike): string | undefined {
  return request.originalUrl ?? request.url ?? request.path;
}

function headerValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function stringValue(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}
