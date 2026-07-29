import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { MONGOOSE_NO_DEFAULT } from '@vt/platform-mongoose';
import {
  ORDER_STATUSES,
  ORDER_STATUS_VALUES,
  type OrderStatus as ContractOrderStatus,
} from '@gomhoasen/contracts';

export const OrderStatus = ORDER_STATUSES;
export type OrderStatus = ContractOrderStatus;

export class OrderLineItem {
  @Prop({ required: true })
  productId!: string;

  @Prop({ required: true })
  productName!: string;

  @Prop()
  productSlug?: string;

  @Prop({ type: Number, required: true, min: 1 })
  quantity!: number;

  @Prop({ type: Number, required: true, min: 0 })
  unitPrice!: number;

  @Prop({ type: Number, required: true, min: 0 })
  lineTotal!: number;
}

export class OrderShippingAddress {
  @Prop({ required: true })
  street!: string;

  @Prop({ required: true })
  provinceCode!: string;

  @Prop({ required: true })
  provinceName!: string;

  @Prop({ required: true })
  wardCode!: string;

  @Prop({ required: true })
  wardName!: string;
}

@Schema({ collection: 'orders', timestamps: true })
export class Order {
  @Prop({ required: true })
  customerName!: string;

  @Prop({ required: true })
  customerPhone!: string;

  @Prop({ type: Object, required: true })
  shippingAddress!: OrderShippingAddress;

  @Prop({ type: [Object], required: true, default: MONGOOSE_NO_DEFAULT })
  lineItems!: OrderLineItem[];

  @Prop({ type: Number, required: true, min: 0 })
  subtotal!: number;

  @Prop({ type: Number, required: true, min: 0 })
  total!: number;

  @Prop({ type: String, enum: ORDER_STATUS_VALUES, required: true })
  status!: OrderStatus;

  @Prop()
  internalNote?: string;
}

export type OrderDocument = Order & Document;
export const OrderSchema = SchemaFactory.createForClass(Order);

OrderSchema.index({ status: 1, createdAt: -1 });
OrderSchema.index({ customerPhone: 1, createdAt: -1 });
OrderSchema.index({ customerName: 'text', customerPhone: 'text' });
