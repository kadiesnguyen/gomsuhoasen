import * as assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  APPLICATION_SCOPE_ERROR_MESSAGES,
  buildApplicationScopeEventMetadata,
  CORS_CONFIG_DEFAULT_MESSAGES,
  ENV_CONFIG_ERROR_MESSAGES,
  firstEnv,
  normalizeApplicationScopeId,
  requireEnv,
  requireFirstEnv,
  requireMongoUri,
  resolveApplicationScopeId,
  resolveCorsOriginEntries,
  resolveCorsOrigins,
} from './index';

test('requireEnv returns trimmed value and throws when missing', () => {
  assert.equal(requireEnv('API_KEY', { API_KEY: '  value  ' }), 'value');
  assert.throws(
    () => requireEnv('API_KEY', { API_KEY: '   ' }),
    new RegExp(ENV_CONFIG_ERROR_MESSAGES.REQUIRED('API_KEY')),
  );
});

test('firstEnv and requireFirstEnv resolve the first populated key', () => {
  assert.equal(firstEnv(['A', 'B'], { A: '', B: 'x' }), 'x');
  assert.equal(requireFirstEnv(['A', 'B'], { B: 'mongo' }), 'mongo');
  assert.throws(
    () => requireFirstEnv(['A', 'B'], {}),
    new RegExp(ENV_CONFIG_ERROR_MESSAGES.FIRST_REQUIRED(['A', 'B'])),
  );
});

test('resolveApplicationScopeId requires one explicit app-scope env key', () => {
  assert.equal(
    resolveApplicationScopeId({
      envKey: 'APP_SCOPE_ID',
      source: { APP_SCOPE_ID: '  live-scope  ' },
    }),
    'live-scope',
  );
  assert.throws(
    () => resolveApplicationScopeId({ envKey: 'APP_SCOPE_ID', source: {} }),
    new RegExp(ENV_CONFIG_ERROR_MESSAGES.REQUIRED('APP_SCOPE_ID')),
  );
  assert.throws(
    () => normalizeApplicationScopeId(' bad scope '),
    new RegExp(APPLICATION_SCOPE_ERROR_MESSAGES.INVALID(' bad scope ')),
  );
});

test('buildApplicationScopeEventMetadata normalizes app-scope metadata', () => {
  assert.deepEqual(
    buildApplicationScopeEventMetadata({
      scopeId: ' vita ',
      aggregateType: ' order ',
      aggregateId: ' ORD-1 ',
      correlationId: ' PAY-1 ',
    }),
    {
      tenantId: 'vita',
      aggregateType: 'order',
      aggregateId: 'ORD-1',
      correlationId: 'PAY-1',
    },
  );
  assert.deepEqual(
    buildApplicationScopeEventMetadata({
      scopeId: 'gomhoasen',
      aggregateType: 'quote',
      aggregateId: 'Q-1',
      correlationId: ' ',
    }),
    {
      tenantId: 'gomhoasen',
      aggregateType: 'quote',
      aggregateId: 'Q-1',
    },
  );
  assert.throws(
    () => buildApplicationScopeEventMetadata({ scopeId: 'vita', aggregateType: '', aggregateId: 'A-1' }),
    new RegExp(APPLICATION_SCOPE_ERROR_MESSAGES.METADATA_REQUIRED('aggregateType')),
  );
});

test('requireMongoUri accepts either canonical mongo env key', () => {
  assert.equal(requireMongoUri({ MONGO_URI: 'mongodb://primary' }), 'mongodb://primary');
  assert.equal(requireMongoUri({ MONGODB_URI: 'mongodb://fallback' }), 'mongodb://fallback');
});

test('resolveCorsOrigins keeps explicit origins and dev defaults in dev-like environments', () => {
  const resolved = resolveCorsOrigins({
    corsOrigins: 'https://a.example, https://b.example',
    nodeEnv: 'development',
    devOrigins: ['http://localhost:3000'],
  });

  assert.deepEqual(resolved, [
    'https://a.example',
    'https://b.example',
    'http://localhost:3000',
  ]);
});

test('resolveCorsOrigins requires explicit config outside development-like environments', () => {
  assert.equal(resolveCorsOrigins({ nodeEnv: 'test' }), true);
  assert.equal(resolveCorsOrigins({ corsOrigins: '   ', nodeEnv: 'test' }), true);
  assert.throws(
    () => resolveCorsOrigins({ nodeEnv: 'production' }),
    new RegExp(CORS_CONFIG_DEFAULT_MESSAGES.REQUIRED_OUTSIDE_DEV),
  );
  assert.throws(
    () => resolveCorsOrigins({ corsOrigins: '   ', nodeEnv: 'production' }),
    new RegExp(CORS_CONFIG_DEFAULT_MESSAGES.REQUIRED_OUTSIDE_DEV),
  );
});

test('resolveCorsOriginEntries supports exact and regex entries', () => {
  const resolved = resolveCorsOriginEntries({
    corsOrigins: 'https://portal.example, /^https?:\\/\\/localhost:\\d+$/i',
    nodeEnv: 'production',
  });

  assert.equal(resolved[0], 'https://portal.example');
  assert.ok(resolved[1] instanceof RegExp);
  assert.equal((resolved[1] as RegExp).test('http://localhost:3000'), true);
});

test('resolveCorsOriginEntries returns regex dev defaults in dev-like environments', () => {
  const resolved = resolveCorsOriginEntries({ nodeEnv: 'tester' });

  assert.equal(resolved.length, 2);
  assert.ok(resolved[0] instanceof RegExp);
  assert.ok(resolved[1] instanceof RegExp);
});

test('resolveCorsOriginEntries allows app-specific error factories', () => {
  assert.throws(
    () => resolveCorsOriginEntries({
      nodeEnv: 'production',
      requiredMessage: 'CUSTOM_CORS_REQUIRED',
      createError: (message) => new TypeError(message),
    }),
    { name: 'TypeError', message: 'CUSTOM_CORS_REQUIRED' },
  );
  assert.throws(
    () => resolveCorsOriginEntries({ corsOrigins: '/[', nodeEnv: 'production' }),
    new RegExp(CORS_CONFIG_DEFAULT_MESSAGES.INVALID_ORIGIN_REGEX('/[').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')),
  );
});
