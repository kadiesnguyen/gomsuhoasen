import 'reflect-metadata';
import * as mongoose from 'mongoose';
import { existsSync, statSync } from 'node:fs';
import { basename, extname, resolve } from 'node:path';
import { Logger } from '@nestjs/common';
import { createShowroomV2DefaultContent, FILE_ASSET_STATUSES } from '@gomhoasen/contracts';
import { requireMongodbUri } from '@vt/platform-config';
import { FileAsset, FileAssetSchema } from '@gomhoasen/file';
import { ShowroomV2Content, ShowroomV2ContentSchema } from '@gomhoasen/site';
import {
  ArtisanSchema,
  ProductSchema,
  SEED_MODEL_NAMES,
  SiteConfigSchema,
} from './seed/seed.shared';

const logger = new Logger('FileAssetBackfill');
const SHOWROOM_CONTENT_KEY = 'singleton_v2_content';
const LEGACY_STATIC_TAG = 'legacy-static';
const LEGACY_STATIC_MODULE_REF = 'legacy-static';

type SourceBucket = {
  sourceLabels: Set<string>;
  originalPaths: Set<string>;
};

type ExistingAssetSnapshot = {
  _id: mongoose.Types.ObjectId | string;
  storagePath?: string;
  status?: string;
  referenceCount?: number;
  moduleRef?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
};

