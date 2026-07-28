import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type {
  CommsChannelAdapter,
  CommsChannelAdapterConfig,
  CommsChannelSendInput,
} from './index';
import { requireCommsChannelConfigKeys } from './index';

class DemoEmailAdapter implements CommsChannelAdapter {
  readonly channelType = 'EMAIL' as const;

  validateConfig(config: CommsChannelAdapterConfig) {
    return requireCommsChannelConfigKeys(config, ['smtpHost', 'smtpUser']);
  }

  async send(input: CommsChannelSendInput) {
    return {
      outcome: 'ACCEPTED' as const,
      providerMessageId: `email:${input.idempotencyKey}`,
      sentAt: new Date('2026-05-12T00:00:00.000Z'),
    };
  }
}

describe('platform-comms-engine channel adapter contract', () => {
  it('validates required provider configuration keys without provider coupling', () => {
    const adapter = new DemoEmailAdapter();

    assert.deepEqual(adapter.validateConfig({
      tenantId: 'tenant-a',
      channelType: 'EMAIL',
      enabled: true,
      entries: [
        { key: 'smtpHost', value: 'smtp.example.com', secret: false },
      ],
    }), {
      valid: false,
      missingKeys: ['smtpUser'],
    });
  });

  it('keeps send result provider-neutral and idempotency-aware', async () => {
    const adapter = new DemoEmailAdapter();

    const result = await adapter.send({
      tenantId: 'tenant-a',
      deliveryId: 'delivery-001',
      idempotencyKey: 'comms_delivery:abc',
      channelType: 'EMAIL',
      recipient: { recipientId: 'party-a', recipientContact: 'buyer@example.com' },
      template: {
        templateCode: 'order_confirmed',
        templateVersion: 3,
        subject: 'Order confirmed',
        bodyHtml: '<p>Confirmed</p>',
      },
    });

    assert.deepEqual(result, {
      outcome: 'ACCEPTED',
      providerMessageId: 'email:comms_delivery:abc',
      sentAt: new Date('2026-05-12T00:00:00.000Z'),
    });
  });
});
