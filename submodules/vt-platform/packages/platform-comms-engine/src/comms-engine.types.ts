export const COMMS_CHANNEL_TYPE = {
  EMAIL: 'EMAIL',
  ZNS: 'ZNS',
  IN_APP: 'IN_APP',
  SMS: 'SMS',
  WEBHOOK: 'WEBHOOK',
} as const;

export type CommsChannelType = typeof COMMS_CHANNEL_TYPE[keyof typeof COMMS_CHANNEL_TYPE];

export const COMMS_DELIVERY_STATUS = {
  PENDING: 'PENDING',
  SENT: 'SENT',
  FAILED: 'FAILED',
  DLQ: 'DLQ',
} as const;

export type CommsDeliveryStatus = typeof COMMS_DELIVERY_STATUS[keyof typeof COMMS_DELIVERY_STATUS];

export const COMMS_AUDIT_STATUS = {
  SENT: 'SENT',
  DELIVERED: 'DELIVERED',
  BOUNCED: 'BOUNCED',
  FAILED: 'FAILED',
} as const;

export type CommsAuditStatus = typeof COMMS_AUDIT_STATUS[keyof typeof COMMS_AUDIT_STATUS];

export interface CommsDeliveryRecipient {
  recipientId: string;
  recipientContact: string;
}

export interface CommsTemplateVersionRef {
  channelType: CommsChannelType;
  templateCode: string;
  version: number;
  isActive: boolean;
}

export interface CommsDeliveryAction {
  actionId: string;
  channelType: CommsChannelType;
  templateCode: string;
  templateVersion?: number;
  enabled: boolean;
  priority: number;
  recipients: readonly CommsDeliveryRecipient[];
}

export interface CommsDeliveryConfig {
  tenantId: string;
  eventType: string;
  actions: readonly CommsDeliveryAction[];
}

export interface CommsDeliveryOutboxEntry {
  idempotencyKey: string;
  sourceEventId: string;
  actionId: string;
  eventType: string;
  tenantId: string;
  recipientId: string;
  recipientContact: string;
  channelType: CommsChannelType;
  templateCode: string;
  templateVersion: number;
  status: CommsDeliveryStatus;
  attempts: number;
  priority: number;
  createdAt: Date;
  templateVariables?: Record<string, unknown>;
}

export interface CommsDeliveryAuditLog {
  tenantId: string;
  deliveryId: string;
  eventType: string;
  channelType: CommsChannelType;
  recipientId: string;
  recipientContact: string;
  templateCode: string;
  templateVersion: number;
  status: CommsAuditStatus;
  sentAt: Date;
  deliveredAt?: Date;
  providerResponse?: string;
  consentRef?: string;
}

export interface CommsPlanningInput {
  config: CommsDeliveryConfig;
  sourceEventId: string;
  activeTemplates: readonly CommsTemplateVersionRef[];
  createdAt: Date;
}

export const COMMS_PLANNING_ERROR_CODE = {
  ACTIVE_TEMPLATE_NOT_FOUND: 'ACTIVE_TEMPLATE_NOT_FOUND',
} as const;

export type CommsPlanningErrorCode = typeof COMMS_PLANNING_ERROR_CODE[keyof typeof COMMS_PLANNING_ERROR_CODE];

export class CommsPlanningError extends Error {
  constructor(
    public readonly code: CommsPlanningErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'CommsPlanningError';
  }
}
