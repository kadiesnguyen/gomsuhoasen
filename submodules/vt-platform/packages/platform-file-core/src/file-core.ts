import { randomUUID } from 'crypto';
import { FileAssetStatus, sanitizeFileName, type StorageKeyContext } from './browser';
export * from './browser';

/**
 * @vt/platform-file-core - File storage abstraction types.
 *
 * Provides the port interfaces that storage adapters must implement.
 * No NestJS, no Mongoose dependency - pure TypeScript.
 */

export interface IFileStorageAdapter {
  /** Write bytes to storage, return the canonical storage key. */
  writeObject(storageKey: string, payload: Buffer, mimeType?: string): Promise<string>;

  /** Read bytes from storage. Returns null if not found. */
  readObject(storageKey: string): Promise<Buffer | null>;

  /** Delete from storage. Returns true if deleted, false if not found. */
  deleteObject(storageKey: string): Promise<boolean>;

  /** Check if a storage key exists. */
  exists(storageKey: string): Promise<boolean>;

  /** Generate a suggested storage key from tenant/filename context. */
  suggestStorageKey(context: StorageKeyContext): string;
}

export interface FileAssetMetadata {
  fileName: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  storageKey: string;
  storageProvider: string;
  status: FileAssetStatus;
  uploadedBy?: string;
  uploadedAt: Date;
  /** Module that owns this file (e.g., 'catalog', 'inbox'). */
  moduleRef?: string;
  /** Entity ID this file is attached to. */
  entityRef?: string;
  /** Field name on the entity (e.g., 'avatar', 'gallery'). */
  fieldRef?: string;
}

/**
 * Generate a unique time-prefixed storage key.
 */
export function generateStorageKey(context: StorageKeyContext): string {
  const safe = sanitizeFileName(context.fileName);
  const unique = randomUUID();
  const parts: string[] = [];
  if (context.prefix) parts.push(context.prefix);
  if (context.tenantId) parts.push(context.tenantId);
  parts.push(`${Date.now()}_${unique}_${safe}`);
  return parts.join('/');
}
