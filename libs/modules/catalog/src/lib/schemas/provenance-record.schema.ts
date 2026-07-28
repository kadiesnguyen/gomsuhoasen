// Task card: R2-004B
// Refs read:
// - docs/03_ARCHITECTURE/DATABASE_SCHEMA.md section provenance_records
// - docs/03_ARCHITECTURE/ADR-002_UPLOAD_STORAGE.md
// Kept: standalone provenance collection, product link, PDF file URL
// Dropped: Zalo file-management refs and tenant-scoped assets
// Adapted: soft delete for portal-safe removal

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import {
  PROVENANCE_TYPES,
  PROVENANCE_TYPE_VALUES,
  type ProvenanceType as ContractProvenanceType,
} from '@gomhoasen/contracts';

export const ProvenanceType = PROVENANCE_TYPES;
export type ProvenanceType = ContractProvenanceType;

@Schema({ collection: 'provenance_records', timestamps: true })
export class ProvenanceRecord {
  @Prop({ type: Types.ObjectId, required: true, index: true })
  productId!: Types.ObjectId;

  @Prop({ type: String, enum: PROVENANCE_TYPE_VALUES, required: true })
  type!: ProvenanceType;

  @Prop({ required: true })
  title!: string;

  @Prop({ required: true })
  fileUrl!: string;

  @Prop()
  issuedDate?: Date;

  @Prop()
  issuedBy?: string;

  @Prop({ required: true, index: true })
  isActive!: boolean;

  @Prop({ required: true, index: true })
  isDeleted!: boolean;

  @Prop()
  deletedAt?: Date;
}

export type ProvenanceRecordDocument = ProvenanceRecord & Document;
export const ProvenanceRecordSchema = SchemaFactory.createForClass(ProvenanceRecord);

ProvenanceRecordSchema.index({ productId: 1, type: 1 });
