import assert from 'node:assert/strict';
import test from 'node:test';
import { getAccountLockMessage, isAccountLocked } from './account-lock.contracts';

test('isAccountLocked keeps ACTIVE statuses unlocked across field variants', () => {
  assert.equal(isAccountLocked({ status: 'ACTIVE' }), false);
  assert.equal(isAccountLocked({ account_status: 'active' }), false);
});

test('isAccountLocked treats suspended or missing entities as locked', () => {
  assert.equal(isAccountLocked({ status: 'SUSPENDED' }), true);
  assert.equal(isAccountLocked({ account_status: 'locked' }), true);
  assert.equal(isAccountLocked(undefined), true);
});

test('isAccountLocked can fail closed when status is unexpectedly missing', () => {
  assert.equal(isAccountLocked({}), false);
  assert.equal(isAccountLocked({}, { failClosedOnMissingStatus: true }), true);
});

test('getAccountLockMessage trims explicit reasons and falls back deterministically', () => {
  assert.equal(
    getAccountLockMessage({ locked_reason: '  Suspended by administrator  ' }),
    'Suspended by administrator',
  );
  assert.equal(
    getAccountLockMessage({}, 'Account unavailable'),
    'Account unavailable',
  );
});
