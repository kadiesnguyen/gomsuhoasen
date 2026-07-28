import assert from 'node:assert/strict';
import test from 'node:test';
import {
  TENANT_FILTER_ERROR_REASONS,
  createTenantFilterHelpers,
} from './tenant-filter-core';

function createHelpers() {
  return createTenantFilterHelpers({
    parseIdentifier: (value) => (
      typeof value === 'string' && /^[a-f0-9]{24}$/i.test(value)
        ? value.toLowerCase()
        : undefined
    ),
    createError: (reason) => Object.assign(new Error(reason), { reason }),
  });
}

function hasReason(error: unknown, reason: string): boolean {
  return error instanceof Error
    && 'reason' in error
    && error.reason === reason;
}

test('tenant filter helpers build scoped predicates with caller-owned ids', () => {
  const helpers = createHelpers();
  const tenantId = 'AAAAAAAAAAAAAAAAAAAAAAAA';
  const entityId = 'bbbbbbbbbbbbbbbbbbbbbbbb';

  assert.deepEqual(helpers.tenantFilter(tenantId), {
    tenantId: tenantId.toLowerCase(),
    isDeleted: false,
  });
  assert.deepEqual(helpers.tenantFindById(tenantId, entityId), {
    _id: entityId,
    tenantId: tenantId.toLowerCase(),
    isDeleted: false,
  });
  assert.deepEqual(helpers.tenantFileFilter(tenantId, entityId), {
    _id: entityId,
    tenantId: tenantId.toLowerCase(),
    status: { $in: ['ACTIVE', 'ATTACHED'] },
  });
});

test('tenant filter helpers expose stable reasons through the host error factory', () => {
  const helpers = createHelpers();
  const validId = 'aaaaaaaaaaaaaaaaaaaaaaaa';

  assert.throws(
    () => helpers.tenantFilter('invalid'),
    (error) => hasReason(error, TENANT_FILTER_ERROR_REASONS.TENANT_ID_REQUIRED),
  );
  assert.throws(
    () => helpers.tenantFindById(validId, 'invalid'),
    (error) => hasReason(error, TENANT_FILTER_ERROR_REASONS.ENTITY_ID_REQUIRED),
  );
  assert.throws(
    () => helpers.tenantFileFilter('invalid', validId),
    (error) => hasReason(error, TENANT_FILTER_ERROR_REASONS.FILE_TENANT_ID_REQUIRED),
  );
});
