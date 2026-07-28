// Refs read: v2/libs/modules/ecommerce/src/lib/schemas/order.schema.ts
// Kept: status lifecycle, line items pattern, timestamps
// Dropped: cart, checkout, payment, shipping, voucher, inventory, tenantId
// Adapted: RFQ = lead capture (not order). Status: NEW → CONTACTED → QUOTED → CLOSED

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { MONGOOSE_NO_DEFAULT } from '@vt/platform-mongoose';
import {
  RFQ_SOURCES,
  RFQ_SOURCE_VALUES,
  RFQ_STATUSES,
  RFQ_STATUS_VALUES,
  type RfqSource as ContractRfqSource,
  type RfqStatus as ContractRfqStatus,
} from '@gomhoasen/contracts';

export const RfqSource = RFQ_SOURCES;
export type RfqSource = ContractRfqSource;
export const RfqStatus = RFQ_STATUSES;
export type RfqStatus = ContractRfqStatus;

export class RfqLineItem {
  @Prop({ required: true })
  productId!: string;

  @Prop({ required: true })
  productName!: string;

  @Prop()
  variant?: string;

  @Prop({ type: Number, required: true, min: 1 })
  quantity!: number;

  @Prop()
  note?: string;
}

@Schema({ collection: 'rfqs', timestamps: true })
export class Rfq {
  @Prop({ required: true })
  customerName!: string;

  @Prop({ required: true })
  customerPhone!: string;

  @Prop()
  customerEmail?: string;

  @Prop()
  customerCompany?: string;

  @Prop()
  message?: string;

  @Prop({ type: [Object], required: true, default: MONGOOSE_NO_DEFAULT })
  lineItems!: RfqLineItem[];

  @Prop({ type: String, enum: RFQ_STATUS_VALUES, required: true })
  status!: RfqStatus;

  @Prop({ type: String, enum: RFQ_SOURCE_VALUES, required: true })
  source!: RfqSource;

  @Prop()
  internalNote?: string;

  @Prop()
  assignedTo?: string;
}

export type RfqDocument = Rfq & Document;
export const RfqSchema = SchemaFactory.createForClass(Rfq);

RfqSchema.index({ status: 1, createdAt: -1 });
