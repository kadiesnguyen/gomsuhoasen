import { encodeUrlPathSegment } from '@vt/platform-api-contract/browser';

export interface StorageKeyContext {
  tenantId?: string;
  fileName: string;
  prefix?: string;
}

export enum FileAssetStatus {
  /** Uploaded but not yet attached to any entity. */
  TEMP = 'TEMP',
  /** Attached to at least one entity reference. */
  ATTACHED = 'ATTACHED',
  /** Detached from all entity references and awaiting cleanup. */
  ORPHAN = 'ORPHAN',
  /** Marked for deletion (orphan cleanup). */
  ORPHANED = 'ORPHANED',
  /** Ready for normal business use. */
  ACTIVE = 'ACTIVE',
  /** Permanently deleted from storage. */
  DELETED = 'DELETED',
  /** Blocked from use pending manual/security review. */
  QUARANTINED = 'QUARANTINED',
}

export const FILE_ASSET_STATUSES = {
  TEMP: FileAssetStatus.TEMP,
  ATTACHED: FileAssetStatus.ATTACHED,
  ORPHAN: FileAssetStatus.ORPHAN,
  ACTIVE: FileAssetStatus.ACTIVE,
  DELETED: FileAssetStatus.DELETED,
  QUARANTINED: FileAssetStatus.QUARANTINED,
} as const;

export type FileAssetLifecycleStatus = (typeof FILE_ASSET_STATUSES)[keyof typeof FILE_ASSET_STATUSES];

export const LISTABLE_FILE_ASSET_STATUSES = [
  FILE_ASSET_STATUSES.TEMP,
  FILE_ASSET_STATUSES.ATTACHED,
  FILE_ASSET_STATUSES.ORPHAN,
  FILE_ASSET_STATUSES.ACTIVE,
  FILE_ASSET_STATUSES.QUARANTINED,
] as const;

export type ListableFileAssetStatus = (typeof LISTABLE_FILE_ASSET_STATUSES)[number];

export enum UploadSessionStatus {
  ISSUED = 'ISSUED',
  FINALIZED = 'FINALIZED',
  EXPIRED = 'EXPIRED',
}

export enum LedgerStatus {
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
}

export enum JobStatus {
  QUEUED = 'QUEUED',
  RUNNING = 'RUNNING',
  DONE = 'DONE',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
}

export enum FileMigrationStatus {
  QUEUED = 'QUEUED',
  RUNNING = 'RUNNING',
  DONE = 'DONE',
  FAILED = 'FAILED',
}

export const FILE_STORAGE_PROVIDERS = {
  LOCAL: 'LOCAL',
  S3: 'S3',
  MINIO: 'MINIO',
  GCS: 'GCS',
  AZURE: 'AZURE',
} as const;

export type FileStorageProvider = (typeof FILE_STORAGE_PROVIDERS)[keyof typeof FILE_STORAGE_PROVIDERS];

export const PUBLIC_UPLOAD_PATH_PREFIX = 'uploads/';

export const FILE_CORE_ERROR_MESSAGES = {
  SANITIZE_FILE_NAME_REQUIRED: 'sanitizeFileName: fileName is required',
  INLINE_DISPOSITION_FILE_NAME_REQUIRED: 'buildInlineFileContentDisposition: fileName is required',
  RESPONSE_MIME_TYPE_REQUIRED: 'buildFileContentResponseHeaders: mimeType is required',
  RESPONSE_SIZE_BYTES_MUST_BE_FINITE: 'buildFileContentResponseHeaders: sizeBytes must be finite',
} as const;

export type StorageKeySegment = string | number;

export interface FileContentResponseHeaderInput {
  fileName: string;
  mimeType: string;
  sizeBytes?: number;
}

export interface FileContentResponseHeaders {
  contentType: string;
  contentDisposition: string;
  contentLength?: string;
}

/**
 * Sanitize a filename for storage - removes special characters, preserves extension.
 */
export function sanitizeFileName(fileName: string): string {
  const safe = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
  if (!safe) {
    throw new Error(FILE_CORE_ERROR_MESSAGES.SANITIZE_FILE_NAME_REQUIRED);
  }
  return safe;
}

export function normalizeStorageKey(value: string): string {
  return value
    .trim()
    .replace(/\\/g, '/')
    .replace(/^\/+/, '')
    .replace(/\/+$/, '')
    .replace(/\/{2,}/g, '/');
}

export function joinStorageKey(...segments: StorageKeySegment[]): string {
  return normalizeStorageKey(
    segments
      .map((segment) => String(segment))
      .filter((segment) => segment.trim().length > 0)
      .join('/'),
  );
}

export function publicUploadPathToStorageKey(path: string): string {
  const normalized = normalizeStorageKey(path);
  return normalized.startsWith(PUBLIC_UPLOAD_PATH_PREFIX)
    ? normalized.slice(PUBLIC_UPLOAD_PATH_PREFIX.length)
    : normalized;
}

export function toPublicUploadPath(storageKey: string): string {
  const key = publicUploadPathToStorageKey(storageKey);
  return key ? `${PUBLIC_UPLOAD_PATH_PREFIX}${key}` : PUBLIC_UPLOAD_PATH_PREFIX.replace(/\/$/, '');
}

export function buildPublicUploadPath(...segments: StorageKeySegment[]): string {
  return toPublicUploadPath(joinStorageKey(...segments));
}

export function buildInlineFileContentDisposition(fileName: string): string {
  if (typeof fileName !== 'string' || fileName.trim().length === 0) {
    throw new Error(FILE_CORE_ERROR_MESSAGES.INLINE_DISPOSITION_FILE_NAME_REQUIRED);
  }
  return `inline; filename="${encodeUrlPathSegment(fileName)}"`;
}

export function buildFileContentResponseHeaders(
  input: FileContentResponseHeaderInput,
): FileContentResponseHeaders {
  if (typeof input.mimeType !== 'string' || input.mimeType.trim().length === 0) {
    throw new Error(FILE_CORE_ERROR_MESSAGES.RESPONSE_MIME_TYPE_REQUIRED);
  }
  if (input.sizeBytes !== undefined && !Number.isFinite(input.sizeBytes)) {
    throw new Error(FILE_CORE_ERROR_MESSAGES.RESPONSE_SIZE_BYTES_MUST_BE_FINITE);
  }
  return {
    contentType: input.mimeType,
    contentDisposition: buildInlineFileContentDisposition(input.fileName),
    ...(input.sizeBytes !== undefined ? { contentLength: String(input.sizeBytes) } : {}),
  };
}
