/**
 * @vt/ecommerce-core — Shared ecommerce primitives.
 *
 * Cross-project cart, order, and money helpers extracted from v2 and vita.
 * Projects extend these interfaces with domain-specific fields.
 */

export {
  type ICartItem,
  type ICart,
  type ICartSnapshot,
  type ICheckoutDraft,
  type IOrderInput,
  ECOMMERCE_CORE_ERROR_MESSAGES,
  computeCartSubtotal,
  computeCartItemCount,
  computeStrictCartSubtotal,
} from './lib/cart.contracts';
export {
  type CommonOrderStatus,
  type CommonPaymentStatus,
  type CommonFulfillmentStatus,
  type VitaFulfillmentStatus,
  type VitaOrderPaymentStatus,
  type VitaOrderStatus,
  type VitaStoreProgressOrderStatus,
  type IOrderStatusTransition,
  ORDER_STATUS_VALUES,
  PAYMENT_STATUS_VALUES,
  FULFILLMENT_STATUS_VALUES,
  VITA_FULFILLMENT_STATUSES,
  VITA_FULFILLMENT_STATUS_VALUES,
  VITA_ORDER_PAYMENT_STATUSES,
  VITA_ORDER_PAYMENT_STATUS_VALUES,
  VITA_ORDER_STATUSES,
  VITA_ORDER_STATUS_VALUES,
  VITA_STORE_PROGRESS_ORDER_STATUS_VALUES,
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
  REFUND_STATUS_VALUES,
  type CommonRefundStatus,
  assertOrderTransition,
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
  LEGACY_ORDER_TRANSITIONS,
  canTransitionLegacyStatus,
  COMMON_ORDER_TRANSITIONS,
  COMMON_STAFF_ORDER_TRANSITIONS,
} from './lib/order-status.contracts';
export { roundMoney, calculateDiscount, calculateFinalAmount } from './lib/money';
export {
  ECOMMERCE_CORE_PRICING_ERROR_CODES,
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
  calculateRefundCompensationRatio,
  calculateRemainingRefundableAmount,
  calculateSplitChildDiscount,
  calculateNonNegativeDifference,
  calculateMembershipUpgradePricing,
} from './lib/pricing.contracts';
export {
  type FnbOrderSessionStatus,
  type FnbRestaurantRecordStatus,
  type FnbRestaurantReservationStatus,
  FNB_ORDER_SESSION_STATUSES,
  FNB_ORDER_SESSION_STATUS_VALUES,
  FNB_RESTAURANT_RECORD_STATUSES,
  FNB_RESTAURANT_RECORD_STATUS_VALUES,
  FNB_RESTAURANT_RESERVATION_STATUSES,
  FNB_RESTAURANT_RESERVATION_STATUS_VALUES,
  isFnbOrderSessionStatus,
  isFnbRestaurantRecordStatus,
  isFnbRestaurantReservationStatus,
} from './lib/fnb.contracts';
export * from './lib/order-lifecycle.contracts';
export * from './lib/order-lifecycle-core';
export {
  type LegacyMiniAppPackageStatus,
  LEGACY_MINIAPP_PACKAGE_STATUS,
  LEGACY_MINIAPP_PACKAGE_STATUS_VALUES,
  isLegacyMiniAppPackageStatus,
} from './lib/miniapp.contracts';
export {
  calculateComboTurnRemainingTurns,
  calculateComboTurnTotalTurns,
  calculateEffectiveComboTurnPurchasedQuantity,
  COMBO_TURN_ELIGIBLE_ORDER_STATUS_VALUES,
  ComboTurnStatus,
  type ComboTurnEligibleOrderStatus,
  COMBO_TURN_STATUS_VALUES,
  ComboTurnUsageSessionSource,
  COMBO_TURN_USAGE_SESSION_SOURCE_VALUES,
  ComboTurnUsageSessionStatus,
  COMBO_TURN_USAGE_SESSION_STATUS_VALUES,
  isComboTurnEligibleOrderStatus,
  isComboTurnUsageSessionStatus,
  resolveNextComboTurnSequence,
} from './lib/combo-turn.contracts';
export {
  QrCampaignStatus,
  QR_CAMPAIGN_MUTABLE_STATUSES,
  QR_CAMPAIGN_STATUS_VALUES,
  QrCampaignType,
  QR_CAMPAIGN_TYPE_VALUES,
  QrCampaignRewardType,
  QR_CAMPAIGN_REWARD_TYPE_VALUES,
  QrCampaignCodeStatus,
  QR_CAMPAIGN_CODE_STATUS_VALUES,
  QrCampaignTurnStatus,
  QR_CAMPAIGN_TURN_STATUS_VALUES,
} from './lib/qr-campaign.contracts';
export {
  ELIGIBLE_REVIEW_ORDER_STATUSES,
  type EligibleReviewOrderStatus,
} from './lib/review.contracts';
export {
  ProductQrCodeStatus,
  ProductQrDisplayProfile,
} from './lib/product-qr.contracts';
export {
  BULK_ORDER_ALLOWED_STATUSES,
  ORDER_REFUND_REVIEW_STATUSES,
  REFUND_REVIEW_ALLOWED_STATUSES,
  STAFF_ORDER_MUTABLE_STATUSES,
  type BulkOrderAllowedStatus,
  type OrderRefundReviewStatus,
  type RefundReviewAllowedStatus,
  type StaffOrderMutableStatus,
} from './lib/refund-review.contracts';
export {
  SellerConnectionStatus,
  SellerCloneStatus,
} from './lib/seller-marketplace.contracts';

export * from './lib/order-split.contracts';
export * from './lib/order-split-core';
export * from './lib/order-payload-builders';
export * from './lib/fulfillment-lifecycle-core';
