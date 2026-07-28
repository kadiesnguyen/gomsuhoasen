import { Type } from 'class-transformer';
import { IsArray, IsNumber, IsObject, IsOptional, IsString, ValidateNested } from 'class-validator';

export class SiteContactDto {
  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  zaloOA?: string;

  @IsOptional()
  @IsString()
  address?: string;
}

export class SiteSocialDto {
  @IsOptional()
  @IsString()
  facebook?: string;

  @IsOptional()
  @IsString()
  instagram?: string;

  @IsOptional()
  @IsString()
  youtube?: string;
}

export class SiteSeoDto {
  @IsOptional()
  @IsString()
  defaultTitle?: string;

  @IsOptional()
  @IsString()
  defaultDescription?: string;

  @IsOptional()
  @IsString()
  ogImage?: string;
}

export class SiteCollectionDto {
  @IsString()
  id!: string;

  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  desc?: string;

  @IsOptional()
  @IsString()
  image?: string;

  @IsOptional()
  @IsNumber()
  count?: number;
}

export class SiteOccasionDto {
  @IsString()
  id!: string;

  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  icon?: string;

  @IsOptional()
  @IsString()
  desc?: string;
}

export class SiteJournalItemDto {
  @IsString()
  id!: string;

  @IsString()
  title!: string;

  @IsOptional()
  @IsString()
  excerpt?: string;

  @IsOptional()
  @IsString()
  image?: string;
}

export class SiteFilterOptionDto {
  @IsString()
  id!: string;

  @IsString()
  name!: string;

  @IsOptional()
  @IsNumber()
  count?: number;

  @IsOptional()
  @IsString()
  swatch?: string;

  @IsOptional()
  @IsNumber()
  min?: number;

  @IsOptional()
  @IsNumber()
  max?: number;
}

export class SiteFiltersDto {
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SiteFilterOptionDto)
  types?: SiteFilterOptionDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SiteFilterOptionDto)
  glazes?: SiteFilterOptionDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SiteFilterOptionDto)
  priceRanges?: SiteFilterOptionDto[];
}

export class UpdateSiteConfigDto {
  @IsOptional()
  @IsString()
  brandName?: string;

  @IsOptional()
  @IsString()
  tagline?: string;

  @IsOptional()
  @IsString()
  subtitle?: string;

  @IsOptional()
  @IsString()
  founded?: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => SiteContactDto)
  contact?: SiteContactDto;

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => SiteSocialDto)
  social?: SiteSocialDto;

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => SiteSeoDto)
  seo?: SiteSeoDto;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SiteCollectionDto)
  collections?: SiteCollectionDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SiteOccasionDto)
  occasions?: SiteOccasionDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SiteJournalItemDto)
  journal?: SiteJournalItemDto[];

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => SiteFiltersDto)
  filters?: SiteFiltersDto;
}
