import type { EventIdentityInput } from './idempotency';
import { createSideEffectId } from './idempotency';

export const NOTIFICATION_READ_STATES = ['unread', 'read'] as const;

export type NotificationReadState = (typeof NOTIFICATION_READ_STATES)[number];

export const NOTIFICATION_IDENTITY_DEFAULTS = {
  DELIMITER: '_',
  CONSUMER_GROUP: 'notification',
  CHANNEL: 'in-app',
  SIDE_EFFECT_NAMESPACE: 'notification',
  SIDE_EFFECT_SEGMENT_DELIMITER: ':',
} as const;

export const NOTIFICATION_IDENTITY_ERROR_MESSAGES = {
  UNSUPPORTED_READ_STATE: (input: unknown) => `Unsupported notification read state: ${String(input)}`,
} as const;

export interface NotificationIdInput {
  namespace: string;
  aggregateId: string;
  recipientId?: string | null;
  channel?: string | null;
  delimiter?: string;
}

export interface NotificationSideEffectIdInput {
  event: EventIdentityInput;
  recipientId: string;
  notificationType: string;
  channel?: string;
  consumerGroup?: string;
}

function readNormalizedToken(value: string | null | undefined): string | undefined {
  if (value === null || value === undefined) {
    return undefined;
  }

  const normalized = value.trim().replace(/\s+/g, '-');
  return normalized.length > 0 ? normalized : undefined;
}

export function normalizeNotificationReadState(input: unknown): NotificationReadState {
  if (input === true) return 'read';
  if (input === false || input === null || input === undefined || input === '') return 'unread';

  const normalized = String(input).trim().toLowerCase();
  if (normalized === 'read' || normalized === 'seen') return 'read';
  if (normalized === 'unread' || normalized === 'unseen') return 'unread';

  throw new Error(NOTIFICATION_IDENTITY_ERROR_MESSAGES.UNSUPPORTED_READ_STATE(input));
}

export function createNotificationId(input: NotificationIdInput): string {
  const delimiter = input.delimiter ?? NOTIFICATION_IDENTITY_DEFAULTS.DELIMITER;
  const segments = [
    input.namespace,
    input.aggregateId,
    input.recipientId,
    input.channel,
  ]
    .map(readNormalizedToken)
    .filter((segment): segment is string => segment !== undefined);

  return segments.join(delimiter);
}

export function createNotificationSideEffectId(input: NotificationSideEffectIdInput): string {
  return createSideEffectId({
    consumerGroup: input.consumerGroup ?? NOTIFICATION_IDENTITY_DEFAULTS.CONSUMER_GROUP,
    sideEffect: [
      NOTIFICATION_IDENTITY_DEFAULTS.SIDE_EFFECT_NAMESPACE,
      input.channel ?? NOTIFICATION_IDENTITY_DEFAULTS.CHANNEL,
      input.notificationType,
    ].join(NOTIFICATION_IDENTITY_DEFAULTS.SIDE_EFFECT_SEGMENT_DELIMITER),
    event: input.event,
    targetId: input.recipientId,
  });
}
