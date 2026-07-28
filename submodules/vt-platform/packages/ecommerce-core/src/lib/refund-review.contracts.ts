/**
 * Shared v2 refund-review and staff-mutation status contracts.
 *
 * These arrays stay browser-safe and framework-free so host DTOs, services,
 * and review tooling can consume the same status source of truth.
 */

export const REFUND_REVIEW_ALLOWED_STATUSES = [
  'APPROVED',
  'REJECTED',
] as const;

export type RefundReviewAllowedStatus = (typeof REFUND_REVIEW_ALLOWED_STATUSES)[number];

export const ORDER_REFUND_REVIEW_STATUSES = [
  'REFUND_REQUESTED',
  'REFUND_APPROVED',
  'REFUND_REJECTED',
] as const;

export type OrderRefundReviewStatus = (typeof ORDER_REFUND_REVIEW_STATUSES)[number];

export const STAFF_ORDER_MUTABLE_STATUSES = [
  'CONFIRMED',
  'PROCESSING',
  'SHIPPED',
  'COMPLETED',
  'CANCELLED',
  'ON_HOLD',
] as const;

export type StaffOrderMutableStatus = (typeof STAFF_ORDER_MUTABLE_STATUSES)[number];

export const BULK_ORDER_ALLOWED_STATUSES = [
  'CONFIRMED',
  'CANCELLED',
] as const;

export type BulkOrderAllowedStatus = (typeof BULK_ORDER_ALLOWED_STATUSES)[number];
