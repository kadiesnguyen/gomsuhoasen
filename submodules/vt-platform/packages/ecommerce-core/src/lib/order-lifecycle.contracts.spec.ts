import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  buildOrderCreateLifecyclePlan,
  buildOrderPaymentConfirmedPlan,
  buildOrderPaymentExpiredPlan,
  buildOrderPaymentCancelledPlan,
  buildStoreOrderProgressPlan,
  buildOrderPaymentWebhookSucceededPlan,
  buildOrderPaymentWebhookFailedPlan,
  buildOrderRefundApprovedPlan,
  buildOrderRefundRejectedPlan,
  buildStoreOrderCancelledPlan,
  buildOrderRefundRequestPlan,
  buildRefundReviewPlan,
  buildCodSettlementPlan,
} from './order-lifecycle-core';

describe('Order Lifecycle Core', () => {
  it('1. create plan for QR / pending payment order', () => {
    const plan = buildOrderCreateLifecyclePlan(false);
    assert.equal(plan.nextOrderStatus, 'pending_payment');
    assert.equal(plan.timelineKind, 'PAYMENT_PENDING');
    assert.deepEqual(plan.intents, ['RESERVE_REDEEM_LEDGER']);
  });

  it('2. create plan for points-only / immediate paid order', () => {
    const plan = buildOrderCreateLifecyclePlan(true);
    assert.equal(plan.nextOrderStatus, 'paid');
    assert.equal(plan.timelineKind, 'PAYMENT_PAID');
    assert.ok(plan.intents.includes('REDEEM_VOUCHER'));
    assert.ok(plan.intents.includes('POST_REWARD_LEDGER'));
    assert.ok(plan.intents.includes('ISSUE_TICKETS'));
  });

  it('3. confirm-paid plan promotes pending order to paid and posts paid intents', () => {
    const plan = buildOrderPaymentConfirmedPlan('pending_payment', 'pending');
    assert.equal(plan.nextOrderStatus, 'paid');
    assert.equal(plan.timelineKind, 'PAYMENT_PAID');
    assert.equal(plan.paymentSessionTarget, 'PAID');
    assert.ok(plan.intents.includes('REDEEM_VOUCHER'));
    assert.ok(plan.intents.includes('RELEASE_REDEEM_LEDGER'));
  });

  it('4. confirm-paid plan returns replay-safe no-op when already paid', () => {
    const plan = buildOrderPaymentConfirmedPlan('paid', 'paid');
    assert.equal(plan.nextOrderStatus, 'paid');
    assert.equal(plan.noOpReason, 'ALREADY_APPLIED');
    assert.deepEqual(plan.intents, []);
  });

  it('5. expire plan only works from pending payment states', () => {
    const plan = buildOrderPaymentExpiredPlan('pending_payment');
    assert.equal(plan.nextOrderStatus, 'cancelled');
    assert.equal(plan.paymentSessionTarget, 'EXPIRED');
    assert.ok(plan.intents.includes('RELEASE_REDEEM_LEDGER'));

    const invalidPlan = buildOrderPaymentExpiredPlan('paid');
    assert.equal(invalidPlan.nextOrderStatus, 'paid');
    assert.equal(invalidPlan.noOpReason, 'ALREADY_TERMINAL');
    assert.deepEqual(invalidPlan.intents, []);
  });

  it('6. cancel plan emits release intents only when reserve side effects already exist', () => {
    const planWithSideEffects = buildOrderPaymentCancelledPlan('pending_payment', 'pending');
    assert.ok(planWithSideEffects.intents.includes('RELEASE_REDEEM_LEDGER'));
    assert.ok(planWithSideEffects.intents.includes('RELEASE_USER_VOUCHER'));

    const planWithoutSideEffects = buildOrderPaymentCancelledPlan('pending_payment', 'paid');
    assert.deepEqual(planWithoutSideEffects.intents, []);
  });

  it('7. cancel plan blocks illegal transitions from paid/completed terminal states in this phase', () => {
    const plan = buildOrderPaymentCancelledPlan('completed', 'paid');
    assert.equal(plan.nextOrderStatus, 'completed');
    assert.equal(plan.noOpReason, 'ALREADY_TERMINAL');
    assert.deepEqual(plan.intents, []);
  });

  it('8. store progress plan blocks unpaid -> processing/completed jumps', () => {
    const plan = buildStoreOrderProgressPlan('pending_payment', 'processing', 'physical', 'pending');
    assert.equal(plan.nextOrderStatus, 'pending_payment');
    assert.equal(plan.noOpReason, 'ALREADY_TERMINAL');
  });

  it('9. store progress plan maps service order to service fulfillment status', () => {
    const planProcess = buildStoreOrderProgressPlan('paid', 'processing', 'membership_package', 'paid');
    assert.equal(planProcess.nextFulfillmentStatus, 'service_scheduled');

    const planComplete = buildStoreOrderProgressPlan('processing', 'completed', 'membership_package', 'paid');
    assert.equal(planComplete.nextFulfillmentStatus, 'service_completed');
  });

  it('10. store progress plan maps goods order to packing/delivered fulfillment status', () => {
    const planProcess = buildStoreOrderProgressPlan('paid', 'processing', 'physical', 'paid');
    assert.equal(planProcess.nextFulfillmentStatus, 'packing');

    const planComplete = buildStoreOrderProgressPlan('processing', 'completed', 'physical', 'paid');
    assert.equal(planComplete.nextFulfillmentStatus, 'delivered');
  });

  it('11. webhook-succeeded plan upgrades pending/new order to paid', () => {
    const plan = buildOrderPaymentWebhookSucceededPlan('new', 'pending', false);
    assert.equal(plan.nextOrderStatus, 'paid');
    assert.ok(plan.intents.includes('REDEEM_VOUCHER'));
  });

  it('12. webhook-succeeded plan no-ops on already paid order', () => {
    const plan = buildOrderPaymentWebhookSucceededPlan('paid', 'paid', false);
    assert.equal(plan.nextOrderStatus, 'paid');
    assert.equal(plan.noOpReason, 'ALREADY_APPLIED');
  });

  it('13. webhook-failed plan cancels pending/new order', () => {
    const plan = buildOrderPaymentWebhookFailedPlan('new', 'pending', true);
    assert.equal(plan.nextOrderStatus, 'cancelled');
    assert.ok(plan.intents.includes('RELEASE_VOUCHER'));
    assert.ok(plan.intents.includes('RELEASE_USER_VOUCHER'));
  });

  it('14. webhook-failed plan blocks if order is already paid/confirmed', () => {
    const plan = buildOrderPaymentWebhookFailedPlan('confirmed', 'paid', true);
    assert.equal(plan.nextOrderStatus, 'confirmed');
    assert.equal(plan.noOpReason, 'STATE_CHANGED');
  });


  it('17. refund-approved plan returns RELEASE_VOUCHER and ROLLBACK_INVENTORY_RESERVATION intents', () => {
    const plan = buildOrderRefundApprovedPlan('processing');
    assert.equal(plan.nextOrderStatus, 'refund_approved');
    assert.ok(plan.intents.includes('RELEASE_VOUCHER'));
    assert.ok(plan.intents.includes('ROLLBACK_INVENTORY_RESERVATION'));
  });

  it('18. refund-rejected plan progresses to refund_rejected without intents', () => {
    const plan = buildOrderRefundRejectedPlan('processing');
    assert.equal(plan.nextOrderStatus, 'refund_rejected');
    assert.equal(plan.intents.length, 0);
  });

  it('19. store-cancelled plan has intents if hasReservedSideEffects', () => {
    const plan = buildStoreOrderCancelledPlan('new', 'pending');
    assert.equal(plan.nextOrderStatus, 'cancelled');
    assert.ok(plan.intents.includes('RELEASE_VOUCHER'));
    assert.ok(plan.intents.includes('RELEASE_USER_VOUCHER'));
    assert.ok(plan.intents.includes('ROLLBACK_INVENTORY_RESERVATION'));
  });

  it('20. store-cancelled plan has NO intents if hasReservedSideEffects is false', () => {
    const plan = buildStoreOrderCancelledPlan('paid', 'paid');
    assert.equal(plan.nextOrderStatus, 'cancelled');
    assert.equal(plan.intents.length, 0);
  });

  it('21. refund request plan moves eligible order to refund_requested', () => {
    const staffPlan = buildOrderRefundRequestPlan('paid', 'paid', 'STAFF', 'product');
    assert.equal(staffPlan.nextOrderStatus, 'refund_requested');
    const customerPlan = buildOrderRefundRequestPlan('paid', 'paid', 'CUSTOMER', 'product');
    assert.equal(customerPlan.nextOrderStatus, 'refund_requested');
  });

  it('22. shipment-return refund plan no-ops if refund is already open/reviewed', () => {
    const plan = buildOrderRefundRequestPlan('refund_requested', 'paid', 'SHIPMENT_RETURN', 'product');
    assert.equal(plan.noOpReason, 'ALREADY_APPLIED');
  });

  it('22b. refund request plan rejects non-eligible source states with STATE_CHANGED or terminal no-op', () => {
    const plan = buildOrderRefundRequestPlan('cancelled', 'paid', 'STAFF', 'product');
    assert.equal(plan.noOpReason, 'STATE_CHANGED');
  });


  it('23. membership reject refund plan requires paid membership order semantics', () => {
    const planNotPaid = buildOrderRefundRequestPlan('paid', 'unpaid', 'MEMBERSHIP_REJECT', 'membership_package');
    assert.equal(planNotPaid.noOpReason, 'UNPAID_FOR_REFUND');
    const planNotMembership = buildOrderRefundRequestPlan('paid', 'paid', 'MEMBERSHIP_REJECT', 'product');
    assert.equal(planNotMembership.noOpReason, 'NOT_MEMBERSHIP_ORDER');
    const planValid = buildOrderRefundRequestPlan('paid', 'paid', 'MEMBERSHIP_REJECT', 'MEMBERSHIP_PACKAGE');
    assert.equal(planValid.nextOrderStatus, 'refund_requested');
    assert.equal(planValid.noOpReason, undefined);
  });


  it('25. refund review approve plan moves refund_requested -> refund_approved', () => {
    const plan = buildRefundReviewPlan('refund_requested', 'APPROVED');
    assert.equal(plan.nextOrderStatus, 'refund_approved');
    assert.equal(plan.nextRefundStatus, 'APPROVED');
    assert.ok(plan.intents.includes('REBUILD_REFUND_SNAPSHOT_LINES'));
  });

  it('26. refund review reject plan moves refund_requested -> refund_rejected', () => {
    const plan = buildRefundReviewPlan('refund_requested', 'REJECTED');
    assert.equal(plan.nextOrderStatus, 'refund_rejected');
    assert.equal(plan.nextRefundStatus, 'REJECTED');
    assert.ok(plan.intents.includes('CLEAR_REFUND_SNAPSHOT_LINES'));
  });

  it('27. refund review plan no-ops when already in target reviewed state', () => {
    const plan = buildRefundReviewPlan('refund_approved', 'APPROVED');
    assert.equal(plan.noOpReason, 'ALREADY_APPLIED');
    assert.equal(plan.intents.length, 0);
  });



  it('32. COD settlement plan settles unpaid COD order', () => {
    const plan = buildCodSettlementPlan('processing', 'unpaid', false);
    assert.equal(plan.nextPaymentStatus, 'paid');
    assert.equal(plan.nextOrderStatus, 'processing');
  });

  it('33. COD settlement plan completes shipped order if completion requested', () => {
    const plan = buildCodSettlementPlan('shipped', 'unpaid', true);
    assert.equal(plan.nextPaymentStatus, 'paid');
    assert.equal(plan.nextOrderStatus, 'completed');
  });

  it('34. COD settlement plan no-ops with STATE_CHANGED if status is invalid', () => {
    const plan = buildCodSettlementPlan('new', 'unpaid', false);
    assert.equal(plan.noOpReason, 'STATE_CHANGED');
  });

  it('35. COD settlement plan completes already paid shipped order if completion requested', () => {
    const plan = buildCodSettlementPlan('shipped', 'paid', true);
    assert.equal(plan.nextOrderStatus, 'completed');
    assert.equal(plan.noOpReason, undefined);
  });

  it('36. COD settlement plan no-ops with ALREADY_APPLIED if already paid and no completion needed', () => {
    const plan = buildCodSettlementPlan('shipped', 'paid', false);
    assert.equal(plan.noOpReason, 'ALREADY_APPLIED');
  });
});
