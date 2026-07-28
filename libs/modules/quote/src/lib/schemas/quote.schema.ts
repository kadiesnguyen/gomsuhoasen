// Task card: R2-006
// Refs read:
// - /Users/bonbon177tb/Documents/zalominiapp/v2/libs/modules/ecommerce/src/lib/schemas/order.schema.ts
// Kept: embedded line item snapshot and lifecycle status
// Dropped: checkout, payment, shipping, vouchers, tenant fields
// Adapted: quote is a commercial document generated from RFQ

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { MONGOOSE_NO_DEFAULT } from '@vt/platform-mongoose';
import {
  QUOTE_STATUSES,
  QUOTE_STATUS_VALUES,
  type QuoteStatus as ContractQuoteStatus,
} from '@gomhoasen/contracts';

export const QuoteStatus = QUOTE_STATUSES;
export type QuoteStatus = ContractQuoteStatus;

export class QuoteLineItem {
  @Prop({ type: Types.ObjectId, required: true })
  productId!: Types.ObjectId;

  @Prop({ required: true })
  productName!: string;

  @Prop()
  glaze?: string;

  @Prop()
  size?: string;

  @Prop({ type: Number, required: true, min: 1 })
  quantity!: number;

  @Prop({ type: Number, required: true, min: 0 })
  unitPrice!: number;

  @Prop()
  customization?: string;

  @Prop({ type: Number, required: true, min: 0 })
  lineTotal!: number;
}

@Schema({ collection: 'quotes', timestamps: true })
export class Quote {
  @Prop({ required: true, unique: true })
  code!: string;

  @Prop({ type: Types.ObjectId, required: true, index: true })
  rfqId!: Types.ObjectId;

  @Prop()
  customerName?: string;

  @Prop()
  customerPhone?: string;

  @Prop()
  customerEmail?: string;

  @Prop({ type: [Object], required: true, default: MONGOOSE_NO_DEFAULT })
  items!: QuoteLineItem[];

  @Prop({ type: Number, required: true, min: 0 })
  subtotal!: number;

  @Prop({ type: Number, required: true, min: 0 })
  discount!: number;

  @Prop({ type: Number, required: true, min: 0 })
  total!: number;

  @Prop()
  terms?: string;

  @Prop()
  validUntil?: Date;

  @Prop()
  pdfUrl?: string;

  @Prop()
  sentAt?: Date;

  @Prop()
  publicShareToken?: string;

  @Prop()
  publicShareExpiresAt?: Date;

  @Prop()
  publicShareRevokedAt?: Date;

  @Prop({ type: String, enum: QUOTE_STATUS_VALUES, required: true, index: true })
  status!: QuoteStatus;

  @Prop({ type: Types.ObjectId })
  createdBy?: Types.ObjectId;
}

export type QuoteDocument = Quote & Document;
export const QuoteSchema = SchemaFactory.createForClass(Quote);

QuoteSchema.index({ status: 1, createdAt: -1 });
QuoteSchema.index({ publicShareToken: 1 }, { unique: true, sparse: true });
