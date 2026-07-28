import assert from 'node:assert/strict';
import test from 'node:test';
import {
  AUDIT_LOG_SANITIZER_DEFAULTS,
  AuditLog,
  AuditLogModule,
  AuditLogSchema,
  AuditLoggerService,
  sanitizeAuditObject,
  sanitizeAuditPayload,
} from './index';

test('AuditLogModule.register exports AuditLoggerService', () => {
  const dynamicModule = AuditLogModule.register();

  assert.equal(dynamicModule.module, AuditLogModule);
  assert.ok(dynamicModule.providers?.includes(AuditLoggerService));
  assert.ok(dynamicModule.exports?.includes(AuditLoggerService));
  assert.equal(dynamicModule.imports?.length, 1);
});

test('AuditLogSchema exposes the expected operational indexes', () => {
  const indexes = AuditLogSchema.indexes();
  const signatures = indexes.map(([spec]) => JSON.stringify(spec));

  assert.ok(signatures.includes(JSON.stringify({ createdAt: -1 })));
  assert.ok(signatures.includes(JSON.stringify({ tenantId: 1, createdAt: -1 })));
  assert.ok(signatures.includes(JSON.stringify({ userId: 1 })));
  assert.ok(signatures.includes(JSON.stringify({ action: 1 })));
  assert.ok(signatures.includes(JSON.stringify({ entity: 1, entityId: 1 })));
});

test('AuditLoggerService.log persists and list applies filters', async () => {
  const created: unknown[] = [];
  let capturedFilter: Record<string, unknown> | undefined;

  const model = {
    async create(payload: unknown) {
      created.push(payload);
      return payload;
    },
    find(filter: Record<string, unknown>) {
      capturedFilter = filter;
      return {
        sort() {
          return {
            limit() {
              return {
                async exec() {
                  return [{ action: 'created' }] as Array<Partial<AuditLog>>;
                },
              };
            },
          };
        },
      };
    },
  };

  const service = new AuditLoggerService(model as never);

  await service.log({ tenantId: 'tenant-1', action: 'created', entity: 'order' });
  const result = await service.list({
    tenantId: 'tenant-1',
    actor: 'user-1',
    action: 'created',
    entity: 'order',
    date: '2026-05-15',
    limit: 10,
  });

  assert.equal(created.length, 1);
  assert.deepEqual(result.items, [{ action: 'created' }]);
  assert.equal(capturedFilter?.tenantId, 'tenant-1');
  assert.equal(capturedFilter?.userId, 'user-1');
  assert.equal(capturedFilter?.action, 'created');
  assert.equal(capturedFilter?.entity, 'order');
  assert.ok(capturedFilter?.createdAt);
});

test('sanitizeAuditObject masks configured sensitive keys recursively', () => {
  const sanitized = sanitizeAuditObject({
    email: 'user@example.test',
    password: 'plain',
    nested: {
      refreshToken: 'secret-token',
      keep: true,
    },
    list: [
      { apiKey: 'abc', value: 1 },
    ],
  });

  assert.equal(sanitized.email, 'user@example.test');
  assert.equal(sanitized.password, AUDIT_LOG_SANITIZER_DEFAULTS.REPLACEMENT);
  assert.deepEqual(sanitized.nested, {
    refreshToken: AUDIT_LOG_SANITIZER_DEFAULTS.REPLACEMENT,
    keep: true,
  });
  assert.deepEqual(sanitized.list, [
    { apiKey: AUDIT_LOG_SANITIZER_DEFAULTS.REPLACEMENT, value: 1 },
  ]);
});

test('sanitizeAuditPayload normalizes dates, buffers, bigint, and circular references', () => {
  const circular: Record<string, unknown> = { name: 'root' };
  circular.self = circular;

  const sanitized = sanitizeAuditPayload({
    at: new Date('2026-05-15T00:00:00.000Z'),
    raw: Buffer.from('payload'),
    amount: BigInt(42),
    circular,
  });

  assert.deepEqual(sanitized, {
    at: '2026-05-15T00:00:00.000Z',
    raw: AUDIT_LOG_SANITIZER_DEFAULTS.BUFFER_REPLACEMENT,
    amount: '42',
    circular: {
      name: 'root',
      self: AUDIT_LOG_SANITIZER_DEFAULTS.CIRCULAR_REPLACEMENT,
    },
  });
});
