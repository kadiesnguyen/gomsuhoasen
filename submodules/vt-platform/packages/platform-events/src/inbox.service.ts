import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { createEventDedupeKey, type EventIdentityInput } from './idempotency';
import { Inbox } from './inbox.schema';

export interface InboxEnvelopeMetadata {
  eventId: string;
  tenantId: string;
  eventType: string;
  correlationId: string;
}

@Injectable()
export class InboxService {
  constructor(@InjectModel(Inbox.name) private readonly inboxModel: Model<Inbox>) {}

  async ensureIndexes(): Promise<void> {
    await this.inboxModel.createIndexes();
  }

  async lock(eventId: string, consumerGroup: string): Promise<boolean> {
    try {
      await this.inboxModel.create({
        eventId,
        consumerGroup,
        status: 'PENDING',
        attempts: 1,
        claimedAt: new Date(),
      });
      return true;
    } catch (error) {
      if ((error as { code?: number }).code === 11000) return false;
      throw error;
    }
  }

  async lockEvent(event: EventIdentityInput, consumerGroup: string): Promise<boolean> {
    return this.lock(createEventDedupeKey(event), consumerGroup);
  }

  async lockEnvelope(
    event: InboxEnvelopeMetadata,
    consumerGroup: string,
  ): Promise<boolean> {
    try {
      await this.inboxModel.create({
        ...event,
        consumerGroup,
        status: 'PENDING',
        attempts: 1,
        claimedAt: new Date(),
      });
      return true;
    } catch (error) {
      if ((error as { code?: number }).code !== 11000) throw error;
      const reclaimed = await this.inboxModel.findOneAndUpdate(
        { eventId: event.eventId, consumerGroup, status: 'FAILED' },
        {
          $set: {
            status: 'PENDING',
            claimedAt: new Date(),
            correlationId: event.correlationId,
          },
          $inc: { attempts: 1 },
          $unset: { lastError: '', processedAt: '' },
        },
        { returnDocument: 'after' },
      ).exec();
      return Boolean(reclaimed);
    }
  }

  async complete(eventId: string, consumerGroup: string): Promise<void> {
    await this.inboxModel.updateOne(
      { eventId, consumerGroup },
      { $set: { status: 'PROCESSED', processedAt: new Date() } },
    );
  }

  async completeEvent(event: EventIdentityInput, consumerGroup: string): Promise<void> {
    await this.complete(createEventDedupeKey(event), consumerGroup);
  }

  async fail(eventId: string, consumerGroup: string, error: unknown): Promise<void> {
    await this.inboxModel.updateOne(
      { eventId, consumerGroup },
      {
        $set: {
          status: 'FAILED',
          lastError: error instanceof Error ? error.message : String(error),
        },
      },
    );
  }
}
