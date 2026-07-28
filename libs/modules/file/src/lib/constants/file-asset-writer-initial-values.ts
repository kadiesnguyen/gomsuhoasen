import { readArrayInput } from '@vt/common-utils';
import { FILE_ASSET_STATUSES, type FileAssetStatusContract } from '@gomhoasen/contracts';

export type FileAssetInitialValuesInput = {
  fileName: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  storagePath: string;
  moduleRef?: string;
  entityRef?: string;
  fieldRef?: string;
  uploadedBy?: string;
  metadata?: object;
  tags?: string[];
  uploadedAt?: Date;
};

export type FileAssetInitialValues = FileAssetInitialValuesInput & {
  status: FileAssetStatusContract;
  referenceCount: number;
  tags: string[];
  uploadedAt: Date;
  attachedAt?: Date;
};

export function buildInitialFileAssetValues(input: FileAssetInitialValuesInput): FileAssetInitialValues {
  const attached = Boolean(input.moduleRef && input.entityRef && input.fieldRef);
  const uploadedAt = input.uploadedAt ?? new Date();

  return {
    ...input,
    status: attached ? FILE_ASSET_STATUSES.ATTACHED : FILE_ASSET_STATUSES.TEMP,
    referenceCount: attached ? 1 : 0,
    tags: readArrayInput<string>(input.tags),
    uploadedAt,
    attachedAt: attached ? uploadedAt : undefined,
  };
}
