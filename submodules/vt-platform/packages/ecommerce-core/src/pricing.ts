/**
 * @vt/ecommerce-core/pricing - Browser-safe checkout pricing helpers.
 *
 * This entrypoint exposes only the pure pricing primitives from
 * `@vt/ecommerce-core`. Unlike the package root, it does NOT import
 * `@vt/platform-error` or NestJS-backed exception helpers, so frontend
 * bundles can reuse the same checkout arithmetic safely.
 */
export {
  type ICheckoutPricingComputationContext,
  type ICheckoutPricingResult,
  type IMembershipDiscountConfig,
  type IPricingComputationContext,
  type IPricingResult,
  type PriceOrderCommand,
  type PriceOrderDiscountKind,
  type PriceOrderDiscountResult,
  type PriceOrderErrorCode,
  type PriceOrderLineResult,
  type PriceOrderLineSnapshot,
  type PriceOrderResult,
  PRICE_ORDER_ADJUSTMENT_REASONS,
  PRICE_ORDER_DISCOUNT_KINDS,
  PRICE_ORDER_ERROR_CODES,
  PriceOrderInvariantError,
  computeCheckoutPricing,
  computeClampedMembershipDiscount,
  computeMembershipDiscount,
  computeOrderPricing,
  priceOrder,
} from './lib/pricing-core';
