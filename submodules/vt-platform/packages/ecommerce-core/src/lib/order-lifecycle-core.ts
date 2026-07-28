import type { OrderLifecyclePlan, RefundLifecyclePlan, RefundRequestSourceKind } from './order-lifecycle.contracts';
import { resolveStoreProgressFulfillmentStatus } from './fulfillment-lifecycle-core';

/**
 * Build the plan for creating a new order.
 * Decides if the order starts as pending payment or immediate paid.
 */
export function buildOrderCreateLifecyclePlan(isImmediatePaid: boolean): OrderLifecyclePlan {
  if (isImmediatePaid) {
    return {
      nextOrderStatus: 'paid',
      nextPaymentStatus: 'paid',
      nextFulfillmentStatus: 'not_started',
      timelineKind: 'PAYMENT_PAID',
      eventKind: 'ORDER_CREATED',
      intents: ['REDEEM_VOUCHER', 'POST_REWARD_LEDGER', 'ISSUE_TICKETS'],
    };
  }
  
  return {
    nextOrderStatus: 'pending_payment',
    nextPaymentStatus: 'pending',
    nextFulfillmentStatus: 'not_started',
    timelineKind: 'PAYMENT_PENDING',
    eventKind: 'ORDER_CREATED',
    intents: ['RESERVE_REDEEM_LEDGER'],
  };
}

/**
 * Build the plan for confirming a payment asynchronously or manually.
 */
export function buildOrderPaymentConfirmedPlan(
  currentOrderStatus: string,
  currentPaymentStatus?: string
): OrderLifecyclePlan {
  if (currentOrderStatus === 'paid' || currentPaymentStatus === 'paid' || currentOrderStatus === 'processing' || currentOrderStatus === 'completed') {
    return {
      nextOrderStatus: currentOrderStatus,
      timelineKind: 'PAYMENT_PAID',
      eventKind: 'ORDER_PAID',
      intents: [],
      noOpReason: 'ALREADY_APPLIED',
    };
  }

  if (currentOrderStatus === 'cancelled' || currentOrderStatus === 'refunded') {
    return {
      nextOrderStatus: currentOrderStatus,
      timelineKind: 'PAYMENT_PAID',
      eventKind: 'ORDER_PAID',
      intents: [],
      noOpReason: 'ALREADY_TERMINAL',
    };
  }

  return {
    nextOrderStatus: 'paid',
    nextPaymentStatus: 'paid',
    paymentSessionTarget: 'PAID',
    timelineKind: 'PAYMENT_PAID',
    eventKind: 'ORDER_PAID',
    intents: ['REDEEM_VOUCHER', 'RELEASE_REDEEM_LEDGER', 'POST_REWARD_LEDGER', 'ISSUE_TICKETS'],
  };
}

/**
 * Build the plan for payment expiration.
 */
export function buildOrderPaymentExpiredPlan(
  currentOrderStatus: string
): OrderLifecyclePlan {
  if (currentOrderStatus === 'cancelled') {
    return {
      nextOrderStatus: 'cancelled',
      timelineKind: 'PAYMENT_EXPIRED',
      eventKind: 'ORDER_PAYMENT_EXPIRED',
      intents: [],
      noOpReason: 'ALREADY_TERMINAL', // Or ALREADY_APPLIED, we can use ALREADY_TERMINAL
    };
  }

  if (currentOrderStatus !== 'pending_payment' && currentOrderStatus !== 'new' && currentOrderStatus !== 'draft' && currentOrderStatus !== 'confirmed') {
    return {
      nextOrderStatus: currentOrderStatus,
      timelineKind: 'PAYMENT_EXPIRED',
      eventKind: 'ORDER_PAYMENT_EXPIRED',
      intents: [],
      noOpReason: 'ALREADY_TERMINAL',
    };
  }

  return {
    nextOrderStatus: 'cancelled',
    nextPaymentStatus: 'expired',
    paymentSessionTarget: 'EXPIRED',
    timelineKind: 'PAYMENT_EXPIRED',
    eventKind: 'ORDER_PAYMENT_EXPIRED',
    intents: ['RELEASE_REDEEM_LEDGER', 'RELEASE_VOUCHER', 'RELEASE_USER_VOUCHER', 'ROLLBACK_INVENTORY_RESERVATION'],
  };
}

