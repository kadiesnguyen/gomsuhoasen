import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { MONGOOSE_NO_DEFAULT } from '@vt/platform-mongoose';
import {
  FILE_ASSET_STATUSES,
  FILE_ASSET_STATUS_VALUES,
  type FileAssetStatusContract,
} from '@gomhoasen/contracts';

export const FileAssetStatus = FILE_ASSET_STATUSES;
export type FileAssetStatus = FileAssetStatusContract;

@Schema({ collection: 'file_assets', timestamps: true })
export class FileAsset {
  @Prop({ required: true })
  fileName!: string;

  @Prop({ required: true })
  originalName!: string;

  @Prop({ required: true })
  mimeType!: string;

  @Prop({ required: true, min: 1 })
  sizeBytes!: number;

  @Prop({ required: true })
  storagePath!: string;

  @Prop({ type: String, enum: FILE_ASSET_STATUS_VALUES, required: true })
  status!: FileAssetStatus;

  @Prop({ required: true, min: 0 })
  referenceCount!: number;

  @Prop()
  moduleRef?: string;

  @Prop()
  entityRef?: string;

  @Prop()
  fieldRef?: string;

  @Prop()
  uploadedBy?: string;

  @Prop({ type: Date })
  uploadedAt?: Date;

  @Prop({ type: Date })
  attachedAt?: Date;

  @Prop({ type: Date })
  orphanedAt?: Date;

  @Prop({ type: Date })
  deletedAt?: Date;

  @Prop({ type: [String], required: true, default: MONGOOSE_NO_DEFAULT })
  tags!: string[];

  @Prop({ type: Object })
  metadata?: object;
}

export type FileAssetDocument = FileAsset & Document;
export const FileAssetSchema = SchemaFactory.createForClass(FileAsset);

FileAssetSchema.index({ status: 1, createdAt: -1 });
FileAssetSchema.index({ moduleRef: 1, entityRef: 1, fieldRef: 1, createdAt: -1 });
FileAssetSchema.index({ originalName: 'text', fileName: 'text' });
