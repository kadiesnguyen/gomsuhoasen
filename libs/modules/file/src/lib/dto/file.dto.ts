import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsIn,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { FILE_ASSET_STATUS_VALUES, type FileAssetStatusContract } from '@gomhoasen/contracts';

export class ListFileAssetsQueryDto {
  @IsOptional()
  @IsIn(FILE_ASSET_STATUS_VALUES)
  status?: FileAssetStatusContract;

  @IsOptional()
  @IsString()
  moduleRef?: string;

  @IsOptional()
  @IsString()
  entityRef?: string;

  @IsOptional()
  @IsString()
  fieldRef?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsIn(['image', 'video'])
  mimePrefix?: 'image' | 'video';

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number;
}

export class CommitRefAttachmentDto {
  @IsString()
  @IsNotEmpty()
  fileId!: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  position?: number;
}

export class CommitRefsDto {
  @IsString()
  @IsNotEmpty()
  moduleRef!: string;

  @IsString()
  @IsNotEmpty()
  entityRef!: string;

  @IsString()
  @IsNotEmpty()
  fieldRef!: string;

  @IsOptional()
  @IsString()
  purpose?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CommitRefAttachmentDto)
  attachments!: CommitRefAttachmentDto[];
}

export class UnrefDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  assetIds!: string[];

  @IsOptional()
  @IsString()
  moduleRef?: string;

  @IsOptional()
  @IsString()
  entityRef?: string;

  @IsOptional()
  @IsString()
  fieldRef?: string;
}

export class CreateAssetMetadataDto {
  @IsOptional()
  @IsString()
  moduleRef?: string;

  @IsOptional()
  @IsString()
  entityRef?: string;

  @IsOptional()
  @IsString()
  fieldRef?: string;

  @IsOptional()
  @IsObject()
  metadata?: object;
}
