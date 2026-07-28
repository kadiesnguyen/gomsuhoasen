import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  EVENT_IDENTITY_DEFAULTS,
  EVENT_IDENTITY_ERROR_MESSAGES,
  createConsumerDedupeKey,
  createEventDedupeKey,
  createSegmentedIdentityKey,
  createSideEffectId,
} from './idempotency';

describe('platform-events idempotency helpers', () => {
  const event = {
    eventType: 'vita.order.paid',
    tenantId: 'tenant-a',
    aggregateType: 'order',
    aggregateId: 'order-001',
    correlationId: 'payment-callback-001',
  };

  it('uses explicit event id when available', () => {
    assert.equal(
      createEventDedupeKey({ ...event, id: 'evt-001' }),
      'event:evt-001',
    );
  });

  it('derives stable event keys from business identity when no event id exists', () => {
    assert.equal(createEventDedupeKey(event), createEventDedupeKey({ ...event }));
    assert.notEqual(
      createEventDedupeKey(event),
      createEventDedupeKey({ ...event, aggregateId: 'order-002' }),
    );
  });

  it('separates consumer groups and side-effect targets', () => {
    assert.equal(
      createConsumerDedupeKey('loyalty-score', event),
      'consumer:loyalty-score:event:tenant-a:vita.order.paid:order:order-001:payment-callback-001',
    );

    const first = createSideEffectId({
      consumerGroup: 'notification',
      sideEffect: 'create-notification',
      event,
      targetId: 'member-a',
    });
    const second = createSideEffectId({
      consumerGroup: 'notification',
      sideEffect: 'create-notification',
      event,
      targetId: 'member-a',
    });
    const otherTarget = createSideEffectId({
      consumerGroup: 'notification',
      sideEffect: 'create-notification',
      event,
      targetId: 'member-b',
    });

    assert.equal(first, second);
    assert.notEqual(first, otherTarget);
    assert.match(first, /^side_effect:[a-f0-9]{32}$/);
  });

  it('creates explicit segmented identity keys without changing legacy delimiter output', () => {
    assert.equal(EVENT_IDENTITY_DEFAULTS.SEGMENT_DELIMITER, ':');
    assert.equal(EVENT_IDENTITY_DEFAULTS.HASH_SEGMENT_DELIMITER, ':');
    assert.equal(
      createSegmentedIdentityKey({
        namespace: 'affiliate.withdrawal.requested',
        segments: ['tenant-1', 'wd-1', 'party-1'],
      }),
      'affiliate.withdrawal.requested:tenant-1:wd-1:party-1',
    );
    assert.equal(
      createSegmentedIdentityKey({
        namespace: 'quote',
        segments: ['quote-1', 'email', 'buyer@example.com'],
      }),
      'quote:quote-1:email:buyer@example.com',
    );
  });

  it('rejects missing segmented identity key parts', () => {
    assert.throws(
      () => createSegmentedIdentityKey({ namespace: 'quote', segments: ['quote-1', undefined] }),
      new RegExp(EVENT_IDENTITY_ERROR_MESSAGES.REQUIRED_SEGMENT('identity key segment 2')),
    );
    assert.throws(
      () => createSegmentedIdentityKey({ namespace: '', segments: ['quote-1'] }),
      new RegExp(EVENT_IDENTITY_ERROR_MESSAGES.REQUIRED_SEGMENT('identity key namespace')),
    );
    assert.throws(
      () => createSegmentedIdentityKey({ namespace: 'quote', delimiter: '' }),
      new RegExp(EVENT_IDENTITY_ERROR_MESSAGES.DELIMITER_REQUIRED),
    );
  });
});
