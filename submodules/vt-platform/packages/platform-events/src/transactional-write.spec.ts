import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { ClientSession, Connection } from 'mongoose';
import { withMongoTransaction } from './transactional-write';

function createSession(options: { transactionError?: unknown } = {}) {
  const calls: string[] = [];
  const session = {
    async withTransaction(work: () => Promise<void>) {
      calls.push('withTransaction');
      if (options.transactionError) throw options.transactionError;
      await work();
    },
    async endSession() {
      calls.push('endSession');
    },
  } as unknown as ClientSession;
  return { session, calls };
}

describe('platform-events transactional-write', () => {
  it('keeps the original strict transaction helper behavior', async () => {
    const { session, calls } = createSession();
    const connection = {
      async startSession() {
        calls.push('startSession');
        return session;
      },
    } as unknown as Connection;

    const result = await withMongoTransaction(connection, async (activeSession) => {
      assert.equal(activeSession, session);
      return 'ok';
    });

    assert.equal(result, 'ok');
    assert.deepEqual(calls, ['startSession', 'withTransaction', 'endSession']);
  });

  it('propagates transaction errors without no-session fallback', async () => {
    const transactionError = new Error('Transaction numbers are only allowed on a replica set member or mongos');
    const { session, calls } = createSession({ transactionError });
    const connection = {
      async startSession() {
        calls.push('startSession');
        return session;
      },
    } as unknown as Connection;

    await assert.rejects(
      () => withMongoTransaction(connection, async () => 'transactional'),
      transactionError,
    );

    assert.deepEqual(calls, ['startSession', 'withTransaction', 'endSession']);
  });

  it('propagates business errors without no-session fallback', async () => {
    const businessError = new Error('order total is invalid');
    const { session, calls } = createSession();
    const connection = {
      async startSession() {
        calls.push('startSession');
        return session;
      },
    } as unknown as Connection;

    await assert.rejects(
      () => withMongoTransaction(connection, async () => {
        throw businessError;
      }),
      businessError,
    );
    assert.deepEqual(calls, ['startSession', 'withTransaction', 'endSession']);
  });
});
