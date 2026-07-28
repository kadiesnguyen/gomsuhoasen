// Task card: R2-008
// Refs read:
// - /Users/bonbon177tb/Documents/zalominiapp/v2/apps/api/src/app/app.module.ts
// - product-detail-360/data/site.json
// - docs/03_ARCHITECTURE/DATABASE_SCHEMA.md section site_config
// Kept: singleton config, public read endpoint, protected admin update
// Dropped: tenant site config, CMS/page-builder engine
// Adapted: POC home/listing data kept as flexible sections on one document

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { MONGOOSE_NO_DEFAULT } from '@vt/platform-mongoose';

export class SiteContact {
  @Prop()
  phone?: string;

  @Prop()
  email?: string;

  @Prop()
  zaloOA?: string;

  @Prop()
  address?: string;
}

export class SiteSocial {
  @Prop()
  facebook?: string;

  @Prop()
  instagram?: string;

  @Prop()
  youtube?: string;
}

export class SiteSeo {
  @Prop()
  defaultTitle?: string;

  @Prop()
  defaultDescription?: string;

  @Prop()
  ogImage?: string;
}

export class SiteCollection {
  @Prop({ required: true })
  id!: string;

  @Prop({ required: true })
  name!: string;

  @Prop()
  desc?: string;

  @Prop()
  image?: string;

  @Prop({ type: Number, required: true })
  count!: number;
}

export class SiteOccasion {
  @Prop({ required: true })
  id!: string;

  @Prop({ required: true })
  name!: string;

  @Prop()
  icon?: string;

  @Prop()
  desc?: string;
}

export class SiteJournalItem {
  @Prop({ required: true })
  id!: string;

  @Prop({ required: true })
  title!: string;

  @Prop()
  excerpt?: string;

  @Prop()
  image?: string;
}

export class SiteFilterOption {
  @Prop({ required: true })
  id!: string;

  @Prop({ required: true })
  name!: string;

  @Prop({ type: Number })
  count?: number;

  @Prop()
  swatch?: string;

  @Prop({ type: Number })
  min?: number;

  @Prop({ type: Number })
  max?: number;
}

export class SiteFilters {
  @Prop({ type: [Object], required: true, default: MONGOOSE_NO_DEFAULT })
  types!: SiteFilterOption[];

  @Prop({ type: [Object], required: true, default: MONGOOSE_NO_DEFAULT })
  glazes!: SiteFilterOption[];

  @Prop({ type: [Object], required: true, default: MONGOOSE_NO_DEFAULT })
  priceRanges!: SiteFilterOption[];
}

@Schema({ collection: 'site_config', timestamps: true })
export class SiteConfig {
  @Prop({ required: true, unique: true })
  key!: string;

  @Prop({ required: true })
  brandName!: string;

  @Prop()
  tagline?: string;

  @Prop()
  subtitle?: string;

  @Prop()
  founded?: string;

  @Prop()
  location?: string;

  @Prop({ type: Object, required: true })
  contact!: SiteContact;

  @Prop({ type: Object, required: true })
  social!: SiteSocial;

  @Prop({ type: Object, required: true })
  seo!: SiteSeo;

  @Prop({ type: [Object], required: true, default: MONGOOSE_NO_DEFAULT })
  collections!: SiteCollection[];

  @Prop({ type: [Object], required: true, default: MONGOOSE_NO_DEFAULT })
  occasions!: SiteOccasion[];

  @Prop({ type: [Object], required: true, default: MONGOOSE_NO_DEFAULT })
  journal!: SiteJournalItem[];

  @Prop({ type: Object, required: true })
  filters!: SiteFilters;
}

export type SiteConfigDocument = SiteConfig & Document;
export const SiteConfigSchema = SchemaFactory.createForClass(SiteConfig);
