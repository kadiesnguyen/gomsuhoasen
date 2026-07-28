import type { CommsChannelType, CommsDeliveryRecipient } from './comms-engine.types';

export interface CommsChannelConfigEntry {
  key: string;
  value: string;
  secret: boolean;
}

export interface CommsChannelAdapterConfig {
  tenantId: string;
  channelType: CommsChannelType;
  enabled: boolean;
  entries: readonly CommsChannelConfigEntry[];
}

export interface CommsRenderedTemplate {
  templateCode: string;
  templateVersion: number;
  subject?: string;
  bodyText?: string;
  bodyHtml?: string;
}

export interface CommsChannelSendInput {
  tenantId: string;
  deliveryId: string;
  idempotencyKey: string;
  channelType: CommsChannelType;
  recipient: CommsDeliveryRecipient;
  template: CommsRenderedTemplate;
  templateVariables?: Record<string, unknown>;
}

export const COMMS_CHANNEL_DELIVERY_OUTCOME = {
  ACCEPTED: 'ACCEPTED',
  DELIVERED: 'DELIVERED',
  REJECTED: 'REJECTED',
  RETRYABLE_FAILURE: 'RETRYABLE_FAILURE',
  PERMANENT_FAILURE: 'PERMANENT_FAILURE',
} as const;

export type CommsChannelDeliveryOutcome =
  typeof COMMS_CHANNEL_DELIVERY_OUTCOME[keyof typeof COMMS_CHANNEL_DELIVERY_OUTCOME];

export interface CommsChannelDeliveryResult {
  outcome: CommsChannelDeliveryOutcome;
  providerMessageId?: string;
  providerResponse?: string;
  retryAfterSeconds?: number;
  errorCode?: string;
  errorMessage?: string;
  sentAt?: Date;
}

export interface CommsChannelAdapterValidationResult {
  valid: boolean;
  missingKeys: readonly string[];
}

export interface CommsChannelAdapter {
  readonly channelType: CommsChannelType;
  validateConfig(config: CommsChannelAdapterConfig): CommsChannelAdapterValidationResult;
  send(input: CommsChannelSendInput): Promise<CommsChannelDeliveryResult>;
}

export function requireCommsChannelConfigKeys(
  config: CommsChannelAdapterConfig,
  requiredKeys: readonly string[],
): CommsChannelAdapterValidationResult {
  const providedKeys = new Set(config.entries.map((entry) => entry.key));
  const missingKeys = requiredKeys.filter((key) => !providedKeys.has(key));

  return {
    valid: config.enabled && missingKeys.length === 0,
    missingKeys,
  };
}
