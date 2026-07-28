import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  INBOX_NOTIFICATION_STATUS_VALUES,
  IN_APP_NOTIFICATION_STATUS,
  IN_APP_NOTIFICATION_TYPE,
  InboxNotificationStatus,
  NOTIFICATION_READ_STATES,
  PLATFORM_NOTIFICATION_DELIVERY_STATES,
  PLATFORM_NOTIFICATION_ERROR_MESSAGES,
  createNotificationId,
  normalizeNotificationReadState,
  normalizePlatformNotificationDeliveryState,
  validateInAppPayload,
} from './index';

describe('platform-notification-core', () => {
  it('re-exports notification identity and read-state helpers', () => {
    assert.deepEqual([...NOTIFICATION_READ_STATES], ['unread', 'read']);
    assert.equal(
      createNotificationId({
        namespace: 'order paid',
        aggregateId: 'order-001',
        recipientId: 'member 1',
      }),
      'order-paid_order-001_member-1',
    );
    assert.equal(normalizeNotificationReadState('seen'), 'read');
    assert.equal(normalizeNotificationReadState(undefined), 'unread');
  });

  it('re-exports in-app delivery primitives', () => {
    assert.equal(IN_APP_NOTIFICATION_TYPE.SUCCESS, 'SUCCESS');
    assert.equal(IN_APP_NOTIFICATION_STATUS.UNREAD, 'UNREAD');
    assert.equal(InboxNotificationStatus.ARCHIVED, 'ARCHIVED');
    assert.deepEqual(INBOX_NOTIFICATION_STATUS_VALUES, ['UNREAD', 'READ', 'ARCHIVED']);
    assert.deepEqual(
      validateInAppPayload({
        tenantId: 'tenant-1',
        recipientId: 'user-1',
        title: 'Ready',
        type: IN_APP_NOTIFICATION_TYPE.INFO,
      }),
      { valid: true, errors: [] },
    );
  });

  it('normalizes cross-channel delivery states', () => {
    assert.equal(normalizePlatformNotificationDeliveryState(true), PLATFORM_NOTIFICATION_DELIVERY_STATES.DELIVERED);
    assert.equal(normalizePlatformNotificationDeliveryState('QUEUED'), PLATFORM_NOTIFICATION_DELIVERY_STATES.PENDING);
    assert.equal(normalizePlatformNotificationDeliveryState('seen'), PLATFORM_NOTIFICATION_DELIVERY_STATES.READ);
    assert.equal(normalizePlatformNotificationDeliveryState('skipped'), PLATFORM_NOTIFICATION_DELIVERY_STATES.SUPPRESSED);
    assert.throws(
      () => normalizePlatformNotificationDeliveryState('mystery'),
      { message: PLATFORM_NOTIFICATION_ERROR_MESSAGES.UNSUPPORTED_DELIVERY_STATE('mystery') },
    );
  });
});
