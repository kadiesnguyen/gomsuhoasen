export const NOTIFICATION_READ_STATES = ['unread', 'read'] as const;

export type NotificationReadState = (typeof NOTIFICATION_READ_STATES)[number];

export enum InboxNotificationStatus {
  UNREAD = 'UNREAD',
  READ = 'READ',
  ARCHIVED = 'ARCHIVED',
}

export const INBOX_NOTIFICATION_STATUS_VALUES = Object.values(
  InboxNotificationStatus,
) as InboxNotificationStatus[];

export const PLATFORM_NOTIFICATION_CHANNELS = {
  IN_APP: 'in-app',
  EMAIL: 'email',
  SMS: 'sms',
  PUSH: 'push',
  ZALO_ZNS: 'zalo-zns',
  ZALO_OA: 'zalo-oa',
} as const;

export type PlatformNotificationChannel =
  typeof PLATFORM_NOTIFICATION_CHANNELS[keyof typeof PLATFORM_NOTIFICATION_CHANNELS];

export const PLATFORM_NOTIFICATION_DELIVERY_STATES = {
  PENDING: 'pending',
  DELIVERED: 'delivered',
  READ: 'read',
  FAILED: 'failed',
  SUPPRESSED: 'suppressed',
} as const;

export const PLATFORM_NOTIFICATION_ERROR_MESSAGES = {
  UNSUPPORTED_READ_STATE: (input: unknown) => `Unsupported notification read state: ${String(input)}`,
  UNSUPPORTED_DELIVERY_STATE: (input: unknown) => `Unsupported notification delivery state: ${String(input)}`,
} as const;

export type PlatformNotificationDeliveryState =
  typeof PLATFORM_NOTIFICATION_DELIVERY_STATES[keyof typeof PLATFORM_NOTIFICATION_DELIVERY_STATES];

export interface PlatformNotificationDeliverySnapshot {
  notificationId: string;
  recipientId: string;
  channel: PlatformNotificationChannel;
  state: PlatformNotificationDeliveryState;
  deliveredAt?: Date;
  readAt?: Date;
  providerMessageId?: string;
  failureReason?: string;
}

export function normalizeNotificationReadState(input: unknown): NotificationReadState {
  if (input === true) return 'read';
  if (input === false || input === null || input === undefined || input === '') return 'unread';

  const normalized = String(input).trim().toLowerCase();
  if (normalized === 'read' || normalized === 'seen') return 'read';
  if (normalized === 'unread' || normalized === 'unseen') return 'unread';

  throw new Error(PLATFORM_NOTIFICATION_ERROR_MESSAGES.UNSUPPORTED_READ_STATE(input));
}

export function normalizePlatformNotificationDeliveryState(input: unknown): PlatformNotificationDeliveryState {
  if (input === true) {
    return PLATFORM_NOTIFICATION_DELIVERY_STATES.DELIVERED;
  }
  if (input === false || input === null || input === undefined || input === '') {
    return PLATFORM_NOTIFICATION_DELIVERY_STATES.PENDING;
  }

  const normalized = String(input).trim().toLowerCase().replace(/[_\s]+/g, '-');
  switch (normalized) {
    case 'pending':
    case 'queued':
      return PLATFORM_NOTIFICATION_DELIVERY_STATES.PENDING;
    case 'delivered':
    case 'sent':
      return PLATFORM_NOTIFICATION_DELIVERY_STATES.DELIVERED;
    case 'read':
    case 'seen':
      return PLATFORM_NOTIFICATION_DELIVERY_STATES.READ;
    case 'failed':
    case 'error':
      return PLATFORM_NOTIFICATION_DELIVERY_STATES.FAILED;
    case 'suppressed':
    case 'skipped':
      return PLATFORM_NOTIFICATION_DELIVERY_STATES.SUPPRESSED;
    default:
      throw new Error(PLATFORM_NOTIFICATION_ERROR_MESSAGES.UNSUPPORTED_DELIVERY_STATE(input));
  }
}
