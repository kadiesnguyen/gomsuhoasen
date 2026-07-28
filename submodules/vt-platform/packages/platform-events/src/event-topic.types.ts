export type EventTopic = string & { readonly __eventTopic: unique symbol };

export const PLATFORM_OUTBOX_CREATED_EVENT = 'platform.outbox.created';

export const EVENT_TOPIC_ERROR_MESSAGES = {
  INVALID_TOPIC: (value: string) => `Invalid event topic: ${value}`,
} as const;

export function eventTopic(value: string): EventTopic {
  // Allow lowercase, digits, hyphens, underscores, and dots as separators.
  // Underscores are permitted for legacy topic compatibility (e.g. 'inventory.low_stock').
  if (!/^[a-z][a-z0-9_-]*(\.[a-z][a-z0-9_-]*)+$/.test(value)) {
    throw new Error(EVENT_TOPIC_ERROR_MESSAGES.INVALID_TOPIC(value));
  }
  return value as EventTopic;
}
