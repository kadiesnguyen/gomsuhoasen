import type {
  CommsChannelAdapter,
  CommsChannelAdapterConfig,
  CommsChannelDeliveryResult,
  CommsChannelSendInput,
} from '@vt/platform-comms-engine';
import {
  COMMS_CHANNEL_DELIVERY_OUTCOME,
  COMMS_CHANNEL_TYPE,
  requireCommsChannelConfigKeys,
} from '@vt/platform-comms-engine';
import {
  IN_APP_NOTIFICATION_TYPE,
  type InAppNotificationPayload,
  type IInAppNotificationStore,
} from './in-app-notification';

function readStringVariable(
  variables: Record<string, unknown> | undefined,
  key: string,
): string | undefined {
  const value = variables?.[key];
  return typeof value === 'string' && value.trim() ? value : undefined;
}

function readMetadata(
  variables: Record<string, unknown> | undefined,
): InAppNotificationPayload['metadata'] | undefined {
  const raw = variables?.['metadata'];
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return undefined;
  }

  const metadata: NonNullable<InAppNotificationPayload['metadata']> = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (
      typeof value === 'string'
      || typeof value === 'number'
      || typeof value === 'boolean'
    ) {
      metadata[key] = value;
    }
  }

  return Object.keys(metadata).length > 0 ? metadata : undefined;
}

export class InAppCommsAdapter implements CommsChannelAdapter {
  readonly channelType = COMMS_CHANNEL_TYPE.IN_APP;

  constructor(private readonly notificationStore: Pick<IInAppNotificationStore, 'create'>) {}

  validateConfig(config: CommsChannelAdapterConfig) {
    return requireCommsChannelConfigKeys(config, []);
  }

  async send(input: CommsChannelSendInput): Promise<CommsChannelDeliveryResult> {
    const actionUrl = readStringVariable(input.templateVariables, 'actionUrl');
    const metadata = readMetadata(input.templateVariables);
    const notification = await this.notificationStore.create({
      tenantId: input.tenantId,
      recipientId: input.recipient.recipientId,
      title: input.template.subject ?? input.template.templateCode,
      body: input.template.bodyText,
      type: IN_APP_NOTIFICATION_TYPE.INFO,
      actionUrl,
      metadata,
      idempotencyKey: input.idempotencyKey,
      sourceEvent: input.deliveryId,
    });

    return {
      outcome: COMMS_CHANNEL_DELIVERY_OUTCOME.DELIVERED,
      providerMessageId: notification.notificationId,
      sentAt: notification.createdAt,
    };
  }
}
