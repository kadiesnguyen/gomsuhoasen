import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  CommsPlanningError,
  createCommsDeliveryIdempotencyKey,
  planCommsDeliveryEntries,
} from './index';

const activeTemplates = [
  {
    channelType: 'EMAIL',
    templateCode: 'order_confirmed',
    version: 3,
    isActive: true,
  },
  {
    channelType: 'ZNS',
    templateCode: 'zns_order_confirmed',
    version: 7,
    isActive: true,
  },
] as const;

describe('platform-comms-engine delivery planning', () => {
  it('creates idempotency keys without time buckets', () => {
    const baseInput = {
      tenantId: 'tenant-a',
      sourceEventId: 'evt-001',
      eventType: 'ORDER_CONFIRMED',
      actionId: 'send-email',
      recipientId: 'member-a',
      channelType: 'EMAIL',
      templateCode: 'order_confirmed',
      templateVersion: 3,
    } as const;

    assert.equal(
      createCommsDeliveryIdempotencyKey(baseInput),
      createCommsDeliveryIdempotencyKey({ ...baseInput }),
    );
  });

  it('skips disabled actions and creates entries for enabled recipients only', () => {
    const entries = planCommsDeliveryEntries({
      sourceEventId: 'evt-001',
      createdAt: new Date('2026-05-12T00:00:00.000Z'),
      activeTemplates,
      config: {
        tenantId: 'tenant-a',
        eventType: 'ORDER_CONFIRMED',
        actions: [
          {
            actionId: 'send-zns',
            channelType: 'ZNS',
            templateCode: 'zns_order_confirmed',
            enabled: false,
            priority: 1,
            recipients: [{ recipientId: 'member-a', recipientContact: '84901234567' }],
          },
          {
            actionId: 'send-email',
            channelType: 'EMAIL',
            templateCode: 'order_confirmed',
            enabled: true,
            priority: 2,
            recipients: [
              { recipientId: 'member-b', recipientContact: 'b@example.com' },
              { recipientId: 'member-a', recipientContact: 'a@example.com' },
            ],
          },
        ],
      },
    });

    assert.deepEqual(entries.map((entry) => entry.actionId), ['send-email', 'send-email']);
    assert.deepEqual(entries.map((entry) => entry.recipientId), ['member-a', 'member-b']);
    assert.equal(entries.every((entry) => entry.status === 'PENDING'), true);
  });

  it('pins active template versions into planned entries', () => {
    const [entry] = planCommsDeliveryEntries({
      sourceEventId: 'evt-001',
      createdAt: new Date('2026-05-12T00:00:00.000Z'),
      activeTemplates,
      config: {
        tenantId: 'tenant-a',
        eventType: 'ORDER_CONFIRMED',
        actions: [
          {
            actionId: 'send-email',
            channelType: 'EMAIL',
            templateCode: 'order_confirmed',
            enabled: true,
            priority: 1,
            recipients: [{ recipientId: 'member-a', recipientContact: 'a@example.com' }],
          },
        ],
      },
    });

    assert.equal(entry?.templateVersion, 3);
    assert.equal(entry?.templateCode, 'order_confirmed');
  });

  it('uses explicit template versions over active template lookup', () => {
    const [entry] = planCommsDeliveryEntries({
      sourceEventId: 'evt-001',
      createdAt: new Date('2026-05-12T00:00:00.000Z'),
      activeTemplates,
      config: {
        tenantId: 'tenant-a',
        eventType: 'ORDER_CONFIRMED',
        actions: [
          {
            actionId: 'send-email',
            channelType: 'EMAIL',
            templateCode: 'order_confirmed',
            templateVersion: 2,
            enabled: true,
            priority: 1,
            recipients: [{ recipientId: 'member-a', recipientContact: 'a@example.com' }],
          },
        ],
      },
    });

    assert.equal(entry?.templateVersion, 2);
  });

  it('throws a typed planning error when active template lookup fails', () => {
    assert.throws(
      () => planCommsDeliveryEntries({
        sourceEventId: 'evt-001',
        createdAt: new Date('2026-05-12T00:00:00.000Z'),
        activeTemplates,
        config: {
          tenantId: 'tenant-a',
          eventType: 'ORDER_CONFIRMED',
          actions: [
            {
              actionId: 'send-webhook',
              channelType: 'WEBHOOK',
              templateCode: 'order_webhook',
              enabled: true,
              priority: 1,
              recipients: [{ recipientId: 'endpoint-a', recipientContact: 'https://example.com/hook' }],
            },
          ],
        },
      }),
      (error) => error instanceof CommsPlanningError && error.code === 'ACTIVE_TEMPLATE_NOT_FOUND',
    );
  });
});
