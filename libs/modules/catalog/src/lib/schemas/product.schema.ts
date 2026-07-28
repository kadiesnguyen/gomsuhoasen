// Refs read: v2/libs/catalog/src/lib/schemas/product.schema.ts
// Kept: slug, status, timestamps, soft-delete, images, variants pattern
// Dropped: tenantId, catalogProfile, fieldSetId, queryMeta, variantAxes
// Adapted: fixed ceramic fields (glaze, size, weight, modelUrl, viewSections, hotspots, story)

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { MONGOOSE_NO_DEFAULT } from '@vt/platform-mongoose';
import {
  PRODUCT_STATUSES,
  PRODUCT_STATUS_VALUES,
  type ProductStatus as ContractProductStatus,
} from '@gomhoasen/contracts';

export const ProductStatus = PRODUCT_STATUSES;
export type ProductStatus = ContractProductStatus;

export class ProductVariant {
  @Prop({ required: true })
  id!: string;

  @Prop({ required: true })
  name!: string;

  @Prop()
  glaze?: string;

  @Prop()
  swatchColor?: string;

  @Prop()
  swatchImage?: string;

  @Prop()
  image?: string;

  @Prop()
  modelUrl?: string;

  @Prop()
  thumbnail?: string;
}

export class ViewSection {
  @Prop({ required: true })
  id!: string;

  @Prop({ required: true })
  name!: string;

  @Prop({ required: true })
  icon!: string;

  @Prop({ type: Object })
  camera?: { orbit: string; target: string };

  @Prop()
  description?: string;

  @Prop({ type: [Object], required: true, default: MONGOOSE_NO_DEFAULT })
  hotspots!: Hotspot[];
}

export class Hotspot {
  @Prop({ required: true })
  position!: string;

  @Prop({ required: true })
  normal!: string;

  @Prop({ required: true })
  label!: string;

  @Prop()
  description?: string;

  @Prop()
  image?: string;
}

export class StoryNode {
  @Prop({ required: true })
  title!: string;

  @Prop()
  subtitle?: string;

  @Prop({ required: true })
  content!: string;

  @Prop()
  image?: string;
}

@Schema({ collection: 'products', timestamps: true, suppressReservedKeysWarning: true })
export class Product {
  @Prop({ required: true, maxlength: 200 })
  name!: string;

  @Prop({ required: true, unique: true })
  slug!: string;

  @Prop()
  sku?: string;

  @Prop({ type: String, enum: PRODUCT_STATUS_VALUES, required: true })
  status!: ProductStatus;

  @Prop()
  collection?: string;

  @Prop()
  glaze?: string;

  @Prop()
  type?: string;

  @Prop()
  size?: string;

  @Prop({ type: Number, required: true, min: 0 })
  referencePrice!: number;

  @Prop()
  priceLabel?: string;

  @Prop({ type: Number })
  weight?: number;

  @Prop()
  description?: string;

  @Prop({ type: [String], required: true, default: MONGOOSE_NO_DEFAULT })
  tags!: string[];

  // 3D / Immersive
  @Prop()
  modelUrl?: string;

  @Prop()
  video360Url?: string;

  @Prop()
  poster?: string;

  @Prop({ type: [String], required: true, default: MONGOOSE_NO_DEFAULT })
  images!: string[];

  @Prop({ type: [Object], required: true, default: MONGOOSE_NO_DEFAULT })
  viewSections!: ViewSection[];

  @Prop({ type: Object })
  story?: StoryNode;

  @Prop({ type: [Object], required: true, default: MONGOOSE_NO_DEFAULT })
  variants!: ProductVariant[];

  // Specs
  @Prop({ type: Object })
  specs?: Record<string, string | number | null>;

  // Artisan link
  @Prop()
  artisanId?: string;

  @Prop({ type: Object })
  seo?: { metaTitle?: string; metaDescription?: string };

  @Prop({ type: Number, required: true })
  sortOrder!: number;

  // Soft delete
  @Prop({ required: true, index: true })
  isDeleted!: boolean;

  @Prop()
  deletedAt?: Date;
}

export type ProductDocument = Product & Document;
export const ProductSchema = SchemaFactory.createForClass(Product);

ProductSchema.index({ slug: 1, isDeleted: 1 }, { unique: true, partialFilterExpression: { isDeleted: false } });
ProductSchema.index({ status: 1, isDeleted: 1 });
ProductSchema.index({ name: 'text' });
