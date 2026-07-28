import { createHash } from 'crypto';

export const EVENT_IDENTITY_DEFAULTS = {
  SEGMENT_DELIMITER: ':',
  HASH_SEGMENT_DELIMITER: ':',
} as const;

export const EVENT_IDENTITY_ERROR_MESSAGES = {
  REQUIRED_SEGMENT: (name: string) => `${name} is required`,
  DELIMITER_REQUIRED: 'identity key delimiter is required',
} as const;

export interface EventIdentityInput {
  id?: string;
  _id?: unknown;
  eventType: string;
  tenantId: string;
  correlationId?: string;
  aggregateType?: string;
  aggregateId?: string;
}

export interface ConsumerSideEffectIdentityInput {
  consumerGroup: string;
  sideEffect: string;
  event: EventIdentityInput;
  targetId?: string;
}

export interface SegmentedIdentityKeyInput {
  namespace: unknown;
  segments?: readonly unknown[];
  delimiter?: string;
}

function normalizeSegment(value: unknown): string {
  if (value === null || value === undefined || value === '') return '-';
  if (typeof value === 'object' && 'toString' in value) return String(value);
  return String(value);
}

function requireIdentitySegment(name: string, value: unknown): string {
  if (value === null || value === undefined || value === '') {
    throw new Error(EVENT_IDENTITY_ERROR_MESSAGES.REQUIRED_SEGMENT(name));
  }
  return String(value);
}

function hash(value: string): string {
  return createHash('sha256').update(value).digest('hex').slice(0, 32);
}

export function createEventDedupeKey(event: EventIdentityInput): string {
  const explicitId = event.id ?? normalizeSegment(event._id);
  if (explicitId !== '-') return `event:${explicitId}`;

  return [
    'event',
    event.tenantId,
    event.eventType,
    normalizeSegment(event.aggregateType),
    normalizeSegment(event.aggregateId),
    normalizeSegment(event.correlationId),
  ].join(EVENT_IDENTITY_DEFAULTS.SEGMENT_DELIMITER);
}

export function createConsumerDedupeKey(consumerGroup: string, event: EventIdentityInput): string {
  return [
    'consumer',
    consumerGroup,
    createEventDedupeKey(event),
  ].join(EVENT_IDENTITY_DEFAULTS.SEGMENT_DELIMITER);
}

export function createSideEffectId(input: ConsumerSideEffectIdentityInput): string {
  const raw = [
    input.consumerGroup,
    input.sideEffect,
    createEventDedupeKey(input.event),
    normalizeSegment(input.targetId),
  ].join(EVENT_IDENTITY_DEFAULTS.HASH_SEGMENT_DELIMITER);

  return `side_effect:${hash(raw)}`;
}

export function createSegmentedIdentityKey(input: SegmentedIdentityKeyInput): string {
  const delimiter = input.delimiter ?? EVENT_IDENTITY_DEFAULTS.SEGMENT_DELIMITER;
  if (!delimiter) {
    throw new Error(EVENT_IDENTITY_ERROR_MESSAGES.DELIMITER_REQUIRED);
  }

  const segments = [
    requireIdentitySegment('identity key namespace', input.namespace),
    ...(input.segments ?? []).map((segment, index) => requireIdentitySegment(
      `identity key segment ${index + 1}`,
      segment,
    )),
  ];

  return segments.join(delimiter);
}