/**
 * Build the plan for manual cancellation.
 */
export function buildOrderPaymentCancelledPlan(
  currentOrderStatus: string,
  currentPaymentStatus: string
): OrderLifecyclePlan {
  const hasReservedSideEffects = currentPaymentStatus !== 'paid';
  if (currentOrderStatus === 'cancelled') {
    return {
      nextOrderStatus: 'cancelled',
      timelineKind: 'ORDER_CANCELLED',
      eventKind: 'ORDER_CANCELLED',
      intents: [],
      noOpReason: 'ALREADY_APPLIED',
    };
  }

  if (currentOrderStatus === 'paid' || currentOrderStatus === 'completed' || currentOrderStatus === 'processing' || currentOrderStatus === 'shipped') {
    return {
      nextOrderStatus: currentOrderStatus,
      timelineKind: 'ORDER_CANCELLED',
      eventKind: 'ORDER_CANCELLED',
      intents: [],
      noOpReason: 'ALREADY_TERMINAL',
    };
  }

  return {
    nextOrderStatus: 'cancelled',
    nextPaymentStatus: 'cancelled',
    paymentSessionTarget: 'CANCELLED',
    timelineKind: 'ORDER_CANCELLED',
    eventKind: 'ORDER_CANCELLED',
    intents: hasReservedSideEffects ? ['RELEASE_REDEEM_LEDGER', 'RELEASE_VOUCHER', 'RELEASE_USER_VOUCHER', 'ROLLBACK_INVENTORY_RESERVATION'] : [],
  };
}

/**
 * Build the plan for store staff cancelling an order.
 */
export function buildStoreOrderCancelledPlan(
  currentOrderStatus: string,
  currentPaymentStatus: string
): OrderLifecyclePlan {
  const hasReservedSideEffects = currentPaymentStatus !== 'paid';
  if (currentOrderStatus === 'cancelled' || currentOrderStatus === 'refunded') {
    return {
      nextOrderStatus: currentOrderStatus,
      timelineKind: 'ORDER_CANCELLED',
      eventKind: 'ORDER_CANCELLED',
      intents: [],
      noOpReason: 'ALREADY_TERMINAL',
    };
  }

  return {
    nextOrderStatus: 'cancelled',
    nextPaymentStatus: 'cancelled',
    paymentSessionTarget: 'CANCELLED',
    timelineKind: 'ORDER_CANCELLED',
    eventKind: 'ORDER_CANCELLED',
    intents: hasReservedSideEffects ? ['RELEASE_REDEEM_LEDGER', 'RELEASE_VOUCHER', 'RELEASE_USER_VOUCHER', 'ROLLBACK_INVENTORY_RESERVATION'] : [],
  };
}

/**
 * Build the plan for store staff progressing an order.
 */
