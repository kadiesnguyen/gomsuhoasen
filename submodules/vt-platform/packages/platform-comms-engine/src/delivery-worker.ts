import type {
  CommsChannelAdapter,
  CommsRenderedTemplate,
} from './channel-adapter.types';
import type { CommsDeliveryOutboxEntry } from './comms-engine.types';
import { COMMS_DELIVERY_STATUS } from './comms-engine.types';
import type { CommsDeliveryDispatchResult } from './delivery-dispatcher';
import { CommsDispatchError, dispatchCommsDeliveryEntry } from './delivery-dispatcher';
import type {
  CommsDeliveryRetryPolicy,
  CommsDeliveryStateUpdate,
} from './delivery-state';
import { resolveCommsDeliveryStateUpdate } from './delivery-state';

export interface CommsDeliveryWorkItem {
  deliveryId: string;
  claimToken?: string;
  entry: CommsDeliveryOutboxEntry;
}

export interface CommsDeliveryClaimOptions {
  limit: number;
  now: Date;
}

export interface CommsDeliveryRepositoryPort {
  claimReady(options: CommsDeliveryClaimOptions): Promise<readonly CommsDeliveryWorkItem[]>;
  applyStateUpdate(
    deliveryId: string,
    update: CommsDeliveryStateUpdate,
    claimToken?: string,
  ): Promise<void>;
}

export interface CommsTemplateRendererPort {
  render(entry: CommsDeliveryOutboxEntry): Promise<CommsRenderedTemplate>;
}

export interface CommsDeliveryWorkProcessorInput {
  workItem: CommsDeliveryWorkItem;
  renderer: CommsTemplateRendererPort;
  adapters: readonly CommsChannelAdapter[];
  retryPolicy: CommsDeliveryRetryPolicy;
  now: Date;
  repository: Pick<CommsDeliveryRepositoryPort, 'applyStateUpdate'>;
}

export interface CommsDeliveryWorkProcessorResult {
  deliveryId: string;
  dispatchResult: CommsDeliveryDispatchResult;
  stateUpdate: CommsDeliveryStateUpdate;
}

export async function processCommsDeliveryWorkItem(
  input: CommsDeliveryWorkProcessorInput,
): Promise<CommsDeliveryWorkProcessorResult> {
  const dispatchResult = await renderAndDispatchSafely(input);
  const stateUpdate = resolveCommsDeliveryStateUpdate({
    entry: input.workItem.entry,
    dispatchResult,
    retryPolicy: input.retryPolicy,
    now: input.now,
  });

  await input.repository.applyStateUpdate(
    input.workItem.deliveryId,
    stateUpdate,
    input.workItem.claimToken,
  );

  return {
    deliveryId: input.workItem.deliveryId,
    dispatchResult,
    stateUpdate,
  };
}

async function renderAndDispatchSafely(
  input: CommsDeliveryWorkProcessorInput,
): Promise<CommsDeliveryDispatchResult> {
  try {
    const renderedTemplate = await input.renderer.render(input.workItem.entry);
    return await dispatchSafely(input, renderedTemplate);
  } catch (error) {
    if (error instanceof CommsDispatchError) {
      return {
        deliveryId: input.workItem.deliveryId,
        idempotencyKey: input.workItem.entry.idempotencyKey,
        channelType: input.workItem.entry.channelType,
        status: COMMS_DELIVERY_STATUS.DLQ,
        errorCode: error.code,
        errorMessage: error.message,
      };
    }

    return {
      deliveryId: input.workItem.deliveryId,
      idempotencyKey: input.workItem.entry.idempotencyKey,
      channelType: input.workItem.entry.channelType,
      status: COMMS_DELIVERY_STATUS.FAILED,
      errorCode: 'RENDER_EXCEPTION',
      errorMessage: error instanceof Error ? error.message : 'Non-Error render failure',
    };
  }
}

async function dispatchSafely(
  input: CommsDeliveryWorkProcessorInput,
  renderedTemplate: CommsRenderedTemplate,
): Promise<CommsDeliveryDispatchResult> {
  try {
    return await dispatchCommsDeliveryEntry({
      deliveryId: input.workItem.deliveryId,
      entry: input.workItem.entry,
      renderedTemplate,
      adapters: input.adapters,
    });
  } catch (error) {
    if (error instanceof CommsDispatchError) {
      return {
        deliveryId: input.workItem.deliveryId,
        idempotencyKey: input.workItem.entry.idempotencyKey,
        channelType: input.workItem.entry.channelType,
        status: COMMS_DELIVERY_STATUS.DLQ,
        errorCode: error.code,
        errorMessage: error.message,
      };
    }

    return {
      deliveryId: input.workItem.deliveryId,
      idempotencyKey: input.workItem.entry.idempotencyKey,
      channelType: input.workItem.entry.channelType,
      status: COMMS_DELIVERY_STATUS.FAILED,
      errorCode: 'DISPATCH_EXCEPTION',
      errorMessage: error instanceof Error ? error.message : 'Non-Error dispatch failure',
    };
  }
}
