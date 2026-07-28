import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  NOTIFICATION_IDENTITY_DEFAULTS,
  NOTIFICATION_IDENTITY_ERROR_MESSAGES,
  createNotificationId,
  createNotificationSideEffectId,
  normalizeNotificationReadState,
} from './notification-identity';

describe('platform-events notification identity helpers', () => {
  const event = {
    eventType: 'vita.order.paid',
    tenantId: 'tenant-a',
    aggregateType: 'order',
    aggregateId: 'order-001',
    correlationId: 'payment-callback-001',
  };

  it('keeps deterministic legacy notification id shape by default', () => {
    assert.equal(NOTIFICATION_IDENTITY_DEFAULTS.DELIMITER, '_');
    assert.equal(NOTIFICATION_IDENTITY_DEFAULTS.CONSUMER_GROUP, 'notification');
    assert.equal(NOTIFICATION_IDENTITY_DEFAULTS.CHANNEL, 'in-app');
    assert.equal(NOTIFICATION_IDENTITY_DEFAULTS.SIDE_EFFECT_SEGMENT_DELIMITER, ':');
    assert.equal(
      createNotificationId({ namespace: 'event_order_paid', aggregateId: 'order-001' }),
      'event_order_paid_order-001',
    );
  });

  it('can include recipient and channel dimensions without changing the default delimiter', () => {
    assert.equal(
      createNotificationId({
        namespace: 'event_order_paid',
        aggregateId: 'order-001',
        recipientId: 'member-a',
        channel: 'in-app',
      }),
      'event_order_paid_order-001_member-a_in-app',
    );
  });

  it('omits blank optional dimensions with explicit predicates', () => {
    assert.equal(
      createNotificationId({
        namespace: 'event_order_paid',
        aggregateId: 'order-001',
        recipientId: null,
        channel: undefined,
      }),
      'event_order_paid_order-001',
    );

    assert.equal(
      createNotificationId({
        namespace: 'event_order_paid',
        aggregateId: 'order-001',
        recipientId: '   ',
        channel: '',
      }),
      'event_order_paid_order-001',
    );
  });

  it('normalizes current read/unread values and OLD_CODE seen booleans', () => {
    assert.equal(normalizeNotificationReadState('read'), 'read');
    assert.equal(normalizeNotificationReadState('UNREAD'), 'unread');
    assert.equal(normalizeNotificationReadState(true), 'read');
    assert.equal(normalizeNotificationReadState(false), 'unread');
    assert.equal(normalizeNotificationReadState(undefined), 'unread');
    assert.throws(
      () => normalizeNotificationReadState('archived'),
      new RegExp(NOTIFICATION_IDENTITY_ERROR_MESSAGES.UNSUPPORTED_READ_STATE('archived')),
    );
  });

  it('creates target-sensitive notification side-effect ids for replay-safe consumers', () => {
    const first = createNotificationSideEffectId({
      event,
      recipientId: 'member-a',
      notificationType: 'order',
    });
    const second = createNotificationSideEffectId({
      event,
      recipientId: 'member-a',
      notificationType: 'order',
    });
    const otherRecipient = createNotificationSideEffectId({
      event,
      recipientId: 'member-b',
      notificationType: 'order',
    });

    assert.equal(first, second);
    assert.notEqual(first, otherRecipient);
    assert.match(first, /^side_effect:[a-f0-9]{32}$/);
  });
});
