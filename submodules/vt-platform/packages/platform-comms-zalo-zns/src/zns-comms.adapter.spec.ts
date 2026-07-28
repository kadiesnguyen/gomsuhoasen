import type {
  CommsChannelAdapterConfig,
  CommsChannelSendInput,
} from '@vt/platform-comms-engine';
import { ZnsCommsAdapter, type ZnsCommsProviderPort } from './zns-comms.adapter';

describe('platform-comms-zalo-zns', () => {
  it('validates required ZNS channel config', () => {
    const adapter = new ZnsCommsAdapter(createProviderPort());

    expect(adapter.validateConfig({
      tenantId: 'tenant-a',
      channelType: 'ZNS',
      enabled: true,
      entries: [{ key: 'oaId', value: 'oa-001', secret: false }],
    } satisfies CommsChannelAdapterConfig)).toEqual({
      valid: false,
      missingKeys: ['accessToken'],
    });
  });

  it('maps provider-neutral send input to ZNS provider contract', async () => {
    const providerPort = createProviderPort();
    const adapter = new ZnsCommsAdapter(providerPort);
    const sentAt = new Date('2026-05-15T10:00:00.000Z');
    const input: CommsChannelSendInput = {
      tenantId: 'tenant-a',
      deliveryId: 'delivery-zns-001',
      idempotencyKey: 'comms_delivery:zns-001',
      channelType: 'ZNS',
      recipient: { recipientId: 'party-a', recipientContact: '84901234567' },
      template: {
        templateCode: 'zns_order_confirmed',
        templateVersion: 1,
        bodyText: 'Order confirmed',
      },
      templateVariables: {
        customerName: 'Alice',
        orderCode: 'ORD-001',
      },
    };

    await expect(adapter.send(input)).resolves.toEqual({
      outcome: 'ACCEPTED',
      providerMessageId: 'zns-message-001',
      providerResponse: JSON.stringify({
        status: 'SENT',
        phone: '84901234567',
        templateId: 'zns_order_confirmed',
        sentAt,
        quotaRemaining: 91,
        isSimulation: true,
      }),
      sentAt,
    });
    expect(providerPort.sendZns).toHaveBeenCalledWith(
      'tenant-a',
      '84901234567',
      'zns_order_confirmed',
      {
        customerName: 'Alice',
        orderCode: 'ORD-001',
        deliveryId: 'delivery-zns-001',
        idempotencyKey: 'comms_delivery:zns-001',
        bodyText: 'Order confirmed',
        bodyHtml: undefined,
      },
    );
  });
});

function createProviderPort(): ZnsCommsProviderPort {
  return {
    sendZns: vi.fn().mockResolvedValue({
      messageId: 'zns-message-001',
      status: 'SENT',
      phone: '84901234567',
      templateId: 'zns_order_confirmed',
      sentAt: new Date('2026-05-15T10:00:00.000Z'),
      quotaRemaining: 91,
      isSimulation: true,
    }),
  };
}
