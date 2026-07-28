import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  resolveCommsDeliveryStateUpdate,
  resolveNextRetryAt,
} from './index';
import type {
  CommsDeliveryDispatchResult,
  CommsDeliveryOutboxEntry,
  CommsDeliveryRetryPolicy,
} from './index';

const now = new Date('2026-05-12T00:00:00.000Z');
const retryPolicy: CommsDeliveryRetryPolicy = {
  maxAttempts: 3,
  baseDelaySeconds: 30,
  maxDelaySeconds: 300,
};

const entry: CommsDeliveryOutboxEntry = {
  idempotencyKey: 'comms_delivery:tenant-a:evt-001:send-email:member-a:EMAIL:order_confirmed:3',
  sourceEventId: 'evt-001',
  actionId: 'send-email',
  eventType: 'ORDER_CONFIRMED',
  tenantId: 'tenant-a',
  recipientId: 'member-a',
  recipientContact: 'a@example.com',
  channelType: 'EMAIL',
  templateCode: 'order_confirmed',
  templateVersion: 3,
  status: 'PENDING',
  attempts: 0,
  priority: 1,
  createdAt: now,
};

describe('platform-comms-engine delivery state update', () => {
  it('marks successful dispatches as sent and records provider metadata', () => {
    const dispatchResult: CommsDeliveryDispatchResult = {
      deliveryId: 'delivery-001',
      idempotencyKey: entry.idempotencyKey,
      channelType: 'EMAIL',
      status: 'SENT',
      providerMessageId: 'email-001',
      sentAt: new Date('2026-05-12T00:00:01.000Z'),
    };

    assert.deepEqual(resolveCommsDeliveryStateUpdate({
      entry,
      dispatchResult,
      retryPolicy,
      now,
    }), {
      status: 'SENT',
      attempts: 1,
      shouldRetry: false,
      sentAt: new Date('2026-05-12T00:00:01.000Z'),
      providerMessageId: 'email-001',
      providerResponse: undefined,
    });
  });

  it('keeps retryable failures in FAILED with deterministic nextRetryAt before max attempts', () => {
    const update = resolveCommsDeliveryStateUpdate({
      entry: { ...entry, attempts: 1 },
      dispatchResult: failedDispatch('SMTP_TIMEOUT'),
      retryPolicy,
      now,
    });

    assert.equal(update.status, 'FAILED');
    assert.equal(update.attempts, 2);
    assert.equal(update.shouldRetry, true);
    assert.deepEqual(update.nextRetryAt, new Date('2026-05-12T00:01:00.000Z'));
    assert.equal(update.errorCode, 'SMTP_TIMEOUT');
  });

  it('moves retryable failures to DLQ when the next attempt reaches max attempts', () => {
    const update = resolveCommsDeliveryStateUpdate({
      entry: { ...entry, attempts: 2 },
      dispatchResult: failedDispatch('SMTP_TIMEOUT'),
      retryPolicy,
      now,
    });

    assert.equal(update.status, 'DLQ');
    assert.equal(update.attempts, 3);
    assert.equal(update.shouldRetry, false);
    assert.equal(update.nextRetryAt, undefined);
  });

  it('caps exponential retry delay by policy max', () => {
    assert.deepEqual(
      resolveNextRetryAt(now, 8, retryPolicy),
      new Date('2026-05-12T00:05:00.000Z'),
    );
  });

  it('uses explicit per-attempt retry delays when configured', () => {
    assert.deepEqual(
      resolveNextRetryAt(now, 2, {
        ...retryPolicy,
        delaySecondsByAttempt: [1, 5, 30],
      }),
      new Date('2026-05-12T00:00:05.000Z'),
    );
  });
});

function failedDispatch(errorCode: string): CommsDeliveryDispatchResult {
  return {
    deliveryId: 'delivery-001',
    idempotencyKey: entry.idempotencyKey,
    channelType: 'EMAIL',
    status: 'FAILED',
    errorCode,
    errorMessage: 'Temporary provider failure',
  };
}
