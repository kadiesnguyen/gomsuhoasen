import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { canTransitionLegacyStatus, LEGACY_ORDER_STATUSES } from './order-status.contracts';

describe('Order Status State Machine', () => {
  describe('canTransitionLegacyStatus', () => {
    it('should allow valid transitions', () => {
      assert.equal(canTransitionLegacyStatus(LEGACY_ORDER_STATUSES.DRAFT, LEGACY_ORDER_STATUSES.PENDING), true);
      assert.equal(canTransitionLegacyStatus(LEGACY_ORDER_STATUSES.PENDING, LEGACY_ORDER_STATUSES.ACCETED), true);
      assert.equal(canTransitionLegacyStatus(LEGACY_ORDER_STATUSES.SHIPPING, LEGACY_ORDER_STATUSES.DELIVERED), true);
      assert.equal(canTransitionLegacyStatus(LEGACY_ORDER_STATUSES.READY_TO_DELIVERY, LEGACY_ORDER_STATUSES.CANCELLED), true);
    });

    it('should block invalid transitions', () => {
      assert.equal(canTransitionLegacyStatus(LEGACY_ORDER_STATUSES.DRAFT, LEGACY_ORDER_STATUSES.COMPLETED), false);
      assert.equal(canTransitionLegacyStatus(LEGACY_ORDER_STATUSES.SHIPPING, LEGACY_ORDER_STATUSES.PENDING), false);
      assert.equal(canTransitionLegacyStatus(LEGACY_ORDER_STATUSES.COMPLETED, LEGACY_ORDER_STATUSES.CANCELLED), false);
    });
  });
});
