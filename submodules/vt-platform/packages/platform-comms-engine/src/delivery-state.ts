import type {
  CommsDeliveryOutboxEntry,
  CommsDeliveryStatus,
} from './comms-engine.types';
import { COMMS_DELIVERY_STATUS } from './comms-engine.types';
import type { CommsDeliveryDispatchResult } from './delivery-dispatcher';

export const COMMS_DELIVERY_TIME = {
  MILLISECONDS_PER_SECOND: 1000,
} as const;

export interface CommsDeliveryRetryPolicy {
  maxAttempts: number;
  baseDelaySeconds: number;
  maxDelaySeconds: number;
  delaySecondsByAttempt?: readonly number[];
}

export interface CommsDeliveryStateInput {
  entry: CommsDeliveryOutboxEntry;
  dispatchResult: CommsDeliveryDispatchResult;
  retryPolicy: CommsDeliveryRetryPolicy;
  now: Date;
}

export interface CommsDeliveryStateUpdate {
  status: CommsDeliveryStatus;
  attempts: number;
  shouldRetry: boolean;
  nextRetryAt?: Date;
  sentAt?: Date;
  providerMessageId?: string;
  providerResponse?: string;
  errorCode?: string;
  errorMessage?: string;
}

export function resolveCommsDeliveryStateUpdate(
  input: CommsDeliveryStateInput,
): CommsDeliveryStateUpdate {
  const attempts = input.entry.attempts + 1;

  if (input.dispatchResult.status === COMMS_DELIVERY_STATUS.SENT) {
    return {
      status: COMMS_DELIVERY_STATUS.SENT,
      attempts,
      shouldRetry: false,
      sentAt: input.dispatchResult.sentAt ?? input.now,
      providerMessageId: input.dispatchResult.providerMessageId,
      providerResponse: input.dispatchResult.providerResponse,
    };
  }

  if (input.dispatchResult.status === COMMS_DELIVERY_STATUS.DLQ || attempts >= input.retryPolicy.maxAttempts) {
    return {
      status: COMMS_DELIVERY_STATUS.DLQ,
      attempts,
      shouldRetry: false,
      providerMessageId: input.dispatchResult.providerMessageId,
      providerResponse: input.dispatchResult.providerResponse,
      errorCode: input.dispatchResult.errorCode,
      errorMessage: input.dispatchResult.errorMessage,
    };
  }

  return {
    status: COMMS_DELIVERY_STATUS.FAILED,
    attempts,
    shouldRetry: true,
    nextRetryAt: resolveNextRetryAt(input.now, attempts, input.retryPolicy),
    providerMessageId: input.dispatchResult.providerMessageId,
    providerResponse: input.dispatchResult.providerResponse,
    errorCode: input.dispatchResult.errorCode,
    errorMessage: input.dispatchResult.errorMessage,
  };
}

export function resolveNextRetryAt(
  now: Date,
  attempts: number,
  policy: CommsDeliveryRetryPolicy,
): Date {
  const configuredDelay = policy.delaySecondsByAttempt?.[Math.max(0, attempts - 1)];
  if (configuredDelay !== undefined) {
    return new Date(
      now.getTime()
        + Math.min(configuredDelay, policy.maxDelaySeconds) * COMMS_DELIVERY_TIME.MILLISECONDS_PER_SECOND,
    );
  }

  const exponentialDelay = policy.baseDelaySeconds * 2 ** Math.max(0, attempts - 1);
  const delaySeconds = Math.min(exponentialDelay, policy.maxDelaySeconds);
  return new Date(now.getTime() + delaySeconds * COMMS_DELIVERY_TIME.MILLISECONDS_PER_SECOND);
}
