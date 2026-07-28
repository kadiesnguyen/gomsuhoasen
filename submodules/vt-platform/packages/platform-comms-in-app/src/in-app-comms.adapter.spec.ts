import type { CommsChannelSendInput } from '@vt/platform-comms-engine';
import { IN_APP_NOTIFICATION_STATUS, type IInAppNotificationStore } from './in-app-notification';
import { InAppCommsAdapter } from './in-app-comms.adapter';

describe('platform in-app comms adapter', () => {
  it('accepts enabled in-app config without provider secrets', () => {
    const adapter = new InAppCommsAdapter(createNotificationStore());

    expect(adapter.validateConfig({
      tenantId: 'tenant-a',
      channelType: 'IN_APP',
      enabled: true,
      entries: [],
    })).toEqual({
      valid: true,
      missingKeys: [],
    });
  });

  it('queues in-app notifications through the shared store contract', async () => {
    const notificationStore = createNotificationStore();
    const adapter = new InAppCommsAdapter(notificationStore);
    const input: CommsChannelSendInput = {
      tenantId: 'tenant-a',
      deliveryId: 'delivery-in-app-001',
      idempotencyKey: 'comms_delivery:in-app-001',
      channelType: 'IN_APP',
      recipient: {
        recipientId: '507f1f77bcf86cd799439011',
        recipientContact: '507f1f77bcf86cd799439011',
      },
      template: {
        templateCode: 'order_confirmed_in_app',
        templateVersion: 1,
        subject: 'Order confirmed',
        bodyText: 'Order confirmed',
      },
      templateVariables: {
        actionUrl: '/orders/order-001',
        metadata: {
          vitaType: 'order',
          ctaLabel: 'Open order',
          ignored: { nested: true },
        },
      },
    };

    await expect(adapter.send(input)).resolves.toEqual({
      outcome: 'DELIVERED',
      providerMessageId: 'in-app-001',
      sentAt: new Date('2026-05-12T00:00:00.000Z'),
    });
    expect(notificationStore.create).toHaveBeenCalledWith({
      tenantId: 'tenant-a',
      recipientId: '507f1f77bcf86cd799439011',
      title: 'Order confirmed',
      body: 'Order confirmed',
      type: 'INFO',
      actionUrl: '/orders/order-001',
      metadata: {
        vitaType: 'order',
        ctaLabel: 'Open order',
      },
      sourceEvent: 'delivery-in-app-001',
      idempotencyKey: 'comms_delivery:in-app-001',
    });
  });
});

function createNotificationStore(): Pick<IInAppNotificationStore, 'create'> {
  return {
    create: vi.fn().mockResolvedValue({
      notificationId: 'in-app-001',
      status: IN_APP_NOTIFICATION_STATUS.UNREAD,
      createdAt: new Date('2026-05-12T00:00:00.000Z'),
    }),
  };
}
