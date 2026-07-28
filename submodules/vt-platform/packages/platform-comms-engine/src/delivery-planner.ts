import type {
  CommsDeliveryAction,
  CommsDeliveryOutboxEntry,
  CommsPlanningInput,
  CommsTemplateVersionRef,
} from './comms-engine.types';
import {
  COMMS_DELIVERY_STATUS,
  COMMS_PLANNING_ERROR_CODE,
  CommsPlanningError,
} from './comms-engine.types';
import { createCommsDeliveryIdempotencyKey } from './idempotency';

function resolveTemplateVersion(
  action: CommsDeliveryAction,
  templates: readonly CommsTemplateVersionRef[],
): number {
  if (typeof action.templateVersion === 'number') {
    return action.templateVersion;
  }

  const activeTemplate = templates.find((template) => (
    template.isActive
    && template.channelType === action.channelType
    && template.templateCode === action.templateCode
  ));

  if (!activeTemplate) {
    throw new CommsPlanningError(
      COMMS_PLANNING_ERROR_CODE.ACTIVE_TEMPLATE_NOT_FOUND,
      `Active template not found: ${action.channelType}/${action.templateCode}`,
    );
  }

  return activeTemplate.version;
}

export function planCommsDeliveryEntries(input: CommsPlanningInput): CommsDeliveryOutboxEntry[] {
  const plannedEntries: CommsDeliveryOutboxEntry[] = [];

  for (const action of input.config.actions) {
    if (!action.enabled) {
      continue;
    }

    const templateVersion = resolveTemplateVersion(action, input.activeTemplates);

    for (const recipient of action.recipients) {
      plannedEntries.push({
        idempotencyKey: createCommsDeliveryIdempotencyKey({
          tenantId: input.config.tenantId,
          sourceEventId: input.sourceEventId,
          eventType: input.config.eventType,
          actionId: action.actionId,
          recipientId: recipient.recipientId,
          channelType: action.channelType,
          templateCode: action.templateCode,
          templateVersion,
        }),
        sourceEventId: input.sourceEventId,
        actionId: action.actionId,
        eventType: input.config.eventType,
        tenantId: input.config.tenantId,
        recipientId: recipient.recipientId,
        recipientContact: recipient.recipientContact,
        channelType: action.channelType,
        templateCode: action.templateCode,
        templateVersion,
        status: COMMS_DELIVERY_STATUS.PENDING,
        attempts: 0,
        priority: action.priority,
        createdAt: input.createdAt,
      });
    }
  }

  return plannedEntries.sort((left, right) => (
    left.priority - right.priority
    || left.actionId.localeCompare(right.actionId)
    || left.recipientId.localeCompare(right.recipientId)
  ));
}
