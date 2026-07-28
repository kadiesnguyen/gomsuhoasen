import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  processCommsDeliveryWorkItem,
} from './index';
import type {
  CommsChannelAdapter,
  CommsDeliveryOutboxEntry,
  CommsDeliveryStateUpdate,
} from './index';

const now = new Date('2026-05-12T00:00:00.000Z');

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

describe('platform-comms-engine delivery worker boundary', () => {
  it('renders, dispatches, and persists successful delivery updates through ports', async () => {
    const updates: Array<{
      deliveryId: string;
      update: CommsDeliveryStateUpdate;
      claimToken: string | undefined;
    }> = [];

    const result = await processCommsDeliveryWorkItem({
      workItem: { deliveryId: 'delivery-001', claimToken: 'claim-001', entry },
      renderer: {
        async render() {
          return {
            templateCode: 'order_confirmed',
            templateVersion: 3,
            subject: 'Order confirmed',
          };
        },
      },
      adapters: [createAdapter('ACCEPTED')],
      retryPolicy: { maxAttempts: 3, baseDelaySeconds: 30, maxDelaySeconds: 300 },
      now,
      repository: {
        async applyStateUpdate(deliveryId, update, claimToken) {
          updates.push({ deliveryId, update, claimToken });
        },
      },
    });

    assert.equal(result.stateUpdate.status, 'SENT');
    assert.equal(result.dispatchResult.providerMessageId, 'EMAIL:delivery-001');
    assert.deepEqual(updates, [{
      deliveryId: 'delivery-001',
      update: result.stateUpdate,
      claimToken: 'claim-001',
    }]);
  });

  it('persists DLQ updates when dispatch exceptions exhaust attempts', async () => {
    const updates: CommsDeliveryStateUpdate[] = [];

    const result = await processCommsDeliveryWorkItem({
      workItem: { deliveryId: 'delivery-002', entry: { ...entry, attempts: 2 } },
      renderer: {
        async render() {
          return {
            templateCode: 'order_confirmed',
            templateVersion: 3,
          };
        },
      },
      adapters: [createThrowingAdapter()],
      retryPolicy: { maxAttempts: 3, baseDelaySeconds: 30, maxDelaySeconds: 300 },
      now,
      repository: {
        async applyStateUpdate(_deliveryId, update) {
          updates.push(update);
        },
      },
    });

    assert.equal(result.dispatchResult.status, 'FAILED');
    assert.equal(result.stateUpdate.status, 'DLQ');
    assert.equal(result.stateUpdate.errorCode, 'DISPATCH_EXCEPTION');
    assert.deepEqual(updates, [result.stateUpdate]);
  });

  it('moves missing adapter configuration errors to DLQ without retry', async () => {
    const updates: CommsDeliveryStateUpdate[] = [];

    const result = await processCommsDeliveryWorkItem({
      workItem: { deliveryId: 'delivery-003', entry },
      renderer: {
        async render() {
          return {
            templateCode: 'order_confirmed',
            templateVersion: 3,
          };
        },
      },
      adapters: [],
      retryPolicy: { maxAttempts: 3, baseDelaySeconds: 30, maxDelaySeconds: 300 },
      now,
      repository: {
        async applyStateUpdate(_deliveryId, update) {
          updates.push(update);
        },
      },
    });

    assert.equal(result.dispatchResult.status, 'DLQ');
    assert.equal(result.dispatchResult.errorCode, 'ADAPTER_NOT_FOUND');
    assert.equal(result.stateUpdate.status, 'DLQ');
    assert.equal(result.stateUpdate.errorCode, 'ADAPTER_NOT_FOUND');
    assert.equal(result.stateUpdate.attempts, 1);
    assert.equal(result.stateUpdate.shouldRetry, false);
    assert.equal(result.stateUpdate.nextRetryAt, undefined);
    assert.deepEqual(updates, [result.stateUpdate]);
  });

  it('moves template mismatch configuration errors to DLQ without retry', async () => {
    const updates: CommsDeliveryStateUpdate[] = [];

    const result = await processCommsDeliveryWorkItem({
      workItem: { deliveryId: 'delivery-004', entry },
      renderer: {
        async render() {
          return {
            templateCode: 'wrong_template',
            templateVersion: 3,
          };
        },
      },
      adapters: [createAdapter('ACCEPTED')],
      retryPolicy: { maxAttempts: 3, baseDelaySeconds: 30, maxDelaySeconds: 300 },
      now,
      repository: {
        async applyStateUpdate(_deliveryId, update) {
          updates.push(update);
        },
      },
    });

    assert.equal(result.dispatchResult.status, 'DLQ');
    assert.equal(result.dispatchResult.errorCode, 'TEMPLATE_MISMATCH');
    assert.equal(result.stateUpdate.status, 'DLQ');
    assert.equal(result.stateUpdate.errorCode, 'TEMPLATE_MISMATCH');
    assert.equal(result.stateUpdate.shouldRetry, false);
    assert.equal(result.stateUpdate.nextRetryAt, undefined);
    assert.deepEqual(updates, [result.stateUpdate]);
  });

  it('keeps transient provider exceptions retryable before attempts are exhausted', async () => {
    const updates: CommsDeliveryStateUpdate[] = [];

    const result = await processCommsDeliveryWorkItem({
      workItem: { deliveryId: 'delivery-005', entry: { ...entry, attempts: 0 } },
      renderer: {
        async render() {
          return {
            templateCode: 'order_confirmed',
            templateVersion: 3,
          };
        },
      },
      adapters: [createThrowingAdapter()],
      retryPolicy: { maxAttempts: 3, baseDelaySeconds: 30, maxDelaySeconds: 300 },
      now,
      repository: {
        async applyStateUpdate(_deliveryId, update) {
          updates.push(update);
        },
      },
    });

    assert.equal(result.dispatchResult.status, 'FAILED');
    assert.equal(result.dispatchResult.errorCode, 'DISPATCH_EXCEPTION');
    assert.equal(result.stateUpdate.status, 'FAILED');
    assert.equal(result.stateUpdate.errorCode, 'DISPATCH_EXCEPTION');
    assert.equal(result.stateUpdate.shouldRetry, true);
    assert.equal(result.stateUpdate.nextRetryAt?.toISOString(), '2026-05-12T00:00:30.000Z');
    assert.deepEqual(updates, [result.stateUpdate]);
  });

  it('persists retryable updates when template rendering fails before dispatch', async () => {
    const updates: CommsDeliveryStateUpdate[] = [];

    const result = await processCommsDeliveryWorkItem({
      workItem: { deliveryId: 'delivery-006', entry: { ...entry, attempts: 0 } },
      renderer: {
        async render() {
          throw new Error('Template unavailable');
        },
      },
      adapters: [createAdapter('ACCEPTED')],
      retryPolicy: { maxAttempts: 3, baseDelaySeconds: 30, maxDelaySeconds: 300 },
      now,
      repository: {
        async applyStateUpdate(_deliveryId, update) {
          updates.push(update);
        },
      },
    });

    assert.equal(result.dispatchResult.status, 'FAILED');
    assert.equal(result.dispatchResult.errorCode, 'RENDER_EXCEPTION');
    assert.equal(result.stateUpdate.status, 'FAILED');
    assert.equal(result.stateUpdate.shouldRetry, true);
    assert.deepEqual(updates, [result.stateUpdate]);
  });
});

function createAdapter(outcome: 'ACCEPTED'): CommsChannelAdapter {
  return {
    channelType: 'EMAIL',
    validateConfig() {
      return { valid: true, missingKeys: [] };
    },
    async send(input) {
      return {
        outcome,
        providerMessageId: `EMAIL:${input.deliveryId}`,
        sentAt: now,
      };
    },
  };
}

function createThrowingAdapter(): CommsChannelAdapter {
  return {
    channelType: 'EMAIL',
    validateConfig() {
      return { valid: true, missingKeys: [] };
    },
    async send() {
      throw new Error('Provider unavailable');
    },
  };
}
