import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  renameSync,
  rmSync,
  unlinkSync,
  writeFileSync,
} from 'fs';
import { isAbsolute, join, relative, resolve } from 'path';

export interface AgentBuildSnapshotAsset {
  docId: string;
  name: string;
  content: string;
  type?: string;
  extractionVersionId?: string;
  _dispatchAttempts?: number;
}

export const AGENT_BUILD_SNAPSHOT_STORE_ERROR_MESSAGES = {
  PATH_ESCAPES_ROOT: (segments: string[]) => `Snapshot path escapes root: ${join(...segments)}`,
  INVALID_PATH_SEGMENT: (segment: string) => `Invalid snapshot path segment: ${segment}`,
} as const;

export class LocalAgentBuildSnapshotStore {
  private readonly rootDir: string;

  constructor(rootDir: string) {
    this.rootDir = resolve(rootDir);
  }

  rootExists(): boolean {
    return existsSync(this.rootDir);
  }

  tenantExists(tenantId: string): boolean {
    return existsSync(this.resolveSnapshotPath(tenantId));
  }

  ensureBuildDir(tenantId: string, kbId: string, indexBuildId: string): string {
    const buildDir = this.resolveSnapshotPath(tenantId, kbId, indexBuildId);
    mkdirSync(buildDir, { recursive: true });
    return buildDir;
  }

  writeAssets(
    tenantId: string,
    kbId: string,
    indexBuildId: string,
    assets: AgentBuildSnapshotAsset[],
  ): void {
    this.ensureBuildDir(tenantId, kbId, indexBuildId);
    for (const asset of assets) {
      this.writeAsset(tenantId, kbId, indexBuildId, asset);
    }
  }

  writeAsset(
    tenantId: string,
    kbId: string,
    indexBuildId: string,
    asset: AgentBuildSnapshotAsset,
  ): void {
    this.ensureBuildDir(tenantId, kbId, indexBuildId);
    const assetPath = this.resolveSnapshotPath(tenantId, kbId, indexBuildId, `${this.safeSegment(asset.docId)}.json`);
    writeFileSync(assetPath, JSON.stringify(asset), 'utf8');
  }

  listKbIds(tenantId: string): string[] {
    return this.listDirectoryNames(this.resolveSnapshotPath(tenantId));
  }

  listBuildIds(tenantId: string, kbId: string): string[] {
    return this.listDirectoryNames(this.resolveSnapshotPath(tenantId, kbId));
  }

  listPendingAssetFiles(tenantId: string, kbId: string, indexBuildId: string): string[] {
    return this.listFileNames(this.resolveSnapshotPath(tenantId, kbId, indexBuildId))
      .filter((fileName) =>
        fileName.endsWith('.json')
        && !fileName.endsWith('.dispatched.json')
        && !fileName.endsWith('.failed.json'),
      );
  }

  listRemainingFiles(tenantId: string, kbId: string, indexBuildId: string): string[] {
    return this.listFileNames(this.resolveSnapshotPath(tenantId, kbId, indexBuildId));
  }

  readAssetFile(
    tenantId: string,
    kbId: string,
    indexBuildId: string,
    fileName: string,
  ): AgentBuildSnapshotAsset {
    const raw = readFileSync(this.resolveSnapshotPath(tenantId, kbId, indexBuildId, fileName), 'utf8');
    return JSON.parse(raw) as AgentBuildSnapshotAsset;
  }

  updateAssetFile(
    tenantId: string,
    kbId: string,
    indexBuildId: string,
    fileName: string,
    asset: AgentBuildSnapshotAsset,
  ): void {
    writeFileSync(
      this.resolveSnapshotPath(tenantId, kbId, indexBuildId, fileName),
      JSON.stringify(asset, null, 2),
      'utf8',
    );
  }

  markDispatched(tenantId: string, kbId: string, indexBuildId: string, fileName: string): void {
    this.renameSnapshotFile(tenantId, kbId, indexBuildId, fileName, fileName.replace('.json', '.dispatched.json'));
  }

  markFailed(tenantId: string, kbId: string, indexBuildId: string, fileName: string): void {
    this.renameSnapshotFile(tenantId, kbId, indexBuildId, fileName, fileName.replace('.json', '.failed.json'));
  }

  removeAssetIfExists(
    tenantId: string,
    kbId: string,
    indexBuildId: string,
    docId: string,
    suffixes = ['.dispatched.json', '.json'],
  ): boolean {
    for (const suffix of suffixes) {
      const assetPath = this.resolveSnapshotPath(tenantId, kbId, indexBuildId, `${this.safeSegment(docId)}${suffix}`);
      if (existsSync(assetPath)) {
        unlinkSync(assetPath);
        return true;
      }
    }
    return false;
  }

  removeBuild(tenantId: string, kbId: string, indexBuildId: string): void {
    rmSync(this.resolveSnapshotPath(tenantId, kbId, indexBuildId), { recursive: true, force: true });
  }

  private renameSnapshotFile(
    tenantId: string,
    kbId: string,
    indexBuildId: string,
    sourceFileName: string,
    targetFileName: string,
  ): void {
    renameSync(
      this.resolveSnapshotPath(tenantId, kbId, indexBuildId, sourceFileName),
      this.resolveSnapshotPath(tenantId, kbId, indexBuildId, targetFileName),
    );
  }

  private listDirectoryNames(path: string): string[] {
    if (!existsSync(path)) return [];
    return readdirSync(path, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort();
  }

  private listFileNames(path: string): string[] {
    if (!existsSync(path)) return [];
    return readdirSync(path, { withFileTypes: true })
      .filter((entry) => entry.isFile())
      .map((entry) => entry.name)
      .sort();
  }

  private resolveSnapshotPath(...segments: string[]): string {
    const targetPath = resolve(this.rootDir, ...segments.map((segment) => this.safeSegment(segment)));
    const relativePath = relative(this.rootDir, targetPath);
    if (relativePath.startsWith('..') || isAbsolute(relativePath)) {
      throw new Error(AGENT_BUILD_SNAPSHOT_STORE_ERROR_MESSAGES.PATH_ESCAPES_ROOT(segments));
    }
    return targetPath;
  }

  private safeSegment(segment: string): string {
    if (!segment || segment === '.' || segment === '..' || segment.includes('/') || segment.includes('\\')) {
      throw new Error(AGENT_BUILD_SNAPSHOT_STORE_ERROR_MESSAGES.INVALID_PATH_SEGMENT(segment));
    }
    return segment;
  }
}
