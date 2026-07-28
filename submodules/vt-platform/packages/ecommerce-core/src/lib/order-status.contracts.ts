/**
 * Shared order status contracts and state machine.
 *
 * Canonical status values used across v2 and vita order processing.
 * Each project may add project-specific statuses, but these are the common ones.
 *
 * @source v2: libs/modules/ecommerce/src/lib/schemas/order.schema.ts
 * @source vita: libs/modules/ecommerce/src/order.schema.ts — OrderStatus
 * @source vita: libs/contracts/src/order.contracts.ts — ORDER_STATUS_VALUES
 */

import { DomainBadRequestException } from '@vt/platform-error';
import { LEGACY_ORDER_STATUSES } from './order-status-values';

// ---------------------------------------------------------------------------
// Browser-safe status values
// ---------------------------------------------------------------------------

export {
  type CommonFulfillmentStatus,
  type CommonOrderStatus,
  type CommonPaymentStatus,
  type VitaFulfillmentStatus,
  type VitaOrderPaymentStatus,
  type VitaOrderStatus,
  type VitaStoreProgressOrderStatus,
  FULFILLMENT_STATUS_VALUES,
  ORDER_STATUS_VALUES,
  PAYMENT_STATUS_VALUES,
  VITA_FULFILLMENT_STATUSES,
  VITA_FULFILLMENT_STATUS_VALUES,
  VITA_ORDER_PAYMENT_STATUSES,
  VITA_ORDER_PAYMENT_STATUS_VALUES,
  VITA_ORDER_STATUSES,
  VITA_ORDER_STATUS_VALUES,
  VITA_STORE_PROGRESS_ORDER_STATUS_VALUES,
  REFUND_STATUS_VALUES,
  ORDER_ACTIVE_FULFILLMENT_STATUSES,
  ORDER_PENDING_PAYMENT_STATUSES,
  ORDER_TERMINAL_FAILED_STATUSES,
  ORDER_FULFILLED_STATUSES,
  ORDER_REFUND_POLICY_STATUS_VALUES,
  ORDER_PAYMENT_FAILED_WEBHOOK_SOURCE_STATUSES,
  ORDER_RESERVATION_FAILED_SOURCE_STATUSES,
  ORDER_SOLD_COUNT_STATUSES,
  ORDER_SPLIT_ALLOWED_STATUSES,
  REFUND_PENDING_STATUSES,
  REFUND_COMPLETED_STATUSES,
  type CommonRefundStatus,
  isVitaFulfillmentStatus,
  isVitaOrderPaymentStatus,
  isVitaOrderStatus,
  isVitaStoreProgressOrderStatus,
  readVitaFulfillmentStatus,
  readVitaOrderPaymentStatus,
  readVitaOrderStatus,
  LEGACY_ORDER_STATUSES,
  type LegacyOrderStatus,
  LEGACY_PAYMENT_STATUSES,
  type LegacyPaymentStatus,
} from './order-status-values';

// ---------------------------------------------------------------------------
// State machine
// ---------------------------------------------------------------------------

/**
 * Legacy Order State Machine Transitions (derived from Oracle logic).
 * Defining allowed paths:
 * DRAFT -> PENDING
 * PENDING -> ACCETED | REJECT | CANCELLED
 * ACCETED -> INPROGESS | CANCELLED
 * INPROGESS -> READY_TO_DELIVERY | CANCELLED
 * READY_TO_DELIVERY -> SHIPPING | CANCELLED
 * SHIPPING -> DELIVERED | CANCELLED
 * DELIVERED -> COMPLETED
 */
export const LEGACY_ORDER_TRANSITIONS: readonly IOrderStatusTransition[] = [
  { from: LEGACY_ORDER_STATUSES.DRAFT, to: LEGACY_ORDER_STATUSES.PENDING },
  { from: LEGACY_ORDER_STATUSES.PENDING, to: LEGACY_ORDER_STATUSES.ACCETED },
  { from: LEGACY_ORDER_STATUSES.PENDING, to: LEGACY_ORDER_STATUSES.REJECT },
  { from: LEGACY_ORDER_STATUSES.PENDING, to: LEGACY_ORDER_STATUSES.CANCELLED },

  { from: LEGACY_ORDER_STATUSES.ACCETED, to: LEGACY_ORDER_STATUSES.INPROGESS },
  { from: LEGACY_ORDER_STATUSES.ACCETED, to: LEGACY_ORDER_STATUSES.CANCELLED },

  { from: LEGACY_ORDER_STATUSES.INPROGESS, to: LEGACY_ORDER_STATUSES.READY_TO_DELIVERY },
  { from: LEGACY_ORDER_STATUSES.INPROGESS, to: LEGACY_ORDER_STATUSES.CANCELLED },

  { from: LEGACY_ORDER_STATUSES.READY_TO_DELIVERY, to: LEGACY_ORDER_STATUSES.SHIPPING },
  { from: LEGACY_ORDER_STATUSES.READY_TO_DELIVERY, to: LEGACY_ORDER_STATUSES.CANCELLED },

  { from: LEGACY_ORDER_STATUSES.SHIPPING, to: LEGACY_ORDER_STATUSES.DELIVERED },
  { from: LEGACY_ORDER_STATUSES.SHIPPING, to: LEGACY_ORDER_STATUSES.CANCELLED },

  { from: LEGACY_ORDER_STATUSES.DELIVERED, to: LEGACY_ORDER_STATUSES.COMPLETED },
] as const;

