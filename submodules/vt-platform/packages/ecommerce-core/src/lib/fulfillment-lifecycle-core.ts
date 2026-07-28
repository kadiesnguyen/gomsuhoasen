import type { OrderLifecycleIntentKind } from './order-lifecycle.contracts';

export type FulfillmentProgressContext = {
  currentOrderStatus: string;
  nextOrderStatus: string;
  currentPaymentStatus: string;
  orderType?: string;
  trackingNumber?: string;
  carrier?: string;
};

export type FulfillmentLifecycleIntentKind =
  | 'RELEASE_REMAINING_RESERVATIONS'
  | 'RESET_ON_HOLD_ESCALATIONS'
  | 'TAG_ORDER_OPS_REVIEW';

export type FulfillmentExceptionContext = {
  exceptionType: 'RESERVATION_FAILED' | 'SHIPMENT_RETURNED';
  currentOrderStatus: string;
  currentPaymentStatus?: string;
  orderType?: string;
};

export type FulfillmentExceptionPlan = {
  noOpReason?: 'ALREADY_IN_STATE' | 'TERMINAL_STATE' | 'STATE_CHANGED';
  nextOrderStatus: string;
  intents: readonly FulfillmentLifecycleIntentKind[];
};

export type FulfillmentProgressPlan = {
  noOpReason?: 'ALREADY_IN_STATE' | 'TERMINAL_STATE';
  nextOrderStatus: string;
  nextFulfillmentStatus?: string | null;
  intents: readonly FulfillmentLifecycleIntentKind[];
};

export class FulfillmentLifecycleError extends Error {
  constructor(message: string, public errorCode: string) {
    super(message);
    this.name = 'FulfillmentLifecycleError';
  }
}

export function resolveNextStoreProgressOrderStatus(currentOrderStatus: string): string | null {
  const currentOrderState = currentOrderStatus.toLowerCase();
  if (currentOrderState === 'pending_payment') {
    return 'paid';
  }
  if (currentOrderState === 'paid') {
    return 'processing';
  }
  if (currentOrderState === 'processing') {
    return 'completed';
  }
  return null;
}

export function resolveStoreProgressFulfillmentStatus(
  targetOrderStatus: string,
  hasServiceItems: boolean,
): string | null {
  const nextOrderState = targetOrderStatus.toLowerCase();
  if (nextOrderState === 'processing') {
    return hasServiceItems ? 'service_scheduled' : 'packing';
  }
  if (nextOrderState === 'completed') {
    return hasServiceItems ? 'service_completed' : 'delivered';
  }
  return null;
}

export function buildStoreFulfillmentProgressPlan(context: FulfillmentProgressContext): FulfillmentProgressPlan {
  const {
    currentOrderStatus,
    nextOrderStatus,
    currentPaymentStatus,
    orderType,
    trackingNumber,
    carrier,
  } = context;

  const hasServiceItems = orderType?.toLowerCase() === 'membership_package';
  const hasTrackingInfo = Boolean(trackingNumber && carrier);

  const currentOrderState = currentOrderStatus.toLowerCase();
  const nextOrderState = nextOrderStatus.toLowerCase();
  const currentPaymentState = currentPaymentStatus.toLowerCase();
  const nextFulfillmentStatus = resolveStoreProgressFulfillmentStatus(
    nextOrderState,
    hasServiceItems,
  );

  if (currentOrderState === nextOrderState) {
    return {
      noOpReason: 'ALREADY_IN_STATE',
      nextOrderStatus: currentOrderStatus,
      nextFulfillmentStatus,
      intents: [],
    };
  }

  // Hardening: Ensure payment before completion
  if (nextOrderState === 'completed' && currentPaymentState !== 'paid') {
    throw new FulfillmentLifecycleError(
      'Cannot complete an unpaid order',
      'ORDER_COMPLETE_UNPAID',
    );
  }

  // SHIPPED requires tracking info
  if (nextOrderState === 'shipped' && !hasTrackingInfo) {
    throw new FulfillmentLifecycleError(
      'Tracking number and carrier are required when shipping an order',
      'ORDER_SHIPPED_TRACKING_REQUIRED',
    );
  }

  return {
    nextOrderStatus,
    nextFulfillmentStatus,
    intents: [],
  };
}

export function buildStoreFulfillmentExceptionPlan(context: FulfillmentExceptionContext): FulfillmentExceptionPlan {
  const currentOrderState = context.currentOrderStatus.toLowerCase();
  
  if (context.exceptionType === 'RESERVATION_FAILED') {
    if (currentOrderState === 'on_hold') {
      return {
        nextOrderStatus: 'on_hold',
        intents: [],
        noOpReason: 'ALREADY_IN_STATE',
      };
    }
    if (currentOrderState === 'cancelled' || currentOrderState === 'failed' || currentOrderState.startsWith('refund_')) {
      return {
        nextOrderStatus: currentOrderState,
        intents: [],
        noOpReason: 'TERMINAL_STATE',
      };
    }
    if (currentOrderState !== 'new' && currentOrderState !== 'confirmed' && currentOrderState !== 'pending_payment') {
      return {
        nextOrderStatus: currentOrderState,
        intents: [],
        noOpReason: 'STATE_CHANGED',
      };
    }
    return {
      nextOrderStatus: 'on_hold',
      intents: ['RESET_ON_HOLD_ESCALATIONS', 'TAG_ORDER_OPS_REVIEW'],
    };
  }

  if (context.exceptionType === 'SHIPMENT_RETURNED') {
    if (currentOrderState === 'refund_requested' || currentOrderState === 'refund_approved' || currentOrderState === 'refund_rejected' || currentOrderState === 'refunded') {
      return {
        nextOrderStatus: currentOrderState,
        intents: [],
        noOpReason: 'ALREADY_IN_STATE',
      };
    }
    if (currentOrderState !== 'processing' && currentOrderState !== 'shipped' && currentOrderState !== 'completed') {
      return {
        nextOrderStatus: currentOrderState,
        intents: [],
        noOpReason: 'STATE_CHANGED',
      };
    }
    return {
      nextOrderStatus: 'refund_requested',
      intents: [],
    };
  }

  return {
    nextOrderStatus: context.currentOrderStatus,
    intents: [],
  };
}
