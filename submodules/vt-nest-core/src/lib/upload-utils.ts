import { DomainBadRequestException } from '@vt/platform-error';
import { existsSync, mkdirSync } from 'node:fs';
import { extname, resolve } from 'node:path';

export const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp']);
export const MODEL_EXTENSIONS = new Set(['.glb', '.gltf']);
export const PDF_EXTENSIONS = new Set(['.pdf']);
export const VIDEO_EXTENSIONS = new Set(['.mp4', '.webm', '.mov']);
export const UPLOAD_FILE_TYPE_UNSUPPORTED = 'UPLOAD_FILE_TYPE_UNSUPPORTED';

export const UPLOAD_FILE_TYPES = {
  IMAGE: 'image',
  VIDEO: 'video',
  AUDIO: 'audio',
  PDF: 'pdf',
  EXCEL: 'excel',
  OTHER: 'other',
} as const;

export type UploadFileType = (typeof UPLOAD_FILE_TYPES)[keyof typeof UPLOAD_FILE_TYPES];

export type UploadPayloadMismatchReason = 'SIZE_MISMATCH' | 'MIME_TYPE_MISMATCH';
export type UploadPolicyViolationReason = 'FILE_TOO_LARGE' | 'MIME_TYPE_NOT_ALLOWED';

export interface UploadPayloadMismatch {
  reason: UploadPayloadMismatchReason;
  message: string;
  details: Record<string, unknown>;
}

export interface UploadPayloadMatchInput {
  expectedSizeBytes: number;
  actualSizeBytes: number;
  expectedMimeType: string;
  actualMimeType?: string;
}

export type UploadPayloadMatchResult =
  | { ok: true }
  | { ok: false; mismatch: UploadPayloadMismatch };

export interface UploadPolicyValidationInput {
  fileSizeBytes: number;
  mimeType: string;
  maxFileSizeBytes?: number | null;
  allowedMimeTypes?: readonly string[] | null;
}

export interface UploadPolicyViolation {
  reason: UploadPolicyViolationReason;
  message: string;
  details: Record<string, unknown>;
}

export type UploadPolicyValidationResult =
  | { ok: true }
  | { ok: false; violation: UploadPolicyViolation };

/** Portable Multer file interface — avoids hard dependency on @types/multer */
export interface MulterFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  destination: string;
  filename: string;
  path: string;
  buffer: Buffer;
}

export type UploadRequest = {
  params: { [key: string]: string | string[] };
};

export function safeFilename(originalName: string): string {
  const ext = extname(originalName).toLowerCase();
  const base = originalName
    .slice(0, originalName.length - ext.length)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'd')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();

  return `${Date.now()}-${base || 'file'}${ext}`;
}

export function deriveFileExtension(fileName: string): string {
  const lastDot = fileName.lastIndexOf('.');
  return lastDot > 0 ? fileName.substring(lastDot + 1).toLowerCase() : '';
}

export function deriveUploadFileType(mimeType: string): UploadFileType {
  if (mimeType.startsWith('image/')) return UPLOAD_FILE_TYPES.IMAGE;
  if (mimeType.startsWith('video/')) return UPLOAD_FILE_TYPES.VIDEO;
  if (mimeType.startsWith('audio/')) return UPLOAD_FILE_TYPES.AUDIO;
  if (mimeType === 'application/pdf') return UPLOAD_FILE_TYPES.PDF;
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel') || mimeType === 'text/csv') {
    return UPLOAD_FILE_TYPES.EXCEL;
  }
  return UPLOAD_FILE_TYPES.OTHER;
}

export function validateUploadPayloadMatch(input: UploadPayloadMatchInput): UploadPayloadMatchResult {
  if (input.actualSizeBytes !== input.expectedSizeBytes) {
    return {
      ok: false,
      mismatch: {
        reason: 'SIZE_MISMATCH',
        message: 'Uploaded payload size does not match session',
        details: {
          expectedSizeBytes: input.expectedSizeBytes,
          actualSizeBytes: input.actualSizeBytes,
        },
      },
    };
  }

  if (input.actualMimeType && input.actualMimeType !== input.expectedMimeType) {
    return {
      ok: false,
      mismatch: {
        reason: 'MIME_TYPE_MISMATCH',
        message: 'Uploaded payload mimeType does not match session',
        details: {
          expectedMimeType: input.expectedMimeType,
          actualMimeType: input.actualMimeType,
        },
      },
    };
  }

  return { ok: true };
}

export function validateUploadPolicy(input: UploadPolicyValidationInput): UploadPolicyValidationResult {
  if (typeof input.maxFileSizeBytes === 'number' && input.fileSizeBytes > input.maxFileSizeBytes) {
    return {
      ok: false,
      violation: {
        reason: 'FILE_TOO_LARGE',
        message: 'File size exceeds tenant file policy',
        details: {
          fileSizeBytes: input.fileSizeBytes,
          maxFileSizeBytes: input.maxFileSizeBytes,
        },
      },
    };
  }

  const allowedMimeTypes = input.allowedMimeTypes?.filter((entry) => entry.trim().length > 0) ?? [];
  if (allowedMimeTypes.length > 0 && !allowedMimeTypes.includes(input.mimeType)) {
    return {
      ok: false,
      violation: {
        reason: 'MIME_TYPE_NOT_ALLOWED',
        message: 'File MIME type is not allowed by tenant file policy',
        details: {
          mimeType: input.mimeType,
          allowedMimeTypes,
        },
      },
    };
  }

  return { ok: true };
}

export function uploadRoot(): string {
  return resolve(process.env['UPLOAD_DIR'] || 'apps/api/uploads');
}

export function uploadStorage(
  pathBuilder: (req: UploadRequest) => string,
  filenameBuilder?: (file: MulterFile) => string,
) {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const multerLib = require('multer');
  return multerLib.diskStorage({
    destination: (req: unknown, _file: unknown, cb: (error: Error | null, destination: string) => void) => {
      const dir = resolve(uploadRoot(), pathBuilder(req as UploadRequest));
      if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
      cb(null, dir);
    },
    filename: (_req: unknown, file: unknown, cb: (error: Error | null, filename: string) => void) => {
      const f = file as MulterFile;
      cb(null, filenameBuilder?.(f) || safeFilename(f.originalname));
    },
  });
}

export function extensionGuard(allowed: Set<string>) {
  return (_req: unknown, file: MulterFile, cb: (error: Error | null, acceptFile: boolean) => void) => {
    const normalizedExt = deriveFileExtension(file.originalname);
    const ext = normalizedExt ? `.${normalizedExt}` : '';
    if (!allowed.has(ext)) {
      cb(
        new DomainBadRequestException(
          UPLOAD_FILE_TYPE_UNSUPPORTED,
          `File type ${ext} không được hỗ trợ`,
          { extension: ext },
        ),
        false,
      );
      return;
    }
    cb(null, true);
  };
}