export function buildStoreOrderProgressPlan(
  currentOrderStatus: string,
  targetOrderStatus: string,
  orderType: string,
  currentPaymentStatus: string
): OrderLifecyclePlan {
  const hasServiceItems = orderType.toLowerCase() === 'membership_package';
  if (targetOrderStatus === 'completed' && currentPaymentStatus !== 'paid') {
    return {
      nextOrderStatus: currentOrderStatus,
      timelineKind: 'STORE_COMPLETED',
      eventKind: 'ORDER_COMPLETED',
      intents: [],
      noOpReason: 'UNPAID',
    };
  }

  if (currentOrderStatus === 'pending_payment' || currentOrderStatus === 'cancelled') {
    return {
      nextOrderStatus: currentOrderStatus,
      timelineKind: 'STORE_PROCESSING',
      eventKind: 'ORDER_PROCESSING',
      intents: [],
      noOpReason: 'ALREADY_TERMINAL',
    };
  }

  let nextFulfillmentStatus: string | null = null;
  let timelineKind: 'STORE_PROCESSING' | 'STORE_COMPLETED' = 'STORE_PROCESSING';
  let eventKind: 'ORDER_PROCESSING' | 'ORDER_COMPLETED' = 'ORDER_PROCESSING';

  if (targetOrderStatus === 'processing') {
    nextFulfillmentStatus = resolveStoreProgressFulfillmentStatus(targetOrderStatus, hasServiceItems);
    timelineKind = 'STORE_PROCESSING';
    eventKind = 'ORDER_PROCESSING';
  } else if (targetOrderStatus === 'completed') {
    nextFulfillmentStatus = resolveStoreProgressFulfillmentStatus(targetOrderStatus, hasServiceItems);
    timelineKind = 'STORE_COMPLETED';
    eventKind = 'ORDER_COMPLETED';
  }

  return {
    nextOrderStatus: targetOrderStatus,
    nextFulfillmentStatus,
    timelineKind,
    eventKind,
    intents: [],
  };
}

export function buildOrderPaymentWebhookSucceededPlan(
  currentOrderStatus: string,
  currentPaymentStatus: string,
  isMembershipOrder: boolean
): OrderLifecyclePlan {
  if (currentPaymentStatus === 'paid') {
    return {
      nextOrderStatus: currentOrderStatus,
      timelineKind: 'PAYMENT_PAID',
      eventKind: 'ORDER_PAID',
      intents: ['RECORD_AUDIT_NOOP'],
      noOpReason: 'ALREADY_APPLIED',
      auditKind: 'PAYMENT_WEBHOOK_DUPLICATE_NOOP',
    };
  }

  if (currentOrderStatus === 'cancelled' || currentOrderStatus === 'failed' || currentOrderStatus.startsWith('refund_') || currentPaymentStatus === 'failed') {
    return {
      nextOrderStatus: currentOrderStatus,
      timelineKind: 'PAYMENT_PAID',
      eventKind: 'ORDER_PAID',
      intents: ['RECORD_AUDIT_NOOP'],
      noOpReason: 'ALREADY_TERMINAL',
      auditKind: 'PAYMENT_WEBHOOK_TERMINAL_NOOP',
    };
  }

  if (isMembershipOrder) {
    return {
      nextOrderStatus: 'completed',
      nextPaymentStatus: 'paid',
      paymentSessionTarget: 'PAID',
      timelineKind: 'STORE_COMPLETED',
      eventKind: 'ORDER_COMPLETED',
      intents: [],
    };
  }

  return {
    nextOrderStatus: 'paid', // Upgrades from new/pending to paid
    nextPaymentStatus: 'paid',
    paymentSessionTarget: 'PAID',
    timelineKind: 'PAYMENT_PAID',
    eventKind: 'ORDER_PAID',
    intents: ['REDEEM_VOUCHER', 'RELEASE_REDEEM_LEDGER'], // Emits intents
  };
}

export function buildOrderPaymentWebhookFailedPlan(
  currentOrderStatus: string,
  currentPaymentStatus: string,
  hasReservedSideEffects: boolean
): OrderLifecyclePlan {
  if (currentPaymentStatus === 'paid') {
    return {
      nextOrderStatus: currentOrderStatus,
      timelineKind: 'ORDER_CANCELLED',
      eventKind: 'ORDER_CANCELLED',
      intents: [],
      noOpReason: 'STATE_CHANGED',
    };
  }

  if (currentOrderStatus === 'cancelled' || currentOrderStatus === 'failed' || currentOrderStatus.startsWith('refund_') || currentPaymentStatus === 'failed') {
    return {
      nextOrderStatus: currentOrderStatus,
      timelineKind: 'ORDER_CANCELLED',
      eventKind: 'ORDER_CANCELLED',
      intents: ['RECORD_AUDIT_NOOP'],
      noOpReason: 'ALREADY_TERMINAL',
      auditKind: 'PAYMENT_WEBHOOK_TERMINAL_NOOP',
    };
  }

  if ((currentOrderStatus !== 'pending_payment' && currentOrderStatus !== 'new' && currentOrderStatus !== 'confirmed') || currentPaymentStatus !== 'pending') {
    return {
      nextOrderStatus: currentOrderStatus,
      timelineKind: 'ORDER_CANCELLED',
      eventKind: 'ORDER_CANCELLED',
      intents: [],
      noOpReason: 'STATE_CHANGED',
    };
  }

  return {
    nextOrderStatus: 'cancelled',
    nextPaymentStatus: 'failed',
    paymentSessionTarget: 'CANCELLED',
    timelineKind: 'ORDER_CANCELLED',
    eventKind: 'ORDER_CANCELLED',
    intents: hasReservedSideEffects ? ['RELEASE_VOUCHER', 'RELEASE_USER_VOUCHER', 'ROLLBACK_INVENTORY_RESERVATION'] : [],
  };
}

