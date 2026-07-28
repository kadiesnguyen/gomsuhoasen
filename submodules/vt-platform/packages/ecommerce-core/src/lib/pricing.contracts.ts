import { DomainBadRequestException } from '@vt/platform-error';
import { ECOMMERCE_CORE_ERROR_MESSAGES } from './cart.contracts';

export const ECOMMERCE_CORE_PRICING_ERROR_CODES = {
  INVALID_NUMBER: 'ECOM.CORE.INVALID_NUMBER',
  INVALID_REFUND_AMOUNT: 'ECOM.CORE.INVALID_REFUND_AMOUNT',
  REFUND_AMOUNT_EXCEEDS_BALANCE: 'ECOM.CORE.REFUND_AMOUNT_EXCEEDS_BALANCE',
} as const;

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
} from './pricing-core';

export const calculateRefundCompensationRatio = (
  orderAmount: number,
  refundAmount: number,
): number => {
  if (refundAmount === 0) {
    return 0;
  }
  if (orderAmount === 0) {
    throw new DomainBadRequestException(
      ECOMMERCE_CORE_PRICING_ERROR_CODES.INVALID_REFUND_AMOUNT,
      ECOMMERCE_CORE_ERROR_MESSAGES.INVALID_NUMBER,
      { fieldName: 'refundAmount' },
    );
  }
  return Math.min(1, refundAmount / orderAmount);
};

export const calculateRemainingRefundableAmount = (
  refundableOrderAmount: number,
  settledAmount: number,
): number => {
  if (settledAmount > refundableOrderAmount) {
    throw new DomainBadRequestException(
      ECOMMERCE_CORE_PRICING_ERROR_CODES.REFUND_AMOUNT_EXCEEDS_BALANCE,
      ECOMMERCE_CORE_ERROR_MESSAGES.INVALID_NUMBER,
      { refundableOrderAmount, settledAmount },
    );
  }
  return refundableOrderAmount - settledAmount;
};

export const calculateSplitChildDiscount = (
  originalParentTotal: number,
  parentDiscount: number,
  childTotal: number,
): number => {
  if (originalParentTotal === 0) {
    if (childTotal === 0 && parentDiscount === 0) {
      return 0;
    }
    throw new DomainBadRequestException(
      ECOMMERCE_CORE_PRICING_ERROR_CODES.INVALID_NUMBER,
      ECOMMERCE_CORE_ERROR_MESSAGES.INVALID_NUMBER,
      { fieldName: 'totalAmount' },
    );
  }
  return Math.round((childTotal / originalParentTotal) * parentDiscount);
};

export const calculateNonNegativeDifference = (
  amount: number,
  subtractAmount: number,
): number => {
  const result = amount - subtractAmount;
  if (result < 0) {
    throw new DomainBadRequestException(
      ECOMMERCE_CORE_PRICING_ERROR_CODES.INVALID_NUMBER,
      ECOMMERCE_CORE_ERROR_MESSAGES.INVALID_NUMBER,
      { amount, subtractAmount },
    );
  }
  return result;
};

export const calculateMembershipUpgradePricing = (
  packagePrice: number,
  availableUpgradeCredit: number,
): { appliedUpgradeCredit: number; amountDue: number } => {
  if (availableUpgradeCredit >= packagePrice) {
    return { appliedUpgradeCredit: packagePrice, amountDue: 0 };
  }
  return {
    appliedUpgradeCredit: availableUpgradeCredit,
    amountDue: packagePrice - availableUpgradeCredit,
  };
};
