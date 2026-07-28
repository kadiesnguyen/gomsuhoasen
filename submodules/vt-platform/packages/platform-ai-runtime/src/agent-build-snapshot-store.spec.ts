import { mkdtemp, rm } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import {
  AGENT_BUILD_SNAPSHOT_STORE_ERROR_MESSAGES,
  LocalAgentBuildSnapshotStore,
} from './agent-build-snapshot-store';

async function withStore<T>(fn: (store: LocalAgentBuildSnapshotStore) => Promise<T>): Promise<T> {
  const rootDir = await mkdtemp(join(tmpdir(), 'vt-agent-build-snapshots-'));
  try {
    return await fn(new LocalAgentBuildSnapshotStore(rootDir));
  } finally {
    await rm(rootDir, { recursive: true, force: true });
  }
}

describe('LocalAgentBuildSnapshotStore', () => {
  it('writes, lists, reads, dispatches, and removes build assets', async () => {
    await withStore(async (store) => {
      store.writeAssets('tenant-1', 'kb-1', 'build-1', [
        { docId: 'doc-1', name: 'Doc 1', content: 'hello' },
      ]);

      expect(store.rootExists()).toBe(true);
      expect(store.tenantExists('tenant-1')).toBe(true);
      expect(store.listKbIds('tenant-1')).toEqual(['kb-1']);
      expect(store.listBuildIds('tenant-1', 'kb-1')).toEqual(['build-1']);
      expect(store.listPendingAssetFiles('tenant-1', 'kb-1', 'build-1')).toEqual(['doc-1.json']);
      expect(store.readAssetFile('tenant-1', 'kb-1', 'build-1', 'doc-1.json')).toEqual({
        docId: 'doc-1',
        name: 'Doc 1',
        content: 'hello',
      });

      store.markDispatched('tenant-1', 'kb-1', 'build-1', 'doc-1.json');
      expect(store.listPendingAssetFiles('tenant-1', 'kb-1', 'build-1')).toEqual([]);
      expect(store.removeAssetIfExists('tenant-1', 'kb-1', 'build-1', 'doc-1')).toBe(true);
      expect(store.listRemainingFiles('tenant-1', 'kb-1', 'build-1')).toEqual([]);

      store.removeBuild('tenant-1', 'kb-1', 'build-1');
      expect(store.listBuildIds('tenant-1', 'kb-1')).toEqual([]);
    });
  });

  it('updates retry attempts and marks failed assets', async () => {
    await withStore(async (store) => {
      store.writeAsset('tenant-1', 'kb-1', 'build-1', {
        docId: 'doc-1',
        name: 'Doc 1',
        content: 'hello',
      });

      const asset = store.readAssetFile('tenant-1', 'kb-1', 'build-1', 'doc-1.json');
      store.updateAssetFile('tenant-1', 'kb-1', 'build-1', 'doc-1.json', {
        ...asset,
        _dispatchAttempts: 2,
      });
      expect(store.readAssetFile('tenant-1', 'kb-1', 'build-1', 'doc-1.json')._dispatchAttempts).toBe(2);

      store.markFailed('tenant-1', 'kb-1', 'build-1', 'doc-1.json');
      expect(store.listRemainingFiles('tenant-1', 'kb-1', 'build-1')).toEqual(['doc-1.failed.json']);
    });
  });

  it('rejects path traversal segments', async () => {
    await withStore(async (store) => {
      expect(() => store.ensureBuildDir('tenant-1', '..', 'build-1')).toThrow(
        AGENT_BUILD_SNAPSHOT_STORE_ERROR_MESSAGES.INVALID_PATH_SEGMENT('..'),
      );
      expect(() => store.writeAsset('tenant-1', 'kb-1', 'build-1', {
        docId: '../escape',
        name: 'bad',
        content: 'bad',
      })).toThrow(AGENT_BUILD_SNAPSHOT_STORE_ERROR_MESSAGES.INVALID_PATH_SEGMENT('../escape'));
    });
  });
});