export function buildCustomerReportedPaymentFailedPlan(
  currentOrderStatus: string,
  currentPaymentStatus: string
): OrderLifecyclePlan {
  const hasReservedSideEffects = currentPaymentStatus !== 'paid';
  if (currentPaymentStatus === 'paid') {
    return {
      nextOrderStatus: currentOrderStatus,
      timelineKind: 'ORDER_CANCELLED',
      eventKind: 'ORDER_CANCELLED',
      intents: [],
      noOpReason: 'STATE_CHANGED',
    };
  }

  if (currentOrderStatus === 'cancelled' || currentOrderStatus === 'failed' || currentOrderStatus.startsWith('refund_') || currentPaymentStatus === 'failed') {
    return {
      nextOrderStatus: currentOrderStatus,
      timelineKind: 'ORDER_CANCELLED',
      eventKind: 'ORDER_CANCELLED',
      intents: [],
      noOpReason: 'ALREADY_TERMINAL',
    };
  }

  if (currentOrderStatus !== 'pending_payment' && currentOrderStatus !== 'new' && currentOrderStatus !== 'confirmed') {
    return {
      nextOrderStatus: currentOrderStatus,
      timelineKind: 'ORDER_CANCELLED',
      eventKind: 'ORDER_CANCELLED',
      intents: [],
      noOpReason: 'STATE_CHANGED',
    };
  }

  return {
    nextOrderStatus: 'cancelled',
    nextPaymentStatus: 'failed',
    paymentSessionTarget: 'CANCELLED',
    timelineKind: 'ORDER_CANCELLED',
    eventKind: 'ORDER_CANCELLED',
    intents: hasReservedSideEffects ? ['RELEASE_VOUCHER', 'RELEASE_USER_VOUCHER', 'ROLLBACK_INVENTORY_RESERVATION'] : [],
  };
}


export function buildOrderRefundApprovedPlan(
  currentOrderStatus: string,
): OrderLifecyclePlan {
  if (currentOrderStatus === 'refund_approved' || currentOrderStatus === 'refund_rejected' || currentOrderStatus === 'refunded') {
    return {
      nextOrderStatus: currentOrderStatus,
      timelineKind: 'ORDER_REFUNDED',
      eventKind: 'ORDER_REFUNDED',
      intents: [],
      noOpReason: 'ALREADY_TERMINAL',
    };
  }

  return {
    nextOrderStatus: 'refund_approved',
    timelineKind: 'ORDER_REFUNDED',
    eventKind: 'ORDER_REFUNDED',
    intents: ['RELEASE_VOUCHER', 'RELEASE_USER_VOUCHER', 'ROLLBACK_INVENTORY_RESERVATION'],
  };
}

export function buildOrderRefundRejectedPlan(
  currentOrderStatus: string,
): OrderLifecyclePlan {
  if (currentOrderStatus === 'refund_approved' || currentOrderStatus === 'refund_rejected' || currentOrderStatus === 'refunded') {
    return {
      nextOrderStatus: currentOrderStatus,
      timelineKind: 'ORDER_REFUND_REJECTED',
      eventKind: 'ORDER_REFUND_REJECTED',
      intents: [],
      noOpReason: 'ALREADY_TERMINAL',
    };
  }

  return {
    nextOrderStatus: 'refund_rejected',
    timelineKind: 'ORDER_REFUND_REJECTED',
    eventKind: 'ORDER_REFUND_REJECTED',
    intents: [],
  };
}