/**
 * Check if transition is valid using the legacy transition table.
 */
export function canTransitionLegacyStatus(currentStatus: string, nextStatus: string): boolean {
  return LEGACY_ORDER_TRANSITIONS.some(t => t.from === currentStatus && t.to === nextStatus);
}

/**
 * A single status transition rule.
 *
 * @example
 * const transitions: IOrderStatusTransition[] = [
 *   { from: 'pending', to: 'confirmed' },
 *   { from: 'confirmed', to: 'processing' },
 *   { from: 'processing', to: 'completed' },
 *   { from: 'pending', to: 'cancelled' },
 * ];
 */
export interface IOrderStatusTransition {
  /** Current status */
  from: string;
  /** Target status */
  to: string;
  /**
   * Optional guard — if provided and returns false, the transition is blocked
   * even when the from→to pair exists.
   */
  guard?: (context: Record<string, unknown>) => boolean;
}

const ECOM_ERROR_CODES = {
  ORDER_INVALID_TRANSITION: 'ECOM.ORDER_INVALID_TRANSITION',
} as const;

/**
 * Assert that a status transition is valid according to the given transition table.
 *
 * @throws DomainBadRequestException when the transition is not allowed.
 *
 * @param transitions - Allowed transitions
 * @param currentStatus - Current status
 * @param nextStatus - Desired next status
 * @param context - Optional context passed to guard functions
 */
export function assertOrderTransition(
  transitions: readonly IOrderStatusTransition[],
  currentStatus: string,
  nextStatus: string,
  context: Record<string, unknown> = {},
): void {
  const match = transitions.find(
    (t) => t.from === currentStatus && t.to === nextStatus,
  );

  if (!match) {
    throw new DomainBadRequestException(
      ECOM_ERROR_CODES.ORDER_INVALID_TRANSITION,
      `Cannot transition from "${currentStatus}" to "${nextStatus}"`,
      { currentStatus, nextStatus },
    );
  }

  if (match.guard && !match.guard(context)) {
    throw new DomainBadRequestException(
      ECOM_ERROR_CODES.ORDER_INVALID_TRANSITION,
      `Transition from "${currentStatus}" to "${nextStatus}" blocked by guard`,
      { currentStatus, nextStatus },
    );
  }
}

/**
 * Common Order State Machine Transitions (V2).
 * Defining allowed paths for system/customer interactions.
 */
export const COMMON_ORDER_TRANSITIONS: readonly IOrderStatusTransition[] = [
  { from: 'NEW', to: 'CONFIRMED' },
  { from: 'NEW', to: 'CANCELLED' },
  { from: 'NEW', to: 'ON_HOLD' },
  { from: 'NEW', to: 'COMPLETED' },

  { from: 'CONFIRMED', to: 'PROCESSING' },
  { from: 'CONFIRMED', to: 'CANCELLED' },
  { from: 'CONFIRMED', to: 'ON_HOLD' },
  { from: 'CONFIRMED', to: 'REFUND_REQUESTED' },
  { from: 'CONFIRMED', to: 'COMPLETED' },

  { from: 'PROCESSING', to: 'SHIPPED' },
  { from: 'PROCESSING', to: 'CANCELLED' },

  // F-007: Allow SHIPPED -> REFUND_REQUESTED
  { from: 'SHIPPED', to: 'COMPLETED' },
  { from: 'SHIPPED', to: 'REFUND_REQUESTED' },

  { from: 'COMPLETED', to: 'REFUND_REQUESTED' },

  { from: 'REFUND_REQUESTED', to: 'REFUND_APPROVED' },
  { from: 'REFUND_REQUESTED', to: 'REFUND_REJECTED' },

  { from: 'ON_HOLD', to: 'CONFIRMED' },
  { from: 'ON_HOLD', to: 'CANCELLED' },
] as const;

/**
 * Common Staff Order State Machine Transitions (V2).
 * Defining allowed paths for admin/staff interactions.
 */
export const COMMON_STAFF_ORDER_TRANSITIONS: readonly IOrderStatusTransition[] = [
  { from: 'NEW', to: 'CONFIRMED' },
  { from: 'NEW', to: 'CANCELLED' },

  { from: 'CONFIRMED', to: 'PROCESSING' },
  { from: 'CONFIRMED', to: 'CANCELLED' },

  { from: 'PROCESSING', to: 'SHIPPED' },
  { from: 'PROCESSING', to: 'CANCELLED' },

  { from: 'SHIPPED', to: 'COMPLETED' },

  { from: 'ON_HOLD', to: 'CONFIRMED' },
  { from: 'ON_HOLD', to: 'CANCELLED' },
] as const;
