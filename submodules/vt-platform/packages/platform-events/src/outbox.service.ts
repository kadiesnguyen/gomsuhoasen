import { Inject, Injectable, Logger, Optional } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { randomUUID } from 'crypto';
import { ClientSession, Model } from 'mongoose';
import { PLATFORM_OUTBOX_CREATED_EVENT } from './event-topic.types';
import { Outbox, OutboxStatus } from './outbox.schema';

export const PLATFORM_OUTBOX_PUBLISHER = 'PLATFORM_OUTBOX_PUBLISHER';

export interface OutboxPublisher {
  emit(eventType: string, event: Outbox): void;
}

export interface OutboxMetadata {
  eventId?: string;
  tenantId?: string;
  correlationId?: string;
  causationId?: string;
  schemaVersion?: number;
  producer?: string;
  subjectType?: string;
  subjectId?: string;
  occurredAt?: Date;
  aggregateType?: string;
  aggregateId?: string;
}

export type OutboxSession = ClientSession | null;

export const OUTBOX_SERVICE_ERROR_MESSAGES = {
  MISSING_TENANT_LOG: (eventType: string) => `[OutboxService] Rejecting event "${eventType}" because tenantId is missing`,
  MISSING_TENANT: (eventType: string) => `OutboxService.stage: tenantId is required for event "${eventType}"`,
} as const;

const normalizeOptionalText = (value: string | undefined): string | undefined => {
  const normalized = value?.trim();
  return normalized && normalized.length > 0 ? normalized : undefined;
};

@Injectable()
export class OutboxService {
  private readonly logger = new Logger(OutboxService.name);

  constructor(
    @InjectModel(Outbox.name) private readonly outboxModel: Model<Outbox>,
    @Optional()
    @Inject(PLATFORM_OUTBOX_PUBLISHER)
    private readonly publisher?: OutboxPublisher,
  ) {}

  async emit(
    eventType: string,
    payload: Record<string, unknown>,
    session: OutboxSession,
    metadata?: OutboxMetadata,
  ): Promise<Outbox> {
    const event = await this.stage(eventType, payload, session, metadata);
    this.notifyCreated(event);
    return event;
  }

  async stage(
    eventType: string,
    payload: Record<string, unknown>,
    session: OutboxSession,
    metadata?: OutboxMetadata,
  ): Promise<Outbox> {
    if (!metadata?.tenantId) {
      this.logger.error(OUTBOX_SERVICE_ERROR_MESSAGES.MISSING_TENANT_LOG(eventType));
      throw new Error(OUTBOX_SERVICE_ERROR_MESSAGES.MISSING_TENANT(eventType));
    }

    const event = new this.outboxModel({
      eventId: normalizeOptionalText(metadata.eventId) ?? randomUUID(),
      eventType,
      schemaVersion: metadata.schemaVersion ?? 1,
      payload,
      status: OutboxStatus.NEW,
      tenantId: metadata.tenantId,
      correlationId: normalizeOptionalText(metadata.correlationId) ?? randomUUID(),
      causationId: normalizeOptionalText(metadata.causationId),
      producer: normalizeOptionalText(metadata.producer) ?? 'unknown',
      subjectType: normalizeOptionalText(metadata.subjectType)
        ?? normalizeOptionalText(metadata.aggregateType)
        ?? 'unknown',
      subjectId: normalizeOptionalText(metadata.subjectId)
        ?? normalizeOptionalText(metadata.aggregateId)
        ?? 'unknown',
      occurredAt: metadata.occurredAt ?? new Date(),
      aggregateType: metadata.aggregateType,
      aggregateId: metadata.aggregateId,
      nextRetryAt: new Date(),
    });

    await event.save({ session });
    return event;
  }

  notifyCreated(event: Outbox): void {
    this.publisher?.emit(PLATFORM_OUTBOX_CREATED_EVENT, event);
  }
}
