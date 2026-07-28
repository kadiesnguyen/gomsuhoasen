import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  CommsDispatchError,
  dispatchCommsDeliveryEntry,
  mapCommsDeliveryOutcomeToStatus,
  resolveCommsChannelAdapter,
} from './index';
import type {
  CommsChannelAdapter,
  CommsDeliveryOutboxEntry,
} from './index';

const createdAt = new Date('2026-05-12T00:00:00.000Z');

const baseEntry: CommsDeliveryOutboxEntry = {
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
  createdAt,
};

describe('platform-comms-engine delivery dispatcher', () => {
  it('routes an entry to the matching channel adapter', async () => {
    const adapter = createAdapter('EMAIL', 'ACCEPTED');

    const result = await dispatchCommsDeliveryEntry({
      deliveryId: 'delivery-001',
      entry: baseEntry,
      renderedTemplate: {
        templateCode: 'order_confirmed',
        templateVersion: 3,
        subject: 'Order confirmed',
        bodyHtml: '<p>Confirmed</p>',
      },
      adapters: [adapter],
    });

    assert.deepEqual(adapter.sentInputs, [{
      tenantId: 'tenant-a',
      deliveryId: 'delivery-001',
      idempotencyKey: baseEntry.idempotencyKey,
      channelType: 'EMAIL',
      recipient: { recipientId: 'member-a', recipientContact: 'a@example.com' },
      template: {
        templateCode: 'order_confirmed',
        templateVersion: 3,
        subject: 'Order confirmed',
        bodyHtml: '<p>Confirmed</p>',
      },
    }]);
    assert.equal(result.status, 'SENT');
    assert.equal(result.providerMessageId, 'EMAIL:delivery-001');
  });

  it('maps retryable failures to FAILED and permanent failures to DLQ', () => {
    assert.equal(mapCommsDeliveryOutcomeToStatus({ outcome: 'RETRYABLE_FAILURE' }), 'FAILED');
    assert.equal(mapCommsDeliveryOutcomeToStatus({ outcome: 'PERMANENT_FAILURE' }), 'DLQ');
    assert.equal(mapCommsDeliveryOutcomeToStatus({ outcome: 'REJECTED' }), 'DLQ');
  });

  it('throws typed error when no adapter is registered for a channel', () => {
    assert.throws(
      () => resolveCommsChannelAdapter([], 'ZNS'),
      (error) => error instanceof CommsDispatchError && error.code === 'ADAPTER_NOT_FOUND',
    );
  });

  it('throws typed error when rendered template is not the pinned delivery template', async () => {
    await assert.rejects(
      () => dispatchCommsDeliveryEntry({
        deliveryId: 'delivery-001',
        entry: baseEntry,
        renderedTemplate: {
          templateCode: 'wrong_template',
          templateVersion: 3,
        },
        adapters: [createAdapter('EMAIL', 'ACCEPTED')],
      }),
      (error) => error instanceof CommsDispatchError && error.code === 'TEMPLATE_MISMATCH',
    );
  });
});

function createAdapter(
  channelType: 'EMAIL' | 'ZNS' | 'IN_APP',
  outcome: 'ACCEPTED' | 'RETRYABLE_FAILURE' | 'PERMANENT_FAILURE',
): CommsChannelAdapter & { sentInputs: Parameters<CommsChannelAdapter['send']>[0][] } {
  const sentInputs: Parameters<CommsChannelAdapter['send']>[0][] = [];
  return {
    channelType,
    sentInputs,
    validateConfig() {
      return { valid: true, missingKeys: [] };
    },
    async send(input) {
      sentInputs.push(input);
      return {
        outcome,
        providerMessageId: `${channelType}:${input.deliveryId}`,
        sentAt: createdAt,
      };
    },
  };
}
