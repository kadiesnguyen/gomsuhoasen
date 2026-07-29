import {
  IsArray,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ORDER_STATUS_VALUES, type OrderStatus } from '@gomhoasen/contracts';

export class OrderLineItemDto {
  @IsString()
  productId!: string;

  @IsString()
  productName!: string;

  @IsOptional()
  @IsString()
  productSlug?: string;

  @IsNumber()
  @Min(1)
  quantity!: number;

  @IsNumber()
  @Min(0)
  unitPrice!: number;
}

export class OrderShippingAddressDto {
  @IsString()
  @MinLength(3)
  street!: string;

  @IsString()
  provinceCode!: string;

  @IsString()
  provinceName!: string;

  @IsString()
  wardCode!: string;

  @IsString()
  wardName!: string;
}

export class CreateOrderDto {
  @IsString()
  @MinLength(2)
  customerName!: string;

  @IsString()
  @MinLength(8)
  customerPhone!: string;

  @ValidateNested()
  @Type(() => OrderShippingAddressDto)
  shippingAddress!: OrderShippingAddressDto;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderLineItemDto)
  lineItems!: OrderLineItemDto[];
}

export class UpdateOrderStatusDto {
  @IsIn(ORDER_STATUS_VALUES)
  status!: OrderStatus;

  @IsOptional()
  @IsString()
  internalNote?: string;
}
