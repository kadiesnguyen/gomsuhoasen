/**
 * @vt/platform-file-storage-local - Local filesystem storage adapter.
 *
 * Implements IFileStorageAdapter for local disk storage.
 * Used in development, test, and single-server deployments.
 */

import { existsSync, createReadStream } from 'fs';
import { mkdir, writeFile, unlink, readFile } from 'fs/promises';
import { dirname, isAbsolute, relative, resolve } from 'path';
import {
  generateStorageKey,
  type IFileStorageAdapter,
  type StorageKeyContext,
} from '@vt/platform-file-core';

export interface LocalStorageOptions {
  /** Root directory for file storage. Defaults to `.runtime/file-storage`. */
  rootDir?: string;
}

export const LOCAL_FILE_STORAGE_ERROR_MESSAGES = {
  OBJECT_NOT_FOUND: (storageKey: string) => `Storage object not found: ${storageKey}`,
  KEY_ESCAPES_ROOT: (storageKey: string) => `Storage key escapes local storage root: ${storageKey}`,
} as const;

export class LocalFileStorageAdapter implements IFileStorageAdapter {
  private readonly rootDir: string;

  constructor(options: LocalStorageOptions = {}) {
    this.rootDir = resolve(options.rootDir ?? resolve(process.cwd(), '.runtime', 'file-storage'));
  }

  async ensureRoot(): Promise<void> {
    await mkdir(this.rootDir, { recursive: true });
  }

  suggestStorageKey(context: StorageKeyContext): string {
    return generateStorageKey(context);
  }

  async writeObject(storageKey: string, payload: Buffer): Promise<string> {
    const targetPath = this.resolvePath(storageKey);
    await mkdir(dirname(targetPath), { recursive: true });
    await writeFile(targetPath, payload);
    return storageKey;
  }

  async readObject(storageKey: string): Promise<Buffer | null> {
    const targetPath = this.resolvePath(storageKey);
    if (!existsSync(targetPath)) return null;
    return readFile(targetPath);
  }

  async deleteObject(storageKey: string): Promise<boolean> {
    const targetPath = this.resolvePath(storageKey);
    if (!existsSync(targetPath)) return false;
    await unlink(targetPath);
    return true;
  }

  async exists(storageKey: string): Promise<boolean> {
    return existsSync(this.resolvePath(storageKey));
  }

  /**
   * Create a read stream for large files.
   * Not part of the IFileStorageAdapter interface - local-only convenience.
   */
  createReadStream(storageKey: string) {
    const targetPath = this.resolvePath(storageKey);
    if (!existsSync(targetPath)) {
      throw new Error(LOCAL_FILE_STORAGE_ERROR_MESSAGES.OBJECT_NOT_FOUND(storageKey));
    }
    return createReadStream(targetPath);
  }

  private resolvePath(storageKey: string): string {
    const targetPath = resolve(this.rootDir, storageKey);
    const relativePath = relative(this.rootDir, targetPath);
    if (relativePath.startsWith('..') || isAbsolute(relativePath)) {
      throw new Error(LOCAL_FILE_STORAGE_ERROR_MESSAGES.KEY_ESCAPES_ROOT(storageKey));
    }
    return targetPath;
  }
}
