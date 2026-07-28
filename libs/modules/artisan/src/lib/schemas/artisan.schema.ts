import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { MONGOOSE_NO_DEFAULT } from '@vt/platform-mongoose';
import {
  ARTISAN_STATUSES,
  ARTISAN_STATUS_VALUES,
  type ArtisanStatus as ContractArtisanStatus,
} from '@gomhoasen/contracts';

export const ArtisanStatus = ARTISAN_STATUSES;
export type ArtisanStatus = ContractArtisanStatus;

@Schema({ collection: 'artisans', timestamps: true })
export class Artisan {
  @Prop({ required: true, maxlength: 200 })
  name!: string;

  @Prop({ required: true, unique: true })
  slug!: string;

  @Prop()
  avatar?: string;

  @Prop()
  bio?: string;

  @Prop()
  lineage?: string; // "Truyền nhân đời thứ 5, dòng họ Trần — Bát Tràng"

  @Prop({ type: Number })
  yearsExperience?: number;

  @Prop({ type: [String], required: true, default: MONGOOSE_NO_DEFAULT })
  certifications!: string[];

  @Prop({ type: Object })
  seo?: { metaTitle?: string; metaDescription?: string };

  @Prop({ type: Number, required: true })
  sortOrder!: number;

  @Prop()
  title?: string; // "Nghệ nhân ưu tú"

  @Prop()
  coverImage?: string;

  @Prop()
  specialty?: string; // "Men Cobalt, Vẽ tay"

  @Prop()
  workshop?: string; // "Làng gốm Bình Dương"

  @Prop()
  location?: string;

  @Prop()
  phone?: string;

  @Prop()
  email?: string;

  @Prop({ type: String, enum: ARTISAN_STATUS_VALUES, required: true })
  status!: ArtisanStatus;

  @Prop({ required: true, index: true })
  isDeleted!: boolean;

  @Prop()
  deletedAt?: Date;
}

export type ArtisanDocument = Artisan & Document;
export const ArtisanSchema = SchemaFactory.createForClass(Artisan);

ArtisanSchema.index({ slug: 1, isDeleted: 1 }, { unique: true, partialFilterExpression: { isDeleted: false } });
ArtisanSchema.index({ name: 'text', bio: 'text' }); // text search on name + bio
