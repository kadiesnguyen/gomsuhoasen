export const FILE_ASSET_STATUSES = {
  TEMP: 'TEMP',
  ATTACHED: 'ATTACHED',
  ORPHAN: 'ORPHAN',
  DELETED: 'DELETED',
} as const;

export type FileAssetStatusContract = (typeof FILE_ASSET_STATUSES)[keyof typeof FILE_ASSET_STATUSES];

export const FILE_ASSET_STATUS_VALUES = Object.values(FILE_ASSET_STATUSES) as FileAssetStatusContract[];

export const FILE_ASSET_MODULE_REFS = {
  CATALOG: 'catalog',
  CATALOG_PRODUCT: 'catalog-product',
  ARTISAN: 'artisan',
} as const;

export type FileAssetModuleRef = (typeof FILE_ASSET_MODULE_REFS)[keyof typeof FILE_ASSET_MODULE_REFS];

export const FILE_ASSET_MODULE_REF_VALUES = Object.values(FILE_ASSET_MODULE_REFS) as FileAssetModuleRef[];

export const FILE_ASSET_FIELD_REFS = {
  IMAGES: 'images',
  IMAGE: 'image',
  POSTER: 'poster',
  MODEL_URL: 'modelUrl',
  VIDEO_360_URL: 'video360Url',
  STORY_IMAGE: 'storyImage',
  VARIANT_IMAGE: 'variantImage',
  VARIANT_MODEL_URL: 'variantModelUrl',
  HOTSPOT_PANEL_IMAGE: 'hotspotPanelImage',
  AVATAR: 'avatar',
  COVER_IMAGE: 'coverImage',
} as const;

export type FileAssetFieldRef = (typeof FILE_ASSET_FIELD_REFS)[keyof typeof FILE_ASSET_FIELD_REFS];

export const FILE_ASSET_FIELD_REF_VALUES = Object.values(FILE_ASSET_FIELD_REFS) as FileAssetFieldRef[];

export interface FileAssetContract {
  id: string;
  fileName: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  storagePath: string;
  status: FileAssetStatusContract;
  referenceCount: number;
  moduleRef?: string;
  entityRef?: string;
  fieldRef?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface FileCommitAttachmentInput {
  fileId: string;
  position?: number;
}

export interface FileCommitRefsInput {
  moduleRef: string;
  entityRef: string;
  fieldRef: string;
  purpose?: string;
  attachments: FileCommitAttachmentInput[];
}

export interface FileUnrefInput {
  assetIds: string[];
  moduleRef?: string;
  entityRef?: string;
  fieldRef?: string;
}

export interface FileMutationOutcome {
  fileId: string;
  outcomeCode: string;
  retryable: boolean;
}

export interface FileCommitRefsResult {
  updated: number;
  outcomes: Array<FileMutationOutcome & { linked: boolean }>;
}

export interface FileUnrefResult {
  updated: number;
  outcomes: Array<FileMutationOutcome & { unlinked: boolean }>;
}
