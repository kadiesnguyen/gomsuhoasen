import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Outbox, OutboxDocument, OutboxStatus } from './outbox.schema';

const DEFAULT_POLL_INTERVAL_MS = 5_000;
const DEFAULT_BATCH_SIZE = 50;
const DEFAULT_MAX_RETRIES = 5;
const OUTBOX_RETRY_BASE_BACKOFF_MS = 1_000;
const OUTBOX_RETRY_MAX_BACKOFF_MS = 30_000;

export interface OutboxPollerOptions {
  pollIntervalMs?: number;
  batchSize?: number;
  maxRetries?: number;
}

/**
 * Polls the outbox collection for NEW events and dispatches them via EventEmitter2.
 * Events are emitted using the stored `eventType` as the event name.
 *
 * Lifecycle:
 *   NEW → PROCESSING → PROCESSED (success)
 *   NEW → PROCESSING → FAILED    (consumer threw, retries exhausted)
 *   FAILED (retryCount < max) → NEW (re-queued for next poll)
 *
 * This provides at-least-once local delivery. For durable cross-service delivery,
 * replace EventEmitter2 with a message broker adapter (same outbox schema).
 */
@Injectable()
export class OutboxPollerService implements OnModuleDestroy {
  private readonly logger = new Logger(OutboxPollerService.name);
  private timer: ReturnType<typeof setInterval> | null = null;
  private running = false;

  private readonly pollIntervalMs: number;
  private readonly batchSize: number;
  private readonly maxRetries: number;

  constructor(
    @InjectModel(Outbox.name)
    private readonly outboxModel: Model<OutboxDocument>,
    private readonly eventEmitter: EventEmitter2,
  ) {
    this.pollIntervalMs = DEFAULT_POLL_INTERVAL_MS;
    this.batchSize = DEFAULT_BATCH_SIZE;
    this.maxRetries = DEFAULT_MAX_RETRIES;
  }

  /**
   * Start polling. Call from module onModuleInit or manually.
   */
  start(options?: OutboxPollerOptions): void {
    if (this.timer) return;

    const interval = options?.pollIntervalMs ?? this.pollIntervalMs;
    this.logger.log(`Outbox poller starting (interval=${interval}ms, batch=${options?.batchSize ?? this.batchSize})`);

    // Initial poll immediately
    void this.poll(options);

    this.timer = setInterval(() => {
      void this.poll(options);
    }, interval);
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
      this.logger.log('Outbox poller stopped');
    }
  }

  onModuleDestroy(): void {
    this.stop();
  }

  async poll(options?: OutboxPollerOptions): Promise<number> {
    if (this.running) return 0;
    this.running = true;

    try {
      const batchSize = options?.batchSize ?? this.batchSize;
      const maxRetries = options?.maxRetries ?? this.maxRetries;

      let dispatched = 0;
      let claimed = 0;
      for (let index = 0; index < batchSize; index += 1) {
        const event = await this.claimNextEvent();
        if (!event) break;
        claimed++;

        try {
          const listenerCount = this.eventEmitter.listenerCount(event.eventType);
          if (listenerCount === 0) {
            this.logger.warn(`Outbox event ${event._id} has no listeners for ${event.eventType}`);
          }

          await this.eventEmitter.emitAsync(event.eventType, {
            eventId: event.eventId,
            eventType: event.eventType,
            schemaVersion: event.schemaVersion,
            payload: event.payload,
            correlationId: event.correlationId,
            causationId: event.causationId,
            tenantId: event.tenantId,
            producer: event.producer,
            subjectType: event.subjectType,
            subjectId: event.subjectId,
            occurredAt: event.occurredAt.toISOString(),
            aggregateType: event.aggregateType,
            aggregateId: event.aggregateId,
          });

          await this.outboxModel.updateOne(
            { _id: event._id, status: OutboxStatus.PROCESSING },
            {
              $set: { status: OutboxStatus.PROCESSED, processedAt: new Date() },
              $unset: { lastError: '' },
            },
          );
          dispatched++;
        } catch (error) {
          const retryCount = (event.retryCount ?? 0) + 1;
          if (retryCount >= maxRetries) {
            await this.outboxModel.updateOne(
              { _id: event._id, status: OutboxStatus.PROCESSING },
              {
                $set: {
                  status: OutboxStatus.FAILED,
                  retryCount,
                  lastError: error instanceof Error ? error.message : String(error),
                },
              },
            );
            this.logger.error(
              `Outbox event ${event._id} FAILED after ${retryCount} retries: ${event.eventType}`,
              error instanceof Error ? error.stack : undefined,
            );
          } else {
            // Re-queue with exponential backoff
            const backoffMs = Math.min(
              OUTBOX_RETRY_MAX_BACKOFF_MS,
              OUTBOX_RETRY_BASE_BACKOFF_MS * Math.pow(2, retryCount),
            );
            await this.outboxModel.updateOne(
              { _id: event._id, status: OutboxStatus.PROCESSING },
              {
                $set: {
                  status: OutboxStatus.NEW,
                  retryCount,
                  nextRetryAt: new Date(Date.now() + backoffMs),
                  lastError: error instanceof Error ? error.message : String(error),
                },
              },
            );
            this.logger.warn(
              `Outbox event ${event._id} retry ${retryCount}/${maxRetries}: ${event.eventType}`,
            );
          }
        }
      }

      if (dispatched > 0) {
        this.logger.debug(`Outbox: dispatched ${dispatched}/${claimed} claimed events`);
      }
      return dispatched;
    } finally {
      this.running = false;
    }
  }

  private async claimNextEvent(): Promise<OutboxDocument | null> {
    const now = new Date();
    return this.outboxModel
      .findOneAndUpdate(
        {
          status: OutboxStatus.NEW,
          $or: [
            { nextRetryAt: { $exists: false } },
            { nextRetryAt: { $lte: now } },
          ],
        },
        { $set: { status: OutboxStatus.PROCESSING } },
        {
          sort: { nextRetryAt: 1, createdAt: 1 },
          returnDocument: 'after',
        },
      )
      .exec();
  }
}
