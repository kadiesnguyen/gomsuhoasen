import assert from 'node:assert/strict';
import { tmpdir } from 'os';
import { join } from 'path';
import { mkdtemp, rm, stat } from 'fs/promises';
import { describe, it } from 'node:test';
import {
  LOCAL_FILE_STORAGE_ERROR_MESSAGES,
  LocalFileStorageAdapter,
} from './local-storage';

async function withTempStorage<T>(fn: (adapter: LocalFileStorageAdapter) => Promise<T>): Promise<T> {
  const rootDir = await mkdtemp(join(tmpdir(), 'vt-local-storage-'));
  try {
    return await fn(new LocalFileStorageAdapter({ rootDir }));
  } finally {
    await rm(rootDir, { recursive: true, force: true });
  }
}

describe('LocalFileStorageAdapter', () => {
  it('creates the configured storage root explicitly', async () => {
    const parentDir = await mkdtemp(join(tmpdir(), 'vt-local-storage-parent-'));
    const rootDir = join(parentDir, 'uploads', 'nested');
    try {
      const adapter = new LocalFileStorageAdapter({ rootDir });
      await adapter.ensureRoot();

      assert.equal((await stat(rootDir)).isDirectory(), true);
    } finally {
      await rm(parentDir, { recursive: true, force: true });
    }
  });

  it('writes, reads, checks, and deletes objects inside the root directory', async () => {
    await withTempStorage(async (adapter) => {
      const key = 'tenant-1/avatar.txt';
      await adapter.writeObject(key, Buffer.from('hello'));

      assert.equal(await adapter.exists(key), true);
      assert.equal(String(await adapter.readObject(key)), 'hello');
      assert.equal(await adapter.deleteObject(key), true);
      assert.equal(await adapter.exists(key), false);
      assert.equal(await adapter.readObject(key), null);
    });
  });

  it('rejects parent-directory path traversal', async () => {
    await withTempStorage(async (adapter) => {
      await assert.rejects(
        () => adapter.writeObject('../escape.txt', Buffer.from('bad')),
        { message: LOCAL_FILE_STORAGE_ERROR_MESSAGES.KEY_ESCAPES_ROOT('../escape.txt') },
      );
    });
  });

  it('rejects absolute paths that would escape the root directory', async () => {
    await withTempStorage(async (adapter) => {
      await assert.rejects(
        () => adapter.writeObject('/tmp/escape.txt', Buffer.from('bad')),
        { message: LOCAL_FILE_STORAGE_ERROR_MESSAGES.KEY_ESCAPES_ROOT('/tmp/escape.txt') },
      );
    });
  });

  it('throws synchronously when creating a stream for a missing object', async () => {
    await withTempStorage(async (adapter) => {
      assert.throws(
        () => adapter.createReadStream('missing.txt'),
        { message: LOCAL_FILE_STORAGE_ERROR_MESSAGES.OBJECT_NOT_FOUND('missing.txt') },
      );
    });
  });
});
