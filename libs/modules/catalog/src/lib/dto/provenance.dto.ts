import { Type } from 'class-transformer';
import { IsBoolean, IsDate, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { PROVENANCE_TYPE_VALUES, type ProvenanceType } from '@gomhoasen/contracts';

export class CreateProvenanceDto {
  @IsIn(PROVENANCE_TYPE_VALUES)
  type!: ProvenanceType;

  @IsString()
  @MaxLength(200)
  title!: string;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  issuedDate?: Date;

  @IsOptional()
  @IsString()
  issuedBy?: string;
}

export class UpdateProvenanceDto {
  @IsOptional()
  @IsIn(PROVENANCE_TYPE_VALUES)
  type?: ProvenanceType;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  issuedDate?: Date;

  @IsOptional()
  @IsString()
  issuedBy?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
