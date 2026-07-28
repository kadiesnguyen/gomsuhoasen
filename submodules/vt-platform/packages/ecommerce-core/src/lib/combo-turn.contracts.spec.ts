import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  calculateComboTurnRemainingTurns,
  calculateComboTurnTotalTurns,
  calculateEffectiveComboTurnPurchasedQuantity,
  ComboTurnStatus,
  COMBO_TURN_ELIGIBLE_ORDER_STATUS_VALUES,
  COMBO_TURN_STATUS_VALUES,
  ComboTurnUsageSessionSource,
  COMBO_TURN_USAGE_SESSION_SOURCE_VALUES,
  ComboTurnUsageSessionStatus,
  COMBO_TURN_USAGE_SESSION_STATUS_VALUES,
  isComboTurnEligibleOrderStatus,
  isComboTurnUsageSessionStatus,
  resolveNextComboTurnSequence,
} from './combo-turn.contracts';

describe('combo-turn.contracts', () => {
  it('exposes combo turn status values', () => {
    assert.ok(COMBO_TURN_STATUS_VALUES.includes(ComboTurnStatus.CONSUMED));
    assert.ok(COMBO_TURN_STATUS_VALUES.includes(ComboTurnStatus.VOIDED));
  });

  it('exposes eligible order status values used by combo entitlements', () => {
    assert.ok(COMBO_TURN_ELIGIBLE_ORDER_STATUS_VALUES.includes('CONFIRMED'));
    assert.ok(COMBO_TURN_ELIGIBLE_ORDER_STATUS_VALUES.includes('REFUND_APPROVED'));
    assert.strictEqual(isComboTurnEligibleOrderStatus('COMPLETED'), true);
    assert.strictEqual(isComboTurnEligibleOrderStatus('CANCELLED'), false);
  });

  it('exposes usage session source values', () => {
    assert.ok(COMBO_TURN_USAGE_SESSION_SOURCE_VALUES.includes(ComboTurnUsageSessionSource.PORTAL_QR));
    assert.ok(COMBO_TURN_USAGE_SESSION_SOURCE_VALUES.includes(ComboTurnUsageSessionSource.CUSTOMER_CODE));
  });

  it('exposes usage session status values', () => {
    assert.ok(COMBO_TURN_USAGE_SESSION_STATUS_VALUES.includes(ComboTurnUsageSessionStatus.PENDING_CUSTOMER_CONFIRMATION));
    assert.ok(COMBO_TURN_USAGE_SESSION_STATUS_VALUES.includes(ComboTurnUsageSessionStatus.CONSUMED));
  });

  it('validates combo turn usage session status correctly', () => {
    assert.strictEqual(isComboTurnUsageSessionStatus(ComboTurnUsageSessionStatus.PENDING_CUSTOMER_CONFIRMATION), true);
    assert.strictEqual(isComboTurnUsageSessionStatus(ComboTurnUsageSessionStatus.CONSUMED), true);
    assert.strictEqual(isComboTurnUsageSessionStatus('INVALID_STATUS'), false);
    assert.strictEqual(isComboTurnUsageSessionStatus(null), false);
    assert.strictEqual(isComboTurnUsageSessionStatus(undefined), false);
  });

  it('calculates effective purchased quantity and total turns for combo entitlements', () => {
    assert.strictEqual(calculateEffectiveComboTurnPurchasedQuantity(3, 1), 2);
    assert.strictEqual(calculateComboTurnTotalTurns(2, 3), 6);
    assert.throws(
      () => calculateEffectiveComboTurnPurchasedQuantity(1, 2),
      /refundedQuantity cannot exceed purchasedQuantity/,
    );
  });

  it('calculates remaining turns and resolves the first reusable sequence slot', () => {
    assert.strictEqual(calculateComboTurnRemainingTurns(4, 1), 3);
    assert.strictEqual(calculateComboTurnRemainingTurns(2, 5), 0);
    assert.strictEqual(resolveNextComboTurnSequence(3, [1, 3]), 2);
    assert.strictEqual(resolveNextComboTurnSequence(2, [1, 2]), null);
  });
});