/**
 * Build the plan for creating a refund request (staff, customer, or membership reject).
 */
export function buildOrderRefundRequestPlan(
  currentOrderStatus: string,
  currentPaymentStatus: string,
  source: RefundRequestSourceKind,
  orderType: string
): RefundLifecyclePlan {
  // If already in a refund flow, it's ALREADY_APPLIED.
  if (currentOrderStatus === 'refund_requested' || currentOrderStatus === 'refund_approved' || currentOrderStatus === 'refund_rejected' || currentOrderStatus === 'refunded') {
    return {
      nextOrderStatus: currentOrderStatus,
      timelineKind: 'REFUND_REQUESTED',
      eventKind: 'ORDER_REFUND_REQUESTED',
      intents: [],
      noOpReason: 'ALREADY_APPLIED',
    };
  }

  // Reject non-eligible source states
  if (currentOrderStatus === 'cancelled' || currentOrderStatus === 'pending_payment' || currentOrderStatus === 'payment_failed') {
    return {
      nextOrderStatus: currentOrderStatus,
      timelineKind: 'REFUND_REQUESTED',
      eventKind: 'ORDER_REFUND_REQUESTED',
      intents: [],
      noOpReason: 'STATE_CHANGED',
    };
  }



  if (source === 'MEMBERSHIP_REJECT') {
    if (orderType.toLowerCase() !== 'membership_package') {
      return {
        nextOrderStatus: currentOrderStatus,
        timelineKind: 'REFUND_REQUESTED',
        eventKind: 'ORDER_REFUND_REQUESTED',
        intents: [],
        noOpReason: 'NOT_MEMBERSHIP_ORDER',
      };
    }
    if (currentPaymentStatus !== 'paid') {
      return {
        nextOrderStatus: currentOrderStatus,
        timelineKind: 'REFUND_REQUESTED',
        eventKind: 'ORDER_REFUND_REQUESTED',
        intents: [],
        noOpReason: 'UNPAID_FOR_REFUND',
      };
    }
  }

  return {
    nextOrderStatus: 'refund_requested',
    timelineKind: 'REFUND_REQUESTED',
    eventKind: 'ORDER_REFUND_REQUESTED',
    intents: [],
  };
}

/**
 * Build the plan for reviewing a refund request.
 */
export function buildRefundReviewPlan(
  currentOrderStatus: string,
  targetRefundStatus: 'APPROVED' | 'REJECTED'
): RefundLifecyclePlan {
  const targetOrderStatus = targetRefundStatus === 'APPROVED' ? 'refund_approved' : 'refund_rejected';
  
  if (currentOrderStatus === targetOrderStatus) {
    return {
      nextOrderStatus: currentOrderStatus,
      nextRefundStatus: targetRefundStatus,
      timelineKind: targetRefundStatus === 'APPROVED' ? 'REFUND_APPROVED' : 'REFUND_REJECTED',
      eventKind: targetRefundStatus === 'APPROVED' ? 'ORDER_REFUNDED' : 'ORDER_REFUND_REJECTED',
      intents: [],
      noOpReason: 'ALREADY_APPLIED',
    };
  }

  // Can only review if it's currently requested
  if (currentOrderStatus !== 'refund_requested') {
    return {
      nextOrderStatus: currentOrderStatus,
      timelineKind: targetRefundStatus === 'APPROVED' ? 'REFUND_APPROVED' : 'REFUND_REJECTED',
      eventKind: targetRefundStatus === 'APPROVED' ? 'ORDER_REFUNDED' : 'ORDER_REFUND_REJECTED',
      intents: [],
      noOpReason: 'STATE_CHANGED',
    };
  }

  return {
    nextOrderStatus: targetOrderStatus,
    nextRefundStatus: targetRefundStatus,
    timelineKind: targetRefundStatus === 'APPROVED' ? 'REFUND_APPROVED' : 'REFUND_REJECTED',
    eventKind: targetRefundStatus === 'APPROVED' ? 'ORDER_REFUNDED' : 'ORDER_REFUND_REJECTED',
    intents: targetRefundStatus === 'APPROVED' ? ['REBUILD_REFUND_SNAPSHOT_LINES'] : ['CLEAR_REFUND_SNAPSHOT_LINES'],
  };
}


