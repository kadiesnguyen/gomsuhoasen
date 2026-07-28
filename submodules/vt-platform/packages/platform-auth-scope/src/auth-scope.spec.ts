import 'reflect-metadata';
import assert from 'node:assert/strict';
import test from 'node:test';
import { DomainForbiddenException } from '@vt/platform-error';
import { assertOwnerScope, IS_PUBLIC_KEY, OWNER_SCOPE_ERROR_CODES, Public } from './index';

test('assertOwnerScope allows owner and alsoAllow identities', () => {
  assert.doesNotThrow(() => assertOwnerScope('actor-1', 'actor-1'));
  assert.doesNotThrow(() =>
    assertOwnerScope('actor-2', 'owner-1', { alsoAllow: ['actor-2'] }),
  );
});

test('assertOwnerScope throws structured forbidden exception when actor is not allowed', () => {
  assert.throws(
    () => assertOwnerScope('actor-3', 'owner-1'),
    (error: unknown) => {
      assert.ok(error instanceof DomainForbiddenException);
      assert.equal(error.errorCode, OWNER_SCOPE_ERROR_CODES.FORBIDDEN);
      return true;
    },
  );
});

test('Public decorator sets the canonical public metadata key', () => {
  class DemoController {
    @Public()
    list(): string {
      return 'ok';
    }
  }

  const metadata = Reflect.getMetadata(IS_PUBLIC_KEY, DemoController.prototype.list);
  assert.equal(metadata, true);
});
