import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type InboxDocument = HydratedDocument<Inbox>;

@Schema({ timestamps: true, collection: 'inbox_events' })
export class Inbox {
  @Prop({ type: String, index: true })
  tenantId?: string;

  @Prop({ type: String, required: true })
  eventId!: string;

  @Prop({ type: String })
  eventType?: string;

  @Prop({ type: String, required: true })
  consumerGroup!: string;

  @Prop({ type: String, required: true, default: 'PENDING' })
  status!: 'PENDING' | 'PROCESSED' | 'FAILED';

  @Prop({ type: Number, default: 1 })
  attempts!: number;

  @Prop({ type: String })
  correlationId?: string;

  @Prop({ type: String })
  lastError?: string;

  @Prop({ type: Date })
  claimedAt?: Date;

  @Prop({ type: Date })
  processedAt?: Date;
}

export const InboxSchema = SchemaFactory.createForClass(Inbox);
InboxSchema.index({ eventId: 1, consumerGroup: 1 }, { unique: true });
InboxSchema.index({ tenantId: 1, status: 1, createdAt: -1 });
