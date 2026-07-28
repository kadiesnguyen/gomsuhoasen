import { createHash } from 'node:crypto';

import type { CommsChannelType } from './comms-engine.types';

export interface CommsDeliveryIdempotencyInput {
  tenantId: string;
  sourceEventId: string;
  eventType: string;
  actionId: string;
  recipientId: string;
  channelType: CommsChannelType;
  templateCode: string;
  templateVersion: number;
}

export function createCommsDeliveryIdempotencyKey(input: CommsDeliveryIdempotencyInput): string {
  const rawKey = [
    input.tenantId,
    input.sourceEventId,
    input.eventType,
    input.actionId,
    input.recipientId,
    input.channelType,
    input.templateCode,
    String(input.templateVersion),
  ].join('|');

  return `comms_delivery:${createHash('sha256').update(rawKey).digest('hex')}`;
}
