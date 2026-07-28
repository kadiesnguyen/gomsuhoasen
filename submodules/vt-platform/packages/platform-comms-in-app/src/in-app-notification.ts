/**
 * @vt/platform-comms-in-app — In-app notification primitives.
 *
 * Defines the port interface and types for in-app notification delivery.
 * The actual persistence (MongoDB, etc.) is owned by the consumer project.
 */

export const IN_APP_NOTIFICATION_TYPE = {
  INFO: 'INFO',
  WARNING: 'WARNING',
  ERROR: 'ERROR',
  SUCCESS: 'SUCCESS',
  PROMOTION: 'PROMOTION',
} as const;

export type InAppNotificationType =
  typeof IN_APP_NOTIFICATION_TYPE[keyof typeof IN_APP_NOTIFICATION_TYPE];

export const IN_APP_NOTIFICATION_STATUS = {
  UNREAD: 'UNREAD',
  READ: 'READ',
  DISMISSED: 'DISMISSED',
  ARCHIVED: 'ARCHIVED',
} as const;

export type InAppNotificationStatus =
  typeof IN_APP_NOTIFICATION_STATUS[keyof typeof IN_APP_NOTIFICATION_STATUS];

export interface InAppNotificationPayload {
  tenantId: string;
  recipientId: string;
  title: string;
  body?: string;
  type: InAppNotificationType;
  actionUrl?: string;
  imageUrl?: string;
  metadata?: Record<string, string | number | boolean>;
  idempotencyKey?: string;
  sourceEvent?: string;
}

export interface InAppNotificationRecord {
  id: string;
  tenantId: string;
  recipientId: string;
  title: string;
  body?: string;
  type: InAppNotificationType;
  status: InAppNotificationStatus;
  actionUrl?: string;
  imageUrl?: string;
  metadata?: Record<string, string | number | boolean>;
  createdAt: Date;
  readAt?: Date;
}

export interface InAppNotificationDeliveryResult {
  notificationId: string;
  status: InAppNotificationStatus;
  createdAt: Date;
}

/**
 * Port interface for in-app notification persistence.
 * Consumers implement this with their own schema/DB.
 */
export interface IInAppNotificationStore {
  create(payload: InAppNotificationPayload): Promise<InAppNotificationDeliveryResult>;
  markRead(notificationId: string, recipientId: string): Promise<void>;
  markAllRead(tenantId: string, recipientId: string): Promise<number>;
  getUnreadCount(tenantId: string, recipientId: string): Promise<number>;
}

/**
 * Helper: check if notification payload is valid for delivery.
 */
export function validateInAppPayload(
  payload: InAppNotificationPayload,
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!payload.tenantId) errors.push('tenantId is required');
  if (!payload.recipientId) errors.push('recipientId is required');
  if (!payload.title) errors.push('title is required');
  if (!Object.values(IN_APP_NOTIFICATION_TYPE).includes(payload.type)) {
    errors.push(`Invalid notification type: ${payload.type}`);
  }
  return { valid: errors.length === 0, errors };
}
