import { Type } from 'class-transformer';
import { IsArray, IsDate, IsIn, IsNumber, IsOptional, IsString, Min, ValidateNested } from 'class-validator';
import { QUOTE_STATUS_VALUES, type QuoteStatus } from '@gomhoasen/contracts';

export class QuoteLineItemDto {
  @IsString()
  productId!: string;

  @IsString()
  productName!: string;

  @IsOptional()
  @IsString()
  glaze?: string;

  @IsOptional()
  @IsString()
  size?: string;

  @IsNumber()
  @Min(1)
  quantity!: number;

  @IsNumber()
  @Min(0)
  unitPrice!: number;

  @IsOptional()
  @IsString()
  customization?: string;
}

export class CreateQuoteDto {
  @IsString()
  rfqId!: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QuoteLineItemDto)
  items!: QuoteLineItemDto[];

  @IsOptional()
  @IsNumber()
  @Min(0)
  discount?: number;

  @IsOptional()
  @IsString()
  terms?: string;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  validUntil?: Date;
}

export class UpdateQuoteDto {
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QuoteLineItemDto)
  items?: QuoteLineItemDto[];

  @IsOptional()
  @IsNumber()
  @Min(0)
  discount?: number;

  @IsOptional()
  @IsString()
  terms?: string;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  validUntil?: Date;

  @IsOptional()
  @IsIn(QUOTE_STATUS_VALUES)
  status?: QuoteStatus;
}
