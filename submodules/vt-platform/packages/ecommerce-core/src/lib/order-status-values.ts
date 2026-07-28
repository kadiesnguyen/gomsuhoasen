/**
 * Shared order status values and readers.
 *
 * This file is browser-safe and intentionally has no backend exception imports.
 */

// ---------------------------------------------------------------------------
// Legacy/Oracle (OLD_CODE) Order Statuses
// ---------------------------------------------------------------------------

export const LEGACY_ORDER_STATUSES = {
  PENDING: 'PENDING',
  ACCETED: 'ACCETED', // Typo kept from OLD_CODE
  INPROGESS: 'INPROGESS',
  READY_TO_DELIVERY: 'READY_TO_DELIVERY',
  COMPLETED: 'COMPLETED',
  SHIPPING: 'SHIPPING',
  DELIVERED: 'DELIVERED',
  CANCELLED: 'CANCELLED',
  REJECT: 'REJECT',
  DRAFT: 'DRAFT',
} as const;

export type LegacyOrderStatus = (typeof LEGACY_ORDER_STATUSES)[keyof typeof LEGACY_ORDER_STATUSES];

export const LEGACY_PAYMENT_STATUSES = {
  PAID: 'PAID',
  UNPAID: 'UNPAID',
} as const;

export type LegacyPaymentStatus = (typeof LEGACY_PAYMENT_STATUSES)[keyof typeof LEGACY_PAYMENT_STATUSES];

// ---------------------------------------------------------------------------
// Modern Order Statuses
// ---------------------------------------------------------------------------
/** Common order lifecycle statuses shared across all projects. */
export type CommonOrderStatus =
  | 'pending'
  | 'confirmed'
  | 'processing'
  | 'completed'
  | 'cancelled';

export const ORDER_STATUS_VALUES: readonly CommonOrderStatus[] = [
  'pending',
  'confirmed',
  'processing',
  'completed',
  'cancelled',
] as const;

/** Common payment lifecycle statuses. */
export type CommonPaymentStatus =
  | 'unpaid'
  | 'paid'
  | 'refunded'
  | 'partially_refunded';

export const PAYMENT_STATUS_VALUES: readonly CommonPaymentStatus[] = [
  'unpaid',
  'paid',
  'refunded',
  'partially_refunded',
] as const;

/** Common refund lifecycle statuses. */
export type CommonRefundStatus =
  | 'pending'
  | 'requested'
  | 'approved'
  | 'rejected'
  | 'completed';

export const REFUND_STATUS_VALUES: readonly CommonRefundStatus[] = [
  'pending',
  'requested',
  'approved',
  'rejected',
  'completed',
] as const;

// Status grouping arrays for querying and condition checks
export const ORDER_ACTIVE_FULFILLMENT_STATUSES = ['confirmed', 'processing', 'shipped'] as const;
export const ORDER_PENDING_PAYMENT_STATUSES = ['new', 'confirmed'] as const;
export const ORDER_TERMINAL_FAILED_STATUSES = ['cancelled', 'failed', 'refund_rejected'] as const;
export const ORDER_FULFILLED_STATUSES = ['shipped', 'completed'] as const;
export const ORDER_REFUND_POLICY_STATUS_VALUES = ['confirmed', 'shipped', 'completed'] as const;
export const ORDER_PAYMENT_FAILED_WEBHOOK_SOURCE_STATUSES = ['NEW', 'CONFIRMED', 'PROCESSING'] as const;
export const ORDER_RESERVATION_FAILED_SOURCE_STATUSES = ['NEW', 'CONFIRMED'] as const;

export const ORDER_SOLD_COUNT_STATUSES = ['confirmed', 'processing', 'shipped', 'completed'] as const;
export const ORDER_SPLIT_ALLOWED_STATUSES = ['new', 'confirmed', 'processing'] as const;

export const REFUND_PENDING_STATUSES = ['requested', 'pending'] as const;
export const REFUND_COMPLETED_STATUSES = ['approved', 'completed'] as const;

/** Common fulfillment lifecycle statuses. */
export type CommonFulfillmentStatus =
  | 'unfulfilled'
  | 'fulfilled'
  | 'partially_fulfilled';

