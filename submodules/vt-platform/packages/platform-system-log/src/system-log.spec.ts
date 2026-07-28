import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { describe, it } from 'node:test';
import {
  ConsoleJsonSystemLogger,
  createHttpRequestLogger,
  createHttpRequestLogRecord,
  levelForStatusCode,
  redactHeaders,
  SYSTEM_LOG_EVENTS,
  SYSTEM_LOG_LEVELS,
  SYSTEM_LOG_MESSAGES,
  SYSTEM_LOG_HTTP_STATUS_RANGES,
  SYSTEM_LOG_REDACTION,
  type SystemLogRecord,
} from './system-log';

const HTTP_STATUS_OK = 200;
const HTTP_STATUS_CREATED = 201;
const HTTP_STATUS_NO_CONTENT = 204;
const HTTP_STATUS_NOT_FOUND = 404;

describe('platform-system-log', () => {
  it('redacts sensitive headers case-insensitively', () => {
    assert.deepEqual(redactHeaders({
      Authorization: 'Bearer secret',
      Cookie: 'sid=secret',
      'x-request-id': 'req-1',
    }), {
      Authorization: SYSTEM_LOG_REDACTION.MASK,
      Cookie: SYSTEM_LOG_REDACTION.MASK,
      'x-request-id': 'req-1',
    });
  });

  it('maps status codes to log levels', () => {
    assert.equal(levelForStatusCode(HTTP_STATUS_OK), SYSTEM_LOG_LEVELS.INFO);
    assert.equal(levelForStatusCode(HTTP_STATUS_NOT_FOUND), SYSTEM_LOG_LEVELS.WARN);
    assert.equal(levelForStatusCode(SYSTEM_LOG_HTTP_STATUS_RANGES.SERVER_ERROR_MIN), SYSTEM_LOG_LEVELS.ERROR);
  });

  it('builds a normalized http request record', () => {
    assert.deepEqual(createHttpRequestLogRecord({
      request: {
        method: 'GET',
        originalUrl: '/api/health',
        ip: '127.0.0.1',
        tenantId: 'tenant-1',
        user: { sub: 'user-1' },
        headers: {
          'x-request-id': 'req-1',
          'user-agent': 'tester',
        },
      },
      statusCode: HTTP_STATUS_OK,
      durationMs: 12,
      now: new Date('2026-01-01T00:00:00.000Z'),
      context: 'api',
    }), {
      timestamp: '2026-01-01T00:00:00.000Z',
      level: SYSTEM_LOG_LEVELS.INFO,
      message: SYSTEM_LOG_MESSAGES.HTTP_REQUEST,
      context: 'api',
      requestId: 'req-1',
      tenantId: 'tenant-1',
      userId: 'user-1',
      method: 'GET',
      path: '/api/health',
      statusCode: HTTP_STATUS_OK,
      durationMs: 12,
      ip: '127.0.0.1',
      userAgent: 'tester',
      metadata: undefined,
    });
  });

  it('logs on response finish', () => {
    const records: SystemLogRecord[] = [];
    const response = new EventEmitter() as EventEmitter & { statusCode: number };
    response.statusCode = HTTP_STATUS_CREATED;
    let clock = 100;

    createHttpRequestLogger({
      logger: { write: (record) => records.push(record) },
      now: () => clock,
    })({ method: 'POST', originalUrl: '/api/orders' }, response, () => undefined);

    clock = 125;
    response.emit(SYSTEM_LOG_EVENTS.RESPONSE_FINISH);

    assert.equal(records.length, 1);
    assert.equal(records[0].statusCode, HTTP_STATUS_CREATED);
    assert.equal(records[0].durationMs, 25);
  });

  it('does not skip requests with no path sentinel', () => {
    let nextCalled = false;

    createHttpRequestLogger({
      skipPaths: ['/api'],
    })({ method: 'GET' }, { statusCode: HTTP_STATUS_NO_CONTENT }, () => {
      nextCalled = true;
    });

    assert.equal(nextCalled, true);
  });

  it('writes JSON to the correct console method', () => {
    const lines: string[] = [];
    const logger = new ConsoleJsonSystemLogger({
      writer: {
        debug: (line: string) => lines.push(`debug:${line}`),
        info: (line: string) => lines.push(`info:${line}`),
        warn: (line: string) => lines.push(`warn:${line}`),
        error: (line: string) => lines.push(`error:${line}`),
      },
    });

    logger.write({
      timestamp: '2026-01-01T00:00:00.000Z',
      level: SYSTEM_LOG_LEVELS.ERROR,
      message: 'boom',
      metadata: { err: new Error('failed') },
    });

    assert.match(lines[0], /^error:/);
    assert.match(lines[0], /"message":"failed"/);
  });
});