function canonicalStoragePath(value: string): string {
  const trimmed = value.trim();
  if (trimmed.length === 0) return '';

  let comparable = trimmed;
  try {
    if (/^https?:\/\//i.test(trimmed)) {
      comparable = new URL(trimmed).pathname;
    }
  } catch {
    comparable = trimmed;
  }

  return comparable
    .split(/[?#]/, 1)[0]
    .replace(/\\/g, '/')
    .replace(/\/{2,}/g, '/')
    .replace(/^\.\/+/, '')
    .replace(/^\/+/, '');
}

function looksLikeMediaPath(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const canonical = canonicalStoragePath(value);
  if (!canonical || (!canonical.startsWith('assets/') && !canonical.startsWith('uploads/'))) {
    return false;
  }

  return /\.(png|jpe?g|webp|gif|avif|svg|glb|gltf|usdz|obj|fbx|stl|mp4|webm|mov|m4v|ogg|html|htm|pdf)$/i.test(canonical);
}

function walkMediaPaths(source: unknown, visitor: (path: string) => void): void {
  if (looksLikeMediaPath(source)) {
    visitor(source);
    return;
  }

  if (Array.isArray(source)) {
    source.forEach((item) => walkMediaPaths(item, visitor));
    return;
  }

  if (!source || typeof source !== 'object') return;
  Object.values(source as Record<string, unknown>).forEach((value) => walkMediaPaths(value, visitor));
}

function inferMimeType(storagePath: string): string {
  switch (extname(storagePath).toLowerCase()) {
    case '.png':
      return 'image/png';
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg';
    case '.webp':
      return 'image/webp';
    case '.gif':
      return 'image/gif';
    case '.avif':
      return 'image/avif';
    case '.svg':
      return 'image/svg+xml';
    case '.glb':
      return 'model/gltf-binary';
    case '.gltf':
      return 'model/gltf+json';
    case '.usdz':
      return 'model/vnd.usdz+zip';
    case '.obj':
      return 'model/obj';
    case '.fbx':
      return 'model/fbx';
    case '.stl':
      return 'model/stl';
    case '.mp4':
      return 'video/mp4';
    case '.webm':
      return 'video/webm';
    case '.mov':
      return 'video/quicktime';
    case '.m4v':
      return 'video/x-m4v';
    case '.ogg':
      return 'video/ogg';
    case '.html':
    case '.htm':
      return 'text/html';
    case '.pdf':
      return 'application/pdf';
    default:
      return 'application/octet-stream';
  }
}

function resolveAssetFile(storagePath: string): string | null {
  const canonical = canonicalStoragePath(storagePath);
  if (!canonical) return null;

  const repoRoot = resolve(__dirname, '../../..');
  const uploadRoot = resolve(repoRoot, process.env['UPLOAD_DIR']?.trim() || 'apps/api/uploads');
  const candidatePaths = canonical.startsWith('uploads/')
    ? [resolve(uploadRoot, canonical.replace(/^uploads\//, ''))]
    : canonical.startsWith('assets/')
      ? [
          resolve(repoRoot, 'apps/showroom_v2/public', canonical),
          resolve(repoRoot, 'apps/showroom/public', canonical),
        ]
      : [];

  for (const candidate of candidatePaths) {
    if (existsSync(candidate)) return candidate;
  }

  return null;
}

async function run() {
  const dryRun = process.env['DRY_RUN'] === '1';
  const uri = requireMongodbUri();
  logger.log(`Connecting to MongoDB${dryRun ? ' (dry run)' : ''}...`);
  await mongoose.connect(uri);

  const Product = mongoose.models[SEED_MODEL_NAMES.PRODUCT] || mongoose.model(SEED_MODEL_NAMES.PRODUCT, ProductSchema);
  const Artisan = mongoose.models[SEED_MODEL_NAMES.ARTISAN] || mongoose.model(SEED_MODEL_NAMES.ARTISAN, ArtisanSchema);
  const SiteConfig = mongoose.models[SEED_MODEL_NAMES.SITE_CONFIG] || mongoose.model(SEED_MODEL_NAMES.SITE_CONFIG, SiteConfigSchema);
  const FileAssetModel = mongoose.models[FileAsset.name] || mongoose.model(FileAsset.name, FileAssetSchema);
  const ShowroomContentModel =
    mongoose.models[ShowroomV2Content.name] ||
    mongoose.model(ShowroomV2Content.name, ShowroomV2ContentSchema);

  const buckets = new Map<string, SourceBucket>();
  const registerFromSource = (label: string, value: unknown) => {
    walkMediaPaths(value, (rawPath) => {
      const canonical = canonicalStoragePath(rawPath);
      if (!canonical) return;
      const bucket = buckets.get(canonical) ?? { sourceLabels: new Set<string>(), originalPaths: new Set<string>() };
      bucket.sourceLabels.add(label);
      bucket.originalPaths.add(rawPath);
      buckets.set(canonical, bucket);
    });
  };

  const [products, artisans, siteConfigDocs, showroomContentDoc, existingAssets] = await Promise.all([
    Product.find({ isDeleted: { $ne: true } }).lean().exec(),
    Artisan.find({ isDeleted: { $ne: true } }).lean().exec(),
    SiteConfig.find({}).lean().exec(),
    ShowroomContentModel.findOne({ key: SHOWROOM_CONTENT_KEY }).lean().exec(),
    FileAssetModel.find({}).lean().exec(),
  ]);

  products.forEach((product) => registerFromSource(`product:${String(product.slug ?? product._id)}`, product));
  artisans.forEach((artisan) => registerFromSource(`artisan:${String(artisan.slug ?? artisan._id)}`, artisan));
  siteConfigDocs.forEach((doc) => registerFromSource(`site-config:${String(doc.key ?? doc._id)}`, doc));
  registerFromSource('showroom-v2-defaults', createShowroomV2DefaultContent());
  if (showroomContentDoc) {
    registerFromSource('showroom-v2-content', showroomContentDoc);
  }

  const existingByPath = new Map<string, unknown>();
  existingAssets.forEach((asset) => {
    if (typeof asset.storagePath === 'string') {
      existingByPath.set(canonicalStoragePath(asset.storagePath), asset);
    }
  });

  let created = 0;
  let updated = 0;
  let skippedExisting = 0;
  let skippedMissingFile = 0;
  const missingFiles: string[] = [];

  for (const [storagePath, bucket] of buckets.entries()) {
    const resolvedFile = resolveAssetFile(storagePath);
    if (!resolvedFile) {
      skippedMissingFile += 1;
      missingFiles.push(storagePath);
      continue;
    }

    const desiredReferenceCount = Math.max(1, bucket.sourceLabels.size);
    const desiredMetadata = {
      origin: LEGACY_STATIC_TAG,
      sourceLabels: Array.from(bucket.sourceLabels),
      originalPaths: Array.from(bucket.originalPaths),
    };
    const existingAsset = existingByPath.get(storagePath) as ExistingAssetSnapshot | undefined;

    if (existingAsset) {
      const needsLegacySync =
        existingAsset.moduleRef === LEGACY_STATIC_MODULE_REF &&
        (
          existingAsset.status !== FILE_ASSET_STATUSES.ATTACHED ||
          existingAsset.referenceCount !== desiredReferenceCount ||
          !Array.isArray(existingAsset.tags) ||
          !existingAsset.tags.includes(LEGACY_STATIC_TAG)
        );

      if (!dryRun && needsLegacySync) {
        const nextTags = Array.from(new Set([...(existingAsset.tags ?? []), LEGACY_STATIC_TAG]));
        await FileAssetModel.updateOne(
          { _id: existingAsset._id },
          {
            $set: {
              status: FILE_ASSET_STATUSES.ATTACHED,
              referenceCount: desiredReferenceCount,
              moduleRef: LEGACY_STATIC_MODULE_REF,
              attachedAt: new Date(),
              metadata: desiredMetadata,
              tags: nextTags,
            },
          },
        ).exec();
        updated += 1;
      } else {
        skippedExisting += 1;
      }
      continue;
    }

    if (!dryRun) {
      const stats = statSync(resolvedFile);
      await FileAssetModel.create({
        fileName: basename(storagePath),
        originalName: basename(storagePath),
        mimeType: inferMimeType(storagePath),
        sizeBytes: Math.max(1, stats.size),
        storagePath,
        status: FILE_ASSET_STATUSES.ATTACHED,
        referenceCount: desiredReferenceCount,
        moduleRef: LEGACY_STATIC_MODULE_REF,
        tags: [LEGACY_STATIC_TAG],
        uploadedBy: 'system:legacy-static-backfill',
        uploadedAt: new Date(),
        attachedAt: new Date(),
        metadata: desiredMetadata,
      });
    }

    created += 1;
  }

  logger.log(
    JSON.stringify(
      {
        dryRun,
        discovered: buckets.size,
        created,
        updated,
        skippedExisting,
        skippedMissingFile,
        missingFiles: missingFiles.slice(0, 20),
      },
      null,
      2,
    ),
  );
}

run()
  .then(async () => {
    await mongoose.disconnect();
    process.exit(0);
  })
  .catch(async (error) => {
    logger.error('Backfill file assets failed', error instanceof Error ? error.stack : String(error));
    await mongoose.disconnect();
    process.exit(1);
  });
