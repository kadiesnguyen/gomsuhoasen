import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, QueryFilter } from 'mongoose';
import { DomainNotFoundException } from '@vt/platform-error';
import { FILE_ERRORS } from '../constants/file.constants';
import { buildInitialFileAssetValues } from '../constants/file-asset-writer-initial-values';
import { parsePaginationQuery, buildPaginationMeta } from '@gomhoasen/core';
import { CommitRefsDto, ListFileAssetsQueryDto, UnrefDto } from '../dto/file.dto';
import { FileAsset, FileAssetDocument, FileAssetStatus } from '../schemas/file-asset.schema';

type UploadInput = {
  file: Express.Multer.File;
  storagePath: string;
  uploadedBy?: string;
  moduleRef?: string;
  entityRef?: string;
  fieldRef?: string;
  metadata?: object;
};

@Injectable()
export class FileService {
  constructor(@InjectModel(FileAsset.name) private fileAssetModel: Model<FileAssetDocument>) {}

  async createAsset(input: UploadInput) {
    return this.fileAssetModel.create(buildInitialFileAssetValues({
      fileName: input.file.filename,
      originalName: input.file.originalname,
      mimeType: input.file.mimetype,
      sizeBytes: input.file.size,
      storagePath: input.storagePath,
      moduleRef: input.moduleRef,
      entityRef: input.entityRef,
      fieldRef: input.fieldRef,
      uploadedBy: input.uploadedBy,
      metadata: input.metadata,
    }));
  }

  async findById(id: string) {
    const asset = await this.fileAssetModel.findById(id);
    if (!asset) {
      throw new DomainNotFoundException(FILE_ERRORS.ASSET_NOT_FOUND, 'Tệp không tồn tại');
    }
    return asset;
  }

  async listAssets(query: ListFileAssetsQueryDto) {
    const { page, limit, skip } = parsePaginationQuery({ page: query.page, limit: query.limit });

    const filter: QueryFilter<FileAssetDocument> = {};
    if (query.status) filter.status = query.status;
    if (query.moduleRef) filter.moduleRef = query.moduleRef;
    if (query.entityRef) filter.entityRef = query.entityRef;
    if (query.fieldRef) filter.fieldRef = query.fieldRef;
    if (query.search) filter.$text = { $search: query.search };
    if (query.mimePrefix) filter.mimeType = new RegExp(`^${query.mimePrefix}/`, 'i');

    const [items, total] = await Promise.all([
      this.fileAssetModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      this.fileAssetModel.countDocuments(filter),
    ]);

    return {
      items,
      ...buildPaginationMeta(total, page, limit)
    };
  }

  async commitRefs(payload: CommitRefsDto) {
    const outcomes: Array<{ fileId: string; linked: boolean; outcomeCode: string; retryable: boolean }> = [];
    let updated = 0;

    for (const attachment of payload.attachments) {
      const asset = await this.fileAssetModel.findById(attachment.fileId);
      if (!asset) {
        outcomes.push({
          fileId: attachment.fileId,
          linked: false,
          outcomeCode: FILE_ERRORS.ASSET_NOT_FOUND,
          retryable: false,
        });
        continue;
      }

      asset.moduleRef = payload.moduleRef;
      asset.entityRef = payload.entityRef;
      asset.fieldRef = payload.fieldRef;
      asset.status = FileAssetStatus.ATTACHED;
      asset.referenceCount = 1;
      asset.attachedAt = new Date();
      await asset.save();

      updated += 1;
      outcomes.push({
        fileId: attachment.fileId,
        linked: true,
        outcomeCode: 'ATTACHED',
        retryable: false,
      });
    }

    return { updated, outcomes };
  }

  async unref(payload: UnrefDto) {
    const outcomes: Array<{ fileId: string; unlinked: boolean; outcomeCode: string; retryable: boolean }> = [];
    let updated = 0;

    for (const assetId of payload.assetIds) {
      const asset = await this.fileAssetModel.findById(assetId);
      if (!asset) {
        outcomes.push({
          fileId: assetId,
          unlinked: false,
          outcomeCode: FILE_ERRORS.ASSET_NOT_FOUND,
          retryable: false,
        });
        continue;
      }

      if (payload.moduleRef && asset.moduleRef && payload.moduleRef !== asset.moduleRef) {
        outcomes.push({
          fileId: assetId,
          unlinked: false,
          outcomeCode: 'MODULE_MISMATCH',
          retryable: false,
        });
        continue;
      }
      if (payload.entityRef && asset.entityRef && payload.entityRef !== asset.entityRef) {
        outcomes.push({
          fileId: assetId,
          unlinked: false,
          outcomeCode: 'ENTITY_MISMATCH',
          retryable: false,
        });
        continue;
      }
      if (payload.fieldRef && asset.fieldRef && payload.fieldRef !== asset.fieldRef) {
        outcomes.push({
          fileId: assetId,
          unlinked: false,
          outcomeCode: 'FIELD_MISMATCH',
          retryable: false,
        });
        continue;
      }

      asset.referenceCount = 0;
      asset.status = FileAssetStatus.ORPHAN;
      asset.moduleRef = undefined;
      asset.entityRef = undefined;
      asset.fieldRef = undefined;
      asset.orphanedAt = new Date();
      await asset.save();

      updated += 1;
      outcomes.push({
        fileId: assetId,
        unlinked: true,
        outcomeCode: 'ORPHANED',
        retryable: false,
      });
    }

    return { updated, outcomes };
  }
}