/**
 * Build the plan for settling a COD payment.
 */
export function buildCodSettlementPlan(
  currentOrderStatus: string,
  currentPaymentStatus: string,
  hasCompleteDeliveredShipmentRequest: boolean
): OrderLifecyclePlan {
  if (currentPaymentStatus === 'paid') {
    if (hasCompleteDeliveredShipmentRequest && currentOrderStatus === 'shipped') {
      return {
        nextOrderStatus: 'completed',
        nextPaymentStatus: 'paid',
        timelineKind: 'STORE_COMPLETED',
        eventKind: 'ORDER_COMPLETED',
        intents: [],
      };
    }
    return {
      nextOrderStatus: currentOrderStatus,
      nextPaymentStatus: currentPaymentStatus,
      timelineKind: 'PAYMENT_PAID',
      eventKind: 'ORDER_PAID',
      intents: [],
      noOpReason: 'ALREADY_APPLIED',
    };
  }

  const eligibleStatuses = ['confirmed', 'processing', 'shipped'];
  if (!eligibleStatuses.includes(currentOrderStatus)) {
    return {
      nextOrderStatus: currentOrderStatus,
      nextPaymentStatus: currentPaymentStatus,
      timelineKind: 'PAYMENT_PAID',
      eventKind: 'ORDER_PAID',
      intents: [],
      noOpReason: 'STATE_CHANGED',
    };
  }

  if (hasCompleteDeliveredShipmentRequest && currentOrderStatus === 'shipped') {
    return {
      nextOrderStatus: 'completed',
      nextPaymentStatus: 'paid',
      timelineKind: 'STORE_COMPLETED',
      eventKind: 'ORDER_COMPLETED',
      intents: [],
    };
  }

  return {
    nextOrderStatus: currentOrderStatus,
    nextPaymentStatus: 'paid',
    timelineKind: 'PAYMENT_PAID',
    eventKind: 'ORDER_PAID',
    intents: [],
  };
}


/**
 * Build the plan for a customer explicitly cancelling their order.
 */
export function buildCustomerOrderCancelledPlan(
  currentOrderStatus: string,
  currentPaymentStatus: string
): OrderLifecyclePlan {
  const hasReservedSideEffects = currentPaymentStatus !== 'paid';
  if (currentPaymentStatus === 'paid') {
    return {
      nextOrderStatus: currentOrderStatus,
      timelineKind: 'ORDER_CANCELLED',
      eventKind: 'ORDER_CANCELLED',
      intents: [],
      noOpReason: 'PAID',
    };
  }

  if (currentOrderStatus !== 'new' && currentOrderStatus !== 'pending_payment') {
    return {
      nextOrderStatus: currentOrderStatus,
      timelineKind: 'ORDER_CANCELLED',
      eventKind: 'ORDER_CANCELLED',
      intents: [],
      noOpReason: 'NOT_ALLOWED',
    };
  }

  return {
    nextOrderStatus: 'cancelled',
    nextPaymentStatus: 'cancelled',
    paymentSessionTarget: 'CANCELLED',
    timelineKind: 'ORDER_CANCELLED',
    eventKind: 'ORDER_CANCELLED',
    intents: hasReservedSideEffects ? ['RELEASE_REDEEM_LEDGER', 'RELEASE_VOUCHER', 'RELEASE_USER_VOUCHER', 'ROLLBACK_INVENTORY_RESERVATION'] : [],
  };
}

