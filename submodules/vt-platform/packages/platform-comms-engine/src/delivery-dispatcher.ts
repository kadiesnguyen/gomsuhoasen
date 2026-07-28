import type {
  CommsChannelAdapter,
  CommsChannelDeliveryResult,
  CommsRenderedTemplate,
} from './channel-adapter.types';
import { COMMS_CHANNEL_DELIVERY_OUTCOME } from './channel-adapter.types';
import type {
  CommsChannelType,
  CommsDeliveryOutboxEntry,
  CommsDeliveryStatus,
} from './comms-engine.types';
import { COMMS_DELIVERY_STATUS } from './comms-engine.types';

export type CommsDispatchErrorCode =
  | 'ADAPTER_NOT_FOUND'
  | 'TEMPLATE_MISMATCH';

export class CommsDispatchError extends Error {
  constructor(
    public readonly code: CommsDispatchErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'CommsDispatchError';
  }
}

export interface CommsDeliveryDispatchInput {
  deliveryId: string;
  entry: CommsDeliveryOutboxEntry;
  renderedTemplate: CommsRenderedTemplate;
  adapters: readonly CommsChannelAdapter[];
}

export interface CommsDeliveryDispatchResult {
  deliveryId: string;
  idempotencyKey: string;
  channelType: CommsChannelType;
  status: CommsDeliveryStatus;
  providerMessageId?: string;
  providerResponse?: string;
  retryAfterSeconds?: number;
  errorCode?: string;
  errorMessage?: string;
  sentAt?: Date;
}

export function resolveCommsChannelAdapter(
  adapters: readonly CommsChannelAdapter[],
  channelType: CommsChannelType,
): CommsChannelAdapter {
  const adapter = adapters.find((candidate) => candidate.channelType === channelType);
  if (!adapter) {
    throw new CommsDispatchError(
      'ADAPTER_NOT_FOUND',
      `Comms adapter not found for channel: ${channelType}`,
    );
  }
  return adapter;
}

export function mapCommsDeliveryOutcomeToStatus(
  result: CommsChannelDeliveryResult,
): CommsDeliveryStatus {
  if (
    result.outcome === COMMS_CHANNEL_DELIVERY_OUTCOME.ACCEPTED
    || result.outcome === COMMS_CHANNEL_DELIVERY_OUTCOME.DELIVERED
  ) {
    return COMMS_DELIVERY_STATUS.SENT;
  }
  if (result.outcome === COMMS_CHANNEL_DELIVERY_OUTCOME.RETRYABLE_FAILURE) {
    return COMMS_DELIVERY_STATUS.FAILED;
  }
  return COMMS_DELIVERY_STATUS.DLQ;
}

export async function dispatchCommsDeliveryEntry(
  input: CommsDeliveryDispatchInput,
): Promise<CommsDeliveryDispatchResult> {
  assertTemplateMatchesEntry(input.entry, input.renderedTemplate);

  const adapter = resolveCommsChannelAdapter(input.adapters, input.entry.channelType);
  const result = await adapter.send({
    tenantId: input.entry.tenantId,
    deliveryId: input.deliveryId,
    idempotencyKey: input.entry.idempotencyKey,
    channelType: input.entry.channelType,
    recipient: {
      recipientId: input.entry.recipientId,
      recipientContact: input.entry.recipientContact,
    },
    template: input.renderedTemplate,
    ...(input.entry.templateVariables !== undefined
      ? { templateVariables: input.entry.templateVariables }
      : {}),
  });

  return {
    deliveryId: input.deliveryId,
    idempotencyKey: input.entry.idempotencyKey,
    channelType: input.entry.channelType,
    status: mapCommsDeliveryOutcomeToStatus(result),
    providerMessageId: result.providerMessageId,
    providerResponse: result.providerResponse,
    retryAfterSeconds: result.retryAfterSeconds,
    errorCode: result.errorCode,
    errorMessage: result.errorMessage,
    sentAt: result.sentAt,
  };
}

function assertTemplateMatchesEntry(
  entry: CommsDeliveryOutboxEntry,
  renderedTemplate: CommsRenderedTemplate,
): void {
  if (
    renderedTemplate.templateCode !== entry.templateCode
    || renderedTemplate.templateVersion !== entry.templateVersion
  ) {
    throw new CommsDispatchError(
      'TEMPLATE_MISMATCH',
      `Rendered template does not match delivery entry: ${entry.templateCode}@${entry.templateVersion}`,
    );
  }
}
