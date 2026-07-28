export {
  extensionGuard,
  IMAGE_EXTENSIONS,
  MODEL_EXTENSIONS,
  PDF_EXTENSIONS,
  safeFilename,
  uploadRoot,
  uploadStorage,
  VIDEO_EXTENSIONS,
  type UploadRequest,
} from '@vt/nest-core';
export {
  PUBLIC_UPLOAD_PATH_PREFIX,
  buildPublicUploadPath,
  joinStorageKey,
  normalizeStorageKey,
  publicUploadPathToStorageKey,
  toPublicUploadPath,
  type StorageKeySegment,
} from '@vt/platform-file-core/browser';
