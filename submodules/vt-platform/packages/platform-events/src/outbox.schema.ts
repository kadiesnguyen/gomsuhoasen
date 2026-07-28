import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type OutboxDocument = HydratedDocument<Outbox>;

export enum OutboxStatus {
  NEW = 'NEW',
  PROCESSING = 'PROCESSING',
  PROCESSED = 'PROCESSED',
  FAILED = 'FAILED',
}

@Schema({ timestamps: true, collection: 'outbox_events' })
export class Outbox {
  @Prop({ type: String, required: true, unique: true, index: true })
  eventId!: string;

  @Prop({ type: String, required: true })
  eventType!: string;

  @Prop({ type: Number, required: true, default: 1 })
  schemaVersion!: number;

  @Prop({ type: Object, required: true })
  payload!: Record<string, unknown>;

  @Prop({ type: String, enum: OutboxStatus, default: OutboxStatus.NEW, index: true })
  status!: OutboxStatus;

  @Prop({ type: String, required: true, index: true })
  tenantId!: string;

  @Prop({ type: String, required: true, index: true })
  correlationId!: string;

  @Prop({ type: String })
  causationId?: string;

  @Prop({ type: String, required: true, default: 'unknown' })
  producer!: string;

  @Prop({ type: String, required: true, default: 'unknown' })
  subjectType!: string;

  @Prop({ type: String, required: true, default: 'unknown' })
  subjectId!: string;

  @Prop({ type: Date, required: true, default: Date.now })
  occurredAt!: Date;

  @Prop({ type: String })
  aggregateType?: string;

  @Prop({ type: String })
  aggregateId?: string;

  @Prop({ type: Date, index: true })
  nextRetryAt?: Date;

  @Prop({ type: Number, default: 0 })
  retryCount?: number;

  @Prop({ type: String })
  lastError?: string;

  @Prop({ type: Date })
  processedAt?: Date;
}

export const OutboxSchema = SchemaFactory.createForClass(Outbox);
