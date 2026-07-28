import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { buildOrderSplitPlan } from './order-split-core';

describe('Order Split Core', () => {
  const allowedStatuses = ['confirmed', 'processing', 'shipped'];
  const pendingPaymentStatuses = ['pending_payment', 'new'];

  it('1. returns STATUS_NOT_ALLOWED error if parent status is invalid', () => {
    const plan = buildOrderSplitPlan(
      'cancelled',
      [{ lineId: 'L1', productId: 'p1', qty: 10 }],
      [{ productId: 'p1', qty: 2 }],
      2,
      allowedStatuses,
      pendingPaymentStatuses
    );
    assert.equal(plan.errorReason, 'STATUS_NOT_ALLOWED');
  });

  it('2. returns MIN_ITEMS_REQUIRED error if parent items quantity < min total units', () => {
    const plan = buildOrderSplitPlan(
      'confirmed',
      [{ lineId: 'L1', productId: 'p1', qty: 1 }],
      [{ productId: 'p1', qty: 1 }],
      2,
      allowedStatuses,
      pendingPaymentStatuses
    );
    assert.equal(plan.errorReason, 'MIN_ITEMS_REQUIRED');
  });

  it('3. returns ITEM_NOT_FOUND error if split item does not exist in parent', () => {
    const plan = buildOrderSplitPlan(
      'confirmed',
      [{ lineId: 'L1', productId: 'p1', qty: 5 }],
      [{ productId: 'p2', qty: 1 }],
      2,
      allowedStatuses,
      pendingPaymentStatuses
    );
    assert.equal(plan.errorReason, 'ITEM_NOT_FOUND');
    assert.equal(plan.errorDetails?.['productId'], 'p2');
  });

  it('4. returns QUANTITY_EXCEEDED error if split qty > parent qty', () => {
    const plan = buildOrderSplitPlan(
      'confirmed',
      [{ lineId: 'L1', productId: 'p1', qty: 5 }],
      [{ productId: 'p1', qty: 6 }],
      2,
      allowedStatuses,
      pendingPaymentStatuses
    );
    assert.equal(plan.errorReason, 'QUANTITY_EXCEEDED');
    assert.equal(plan.errorDetails?.['productId'], 'p1');
    assert.equal(plan.errorDetails?.['requestedQty'], 6);
  });

  it('5. returns EMPTY_PARENT error if all parent items are split', () => {
    const plan = buildOrderSplitPlan(
      'confirmed',
      [{ lineId: 'L1', productId: 'p1', qty: 5 }],
      [{ productId: 'p1', qty: 5 }],
      2,
      allowedStatuses,
      pendingPaymentStatuses
    );
    assert.equal(plan.errorReason, 'EMPTY_PARENT');
  });

  it('6. returns valid plan and sets shouldRebalanceReservation if pending payment', () => {
    const plan = buildOrderSplitPlan(
      'new',
      [{ lineId: 'L1', productId: 'p1', qty: 5 }, { lineId: 'L2', productId: 'p2', qty: 10 }],
      [{ productId: 'p1', qty: 2 }],
      2,
      allowedStatuses.concat('new'),
      pendingPaymentStatuses
    );
    assert.equal(plan.errorReason, undefined);
    assert.equal(plan.shouldRebalanceReservation, true);
    assert.equal(plan.childItemsToCreate.length, 1);
    assert.equal(plan.childItemsToCreate[0].parentLineId, 'L1');
    assert.equal(plan.childItemsToCreate[0].qty, 2);

    const l1 = plan.parentItemsToUpdate.find(i => i.lineId === 'L1');
    assert.equal(l1?.qty, 3);
    const l2 = plan.parentItemsToUpdate.find(i => i.lineId === 'L2');
    assert.equal(l2, undefined); // Untouched item is not in update instructions
  });

  it('7. handles duplicate product lines without collapsing attributes', () => {
    const parentItems = [
      { lineId: 'L1', productId: 'p1', qty: 1 },
      { lineId: 'L2', productId: 'p1', qty: 2 }
    ];
    const plan = buildOrderSplitPlan(
      'confirmed',
      parentItems,
      [{ productId: 'p1', qty: 1 }],
      2,
      allowedStatuses,
      pendingPaymentStatuses
    );
    assert.equal(plan.errorReason, undefined);
    assert.equal(plan.childItemsToCreate.length, 1);
    assert.equal(plan.childItemsToCreate[0].parentLineId, 'L1');
    assert.equal(plan.childItemsToCreate[0].qty, 1);

    const l1Update = plan.parentItemsToUpdate.find(i => i.lineId === 'L1');
    assert.equal(l1Update?.qty, 0);
    const l2Update = plan.parentItemsToUpdate.find(i => i.lineId === 'L2');
    assert.equal(l2Update, undefined); // L2 remains untouched and is not in updates
  });

  it('8. allocates split quantity across multiple matching parent lines of the same product', () => {
    const parentItems = [
      { lineId: 'L1', productId: 'p1', qty: 1 },
      { lineId: 'L2', productId: 'p1', qty: 2 }
    ];
    const plan = buildOrderSplitPlan(
      'confirmed',
      parentItems,
      [{ productId: 'p1', qty: 2 }],
      2,
      allowedStatuses,
      pendingPaymentStatuses
    );
    assert.equal(plan.errorReason, undefined);
    assert.equal(plan.childItemsToCreate.length, 2);
    
    // First child segment allocated from L1
    assert.equal(plan.childItemsToCreate[0].parentLineId, 'L1');
    assert.equal(plan.childItemsToCreate[0].qty, 1);
    
    // Second child segment allocated from L2
    assert.equal(plan.childItemsToCreate[1].parentLineId, 'L2');
    assert.equal(plan.childItemsToCreate[1].qty, 1);

    // Parent updates: L1 fully consumed (qty 0), L2 partially consumed (qty 1)
    const l1Update = plan.parentItemsToUpdate.find(i => i.lineId === 'L1');
    assert.equal(l1Update?.qty, 0);
    const l2Update = plan.parentItemsToUpdate.find(i => i.lineId === 'L2');
    assert.equal(l2Update?.qty, 1);
  });
});
