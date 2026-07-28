import { Type } from 'class-transformer';
import {
  IsArray,
  IsIn,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested
} from 'class-validator';
import {
  PRODUCT_STATUS_VALUES,
  PRODUCT_VARIANT_STATUS_VALUES,
  type ProductStatus,
  type ProductVariantStatus,
} from '@gomhoasen/contracts';

export class ProductVariantDto {
  @IsOptional()
  @IsString()
  id?: string;

  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  glaze?: string;

  @IsOptional()
  @IsString()
  size?: string;

  @IsOptional()
  @IsString()
  swatchColor?: string;

  @IsOptional()
  @IsString()
  swatchImage?: string;

  @IsOptional()
  @IsString()
  image?: string;

  @IsOptional()
  @IsString()
  modelUrl?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  referencePrice?: number;

  @IsOptional()
  @IsIn(PRODUCT_VARIANT_STATUS_VALUES)
  status?: ProductVariantStatus;
}

export class HotspotPanelDto {
  @IsString()
  title!: string;

  @IsString()
  content!: string;

  @IsOptional()
  @IsString()
  image?: string;

  @IsOptional()
  @IsString()
  cta?: string;
}

export class HotspotDto {
  @IsString()
  id!: string;

  @IsString()
  position!: string;

  @IsString()
  normal!: string;

  @IsString()
  label!: string;

  @ValidateNested()
  @Type(() => HotspotPanelDto)
  panel!: HotspotPanelDto;
}

export class ViewSectionCameraDto {
  @IsString()
  orbit!: string;

  @IsString()
  target!: string;
}

export class ViewSectionDto {
  @IsString()
  id!: string;

  @IsString()
  name!: string;

  @IsString()
  icon!: string;

  @ValidateNested()
  @Type(() => ViewSectionCameraDto)
  camera!: ViewSectionCameraDto;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => HotspotDto)
  hotspots?: HotspotDto[];
}

export class StoryDto {
  @IsString()
  title!: string;

  @IsOptional()
  @IsString()
  subtitle?: string;

  @IsString()
  content!: string;

  @IsOptional()
  @IsString()
  image?: string;
}

export class ProductSeoDto {
  @IsOptional()
  @IsString()
  metaTitle?: string;

  @IsOptional()
  @IsString()
  metaDescription?: string;
}

export class CreateProductDto {
  @IsString()
  @MaxLength(200)
  name!: string;

  @IsOptional()
  @IsString()
  slug?: string;

  @IsOptional()
  @IsString()
  sku?: string;

  @IsOptional()
  @IsIn(PRODUCT_STATUS_VALUES)
  status?: ProductStatus;

  @IsOptional()
  @IsString()
  collection?: string;

  @IsOptional()
  @IsString()
  collectionId?: string;

  @IsOptional()
  @IsString()
  artisanId?: string;

  @IsOptional()
  @IsString()
  glaze?: string;

  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @IsString()
  size?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  referencePrice?: number;

  @IsOptional()
  @IsString()
  priceLabel?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  weight?: number;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsString()
  modelUrl?: string;

  @IsOptional()
  @IsString()
  video360Url?: string;

  @IsOptional()
  @IsString()
  poster?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ViewSectionDto)
  viewSections?: ViewSectionDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductVariantDto)
  variants?: ProductVariantDto[];

  @IsOptional()
  @IsObject()
  specs?: Record<string, string | number | null>;

  @IsOptional()
  @ValidateNested()
  @Type(() => StoryDto)
  story?: StoryDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => ProductSeoDto)
  seo?: ProductSeoDto;

  @IsOptional()
  @IsNumber()
  @Min(0)
  sortOrder?: number;
}

export class UpdateProductDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  name?: string;

  @IsOptional()
  @IsString()
  slug?: string;

  @IsOptional()
  @IsString()
  sku?: string;

  @IsOptional()
  @IsIn(PRODUCT_STATUS_VALUES)
  status?: ProductStatus;

  @IsOptional()
  @IsString()
  collection?: string;

  @IsOptional()
  @IsString()
  collectionId?: string;

  @IsOptional()
  @IsString()
  artisanId?: string;

  @IsOptional()
  @IsString()
  glaze?: string;

  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @IsString()
  size?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  referencePrice?: number;

  @IsOptional()
  @IsString()
  priceLabel?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  weight?: number;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsString()
  modelUrl?: string;

  @IsOptional()
  @IsString()
  video360Url?: string;

  @IsOptional()
  @IsString()
  poster?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ViewSectionDto)
  viewSections?: ViewSectionDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductVariantDto)
  variants?: ProductVariantDto[];

  @IsOptional()
  @IsObject()
  specs?: Record<string, string | number | null>;

  @IsOptional()
  @ValidateNested()
  @Type(() => StoryDto)
  story?: StoryDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => ProductSeoDto)
  seo?: ProductSeoDto;

  @IsOptional()
  @IsNumber()
  @Min(0)
  sortOrder?: number;
}