export const FULFILLMENT_STATUS_VALUES: readonly CommonFulfillmentStatus[] = [
  'unfulfilled',
  'fulfilled',
  'partially_fulfilled',
] as const;

export const VITA_ORDER_STATUSES = {
  DRAFT: 'draft',
  PENDING_PAYMENT: 'pending_payment',
  PAID: 'paid',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
} as const;

export type VitaOrderStatus = (typeof VITA_ORDER_STATUSES)[keyof typeof VITA_ORDER_STATUSES];
export const VITA_ORDER_STATUS_VALUES = Object.values(VITA_ORDER_STATUSES);

export const VITA_STORE_PROGRESS_ORDER_STATUS_VALUES = [
  VITA_ORDER_STATUSES.PAID,
  VITA_ORDER_STATUSES.PROCESSING,
  VITA_ORDER_STATUSES.COMPLETED,
] as const;

export type VitaStoreProgressOrderStatus = (typeof VITA_STORE_PROGRESS_ORDER_STATUS_VALUES)[number];

export const VITA_ORDER_PAYMENT_STATUSES = {
  PENDING: 'pending',
  PAID: 'paid',
  FAILED: 'failed',
  EXPIRED: 'expired',
  CANCELLED: 'cancelled',
} as const;

export type VitaOrderPaymentStatus =
  (typeof VITA_ORDER_PAYMENT_STATUSES)[keyof typeof VITA_ORDER_PAYMENT_STATUSES];
export const VITA_ORDER_PAYMENT_STATUS_VALUES = Object.values(VITA_ORDER_PAYMENT_STATUSES);

export const VITA_FULFILLMENT_STATUSES = {
  NOT_STARTED: 'not_started',
  PACKING: 'packing',
  SHIPPING: 'shipping',
  DELIVERED: 'delivered',
  SERVICE_SCHEDULED: 'service_scheduled',
  SERVICE_COMPLETED: 'service_completed',
  CANCELLED: 'cancelled',
} as const;

export type VitaFulfillmentStatus =
  (typeof VITA_FULFILLMENT_STATUSES)[keyof typeof VITA_FULFILLMENT_STATUSES];
export const VITA_FULFILLMENT_STATUS_VALUES = Object.values(VITA_FULFILLMENT_STATUSES);

export function isVitaOrderStatus(input: unknown): input is VitaOrderStatus {
  return typeof input === 'string' && VITA_ORDER_STATUS_VALUES.includes(input as VitaOrderStatus);
}

export function readVitaOrderStatus(
  input: unknown,
  fallback: VitaOrderStatus = VITA_ORDER_STATUSES.PENDING_PAYMENT,
): VitaOrderStatus {
  return isVitaOrderStatus(input) ? input : fallback;
}

export function isVitaStoreProgressOrderStatus(input: unknown): input is VitaStoreProgressOrderStatus {
  return typeof input === 'string'
    && VITA_STORE_PROGRESS_ORDER_STATUS_VALUES.includes(input as VitaStoreProgressOrderStatus);
}

export function isVitaOrderPaymentStatus(input: unknown): input is VitaOrderPaymentStatus {
  return typeof input === 'string'
    && VITA_ORDER_PAYMENT_STATUS_VALUES.includes(input as VitaOrderPaymentStatus);
}

export function readVitaOrderPaymentStatus(
  input: unknown,
  fallback: VitaOrderPaymentStatus = VITA_ORDER_PAYMENT_STATUSES.PENDING,
): VitaOrderPaymentStatus {
  return isVitaOrderPaymentStatus(input) ? input : fallback;
}

export function isVitaFulfillmentStatus(input: unknown): input is VitaFulfillmentStatus {
  return typeof input === 'string'
    && VITA_FULFILLMENT_STATUS_VALUES.includes(input as VitaFulfillmentStatus);
}

export function readVitaFulfillmentStatus(
  input: unknown,
  fallback: VitaFulfillmentStatus = VITA_FULFILLMENT_STATUSES.NOT_STARTED,
): VitaFulfillmentStatus {
  return isVitaFulfillmentStatus(input) ? input : fallback;
}
