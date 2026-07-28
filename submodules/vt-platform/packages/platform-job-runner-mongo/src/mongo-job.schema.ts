import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import type { JobSummary } from '@vt/platform-job-runner';
import { JOB_RUNNER_MONGO_TIME } from './job-runner-mongo.options';

export enum MongoJobStatus {
  OPEN = 'OPEN',
  RUNNING = 'RUNNING',
  FAILED = 'FAILED',
}

@Schema({ collection: 'jobs', timestamps: true })
export class MongoJob {
  @Prop({ type: String, required: true })
  tenantId!: string;

  @Prop({ type: String, required: true })
  jobKey!: string;

  @Prop({ type: String, index: true })
  correlationId?: string;

  @Prop({ type: String })
  causationId?: string;

  @Prop({ type: String })
  requestedBy?: string;

  @Prop({ type: Boolean, required: true, default: true })
  enabled!: boolean;

  @Prop({ type: String, required: true })
  cronExpr!: string;

  @Prop({ type: String, required: true, enum: MongoJobStatus, default: MongoJobStatus.OPEN })
  status!: MongoJobStatus;

  @Prop({ type: Number, required: true, default: 100 })
  batchLimit!: number;

  @Prop({ type: Number, required: true, default: 3 })
  maxRetries!: number;

  @Prop({ type: Number, required: true, default: 0 })
  retryCount!: number;

  @Prop({ type: Number, required: true, default: JOB_RUNNER_MONGO_TIME.DEFAULT_RETRY_DELAY_MS })
  retryDelayMs!: number;

  @Prop({ type: Number, required: true, default: JOB_RUNNER_MONGO_TIME.DEFAULT_STUCK_TIMEOUT_MS })
  stuckTimeoutMs!: number;

  @Prop({ type: Date })
  nextRunAfter?: Date;

  @Prop({ type: Date })
  lastTriggeredAt?: Date;

  @Prop({ type: Date })
  lastFinishedAt?: Date;

  @Prop({ type: Date })
  lastFailedAt?: Date;

  @Prop({ type: String })
  lastError?: string;

  @Prop({ type: Object })
  lastSummary?: JobSummary;
}

export type MongoJobDocument = MongoJob & Document & {
  createdAt?: Date;
  save(): Promise<MongoJobDocument>;
};

export const MongoJobSchema = SchemaFactory.createForClass(MongoJob);

MongoJobSchema.index({ tenantId: 1, jobKey: 1 }, { unique: true });
MongoJobSchema.index({ enabled: 1, status: 1, nextRunAfter: 1 });
MongoJobSchema.index({ status: 1, lastTriggeredAt: 1 });
MongoJobSchema.index({ tenantId: 1, correlationId: 1, createdAt: -1 });
