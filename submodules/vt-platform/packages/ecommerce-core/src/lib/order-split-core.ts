import type { ParentItemInput, SplitItemInput, OrderSplitPlan } from './order-split.contracts';

/**
 * Build the plan for splitting an order.
 * Validates statuses, quantities, and determines if reservation rebalance is needed.
 * Respects lineId identity to support orders with duplicate product lines.
 * Allocates split quantity across multiple matching parent lines if needed.
 */
export function buildOrderSplitPlan(
  parentStatus: string,
  parentItems: readonly ParentItemInput[],
  itemsToSplit: readonly SplitItemInput[],
  splitMinTotalUnits: number,
  allowedStatuses: readonly string[],
  pendingPaymentStatuses: readonly string[]
): OrderSplitPlan {
  if (!allowedStatuses.includes(parentStatus)) {
    return {
      shouldRebalanceReservation: false,
      parentItemsToUpdate: [],
      childItemsToCreate: [],
      errorReason: 'STATUS_NOT_ALLOWED',
    };
  }

  // Check total quantity of parent items before split
  const totalQty = parentItems.reduce((sum, item) => sum + item.qty, 0);
  if (totalQty < splitMinTotalUnits) {
    return {
      shouldRebalanceReservation: false,
      parentItemsToUpdate: [],
      childItemsToCreate: [],
      errorReason: 'MIN_ITEMS_REQUIRED',
    };
  }

  const childItemsToCreate: { parentLineId: string; qty: number }[] = [];
  const parentLinesState = parentItems.map((item) => ({
    lineId: item.lineId,
    productId: item.productId,
    qty: item.qty,
  }));

  for (const splitItem of itemsToSplit) {
    let remainingQtyToSplit = splitItem.qty;

    // Find all matching parent lines for this product that still have remaining quantity
    for (const parentLine of parentLinesState) {
      if (parentLine.productId === splitItem.productId && parentLine.qty > 0) {
        const qtyToTake = Math.min(remainingQtyToSplit, parentLine.qty);
        
        childItemsToCreate.push({
          parentLineId: parentLine.lineId,
          qty: qtyToTake,
        });
        
        parentLine.qty -= qtyToTake;
        remainingQtyToSplit -= qtyToTake;
        
        if (remainingQtyToSplit === 0) {
          break;
        }
      }
    }

    if (remainingQtyToSplit > 0) {
      const hasAnyLine = parentItems.some((line) => line.productId === splitItem.productId);
      if (!hasAnyLine) {
        return {
          shouldRebalanceReservation: false,
          parentItemsToUpdate: [],
          childItemsToCreate: [],
          errorReason: 'ITEM_NOT_FOUND',
          errorDetails: { productId: splitItem.productId },
        };
      } else {
        return {
          shouldRebalanceReservation: false,
          parentItemsToUpdate: [],
          childItemsToCreate: [],
          errorReason: 'QUANTITY_EXCEEDED',
          errorDetails: {
            productId: splitItem.productId,
            requestedQty: splitItem.qty,
            availableQty: parentItems
              .filter((line) => line.productId === splitItem.productId)
              .reduce((sum, line) => sum + line.qty, 0),
          },
        };
      }
    }
  }

  // If all parent items ended up with qty = 0, it means parent order becomes empty
  const hasRemainingItems = parentLinesState.some((line) => line.qty > 0);
  if (!hasRemainingItems) {
    return {
      shouldRebalanceReservation: false,
      parentItemsToUpdate: [],
      childItemsToCreate: [],
      errorReason: 'EMPTY_PARENT',
    };
  }

  // Build update instructions only for modified parent lines
  const parentItemsToUpdate: { lineId: string; qty: number }[] = [];
  for (let i = 0; i < parentItems.length; i++) {
    const original = parentItems[i];
    const current = parentLinesState[i];
    if (current.qty !== original.qty) {
      parentItemsToUpdate.push({
        lineId: current.lineId,
        qty: current.qty,
      });
    }
  }

  const shouldRebalanceReservation = pendingPaymentStatuses.includes(parentStatus);

  return {
    shouldRebalanceReservation,
    parentItemsToUpdate,
    childItemsToCreate,
  };
}
