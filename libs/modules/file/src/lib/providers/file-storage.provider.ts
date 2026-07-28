import type { Provider } from '@nestjs/common';
import type { IFileStorageAdapter } from '@vt/platform-file-core';
import { LocalFileStorageAdapter } from '@vt/platform-file-storage-local';
import { uploadRoot } from '@gomhoasen/core';

export const GHS_FILE_STORAGE_ADAPTER = Symbol('GHS_FILE_STORAGE_ADAPTER');

export type GhsFileStorageAdapter = IFileStorageAdapter & Pick<LocalFileStorageAdapter, 'createReadStream'>;

export const GHS_FILE_STORAGE_ADAPTER_PROVIDER: Provider<GhsFileStorageAdapter> = {
  provide: GHS_FILE_STORAGE_ADAPTER,
  useFactory: () => new LocalFileStorageAdapter({ rootDir: uploadRoot() }),
};
