import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  createMongoTransactionSupportResolver,
  probeMongoTransactionSupport,
} from './mongo-transaction-support';

function createDb(response: Record<string, unknown>, onCommand?: () => void) {
  return {
    admin: () => ({
      command: async () => {
        onCommand?.();
        return response;
      },
    }),
  };
}

describe('platform-events mongo transaction support probe', () => {
  it('detects replica set transaction support', async () => {
    const supported = await probeMongoTransactionSupport({
      db: createDb({ setName: 'rs0', logicalSessionTimeoutMinutes: 30 }),
    });

    assert.equal(supported, true);
  });

  it('detects mongos transaction support', async () => {
    const supported = await probeMongoTransactionSupport({
      db: createDb({ msg: 'isdbgrid', logicalSessionTimeoutMinutes: 30 }),
    });

    assert.equal(supported, true);
  });

  it('returns false for standalone deployments', async () => {
    const supported = await probeMongoTransactionSupport({
      db: createDb({ logicalSessionTimeoutMinutes: 30 }),
    });

    assert.equal(supported, false);
  });

  it('warns and rethrows probe failures', async () => {
    const warnings: string[] = [];
    const error = new Error('hello failed');
    const db = {
      admin: () => ({
        command: async () => {
          throw error;
        },
      }),
    };

    await assert.rejects(
      () => probeMongoTransactionSupport({
        db,
        warn: (message) => warnings.push(message),
        warnContext: 'balance',
      }),
      /hello failed/,
    );
    assert.deepEqual(warnings, ['Unable to detect transaction support in balance: hello failed']);
  });

  it('caches successful support probes', async () => {
    let commandCount = 0;
    const resolver = createMongoTransactionSupportResolver({
      db: createDb({ setName: 'rs0', logicalSessionTimeoutMinutes: 30 }, () => {
        commandCount += 1;
      }),
    });

    assert.equal(await resolver.hasSupport(), true);
    assert.equal(await resolver.hasSupport(), true);
    assert.equal(resolver.getCachedSupport(), true);
    assert.equal(commandCount, 1);
  });

  it('caches standalone deployment support as unsupported', async () => {
    let commandCount = 0;
    const resolver = createMongoTransactionSupportResolver({
      db: createDb({ logicalSessionTimeoutMinutes: 30 }, () => {
        commandCount += 1;
      }),
    });

    assert.equal(await resolver.hasSupport(), false);
    assert.equal(resolver.getCachedSupport(), false);
    assert.equal(commandCount, 1);
  });

  it('does not cache failed probes', async () => {
    const error = new Error('hello failed');
    let commandCount = 0;
    const resolver = createMongoTransactionSupportResolver({
      db: () => ({
        admin: () => ({
          command: async () => {
            commandCount += 1;
            throw error;
          },
        }),
      }),
    });

    await assert.rejects(() => resolver.hasSupport(), /hello failed/);
    await assert.rejects(() => resolver.hasSupport(), /hello failed/);
    assert.equal(resolver.getCachedSupport(), null);
    assert.equal(commandCount, 2);
  });

  it('allows callers to clear cached transaction support and probe again', async () => {
    let commandCount = 0;
    const resolver = createMongoTransactionSupportResolver({
      db: createDb({ setName: 'rs0', logicalSessionTimeoutMinutes: 30 }, () => {
        commandCount += 1;
      }),
    });

    assert.equal(await resolver.hasSupport(), true);
    resolver.clearCache();

    assert.equal(await resolver.hasSupport(), true);
    assert.equal(commandCount, 2);
  });
});
