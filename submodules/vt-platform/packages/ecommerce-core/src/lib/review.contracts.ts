/**
 * Shared review eligibility contracts for ecommerce hosts.
 */

export const ELIGIBLE_REVIEW_ORDER_STATUSES = [
  'COMPLETED',
] as const;

export type EligibleReviewOrderStatus = (typeof ELIGIBLE_REVIEW_ORDER_STATUSES)[number];
