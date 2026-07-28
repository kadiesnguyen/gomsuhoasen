import { IsArray, IsEmail, IsIn, IsNumber, IsOptional, IsString, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { RFQ_SOURCE_VALUES, RFQ_STATUS_VALUES, type RfqSource, type RfqStatus } from '@gomhoasen/contracts';

export class RfqLineItemDto {
  @IsString()
  productId!: string;

  @IsString()
  productName!: string;

  @IsOptional()
  @IsString()
  variant?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  quantity?: number;

  @IsOptional()
  @IsString()
  note?: string;
}

export class CreateRfqDto {
  @IsString()
  customerName!: string;

  @IsString()
  customerPhone!: string;

  @IsOptional()
  @IsEmail()
  customerEmail?: string;

  @IsOptional()
  @IsString()
  customerCompany?: string;

  @IsOptional()
  @IsString()
  message?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RfqLineItemDto)
  lineItems?: RfqLineItemDto[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  productIds?: string[];

  @IsIn(RFQ_SOURCE_VALUES)
  source!: RfqSource;
}

export class UpdateRfqStatusDto {
  @IsIn(RFQ_STATUS_VALUES)
  status!: RfqStatus;

  @IsOptional()
  @IsString()
  internalNote?: string;
}
