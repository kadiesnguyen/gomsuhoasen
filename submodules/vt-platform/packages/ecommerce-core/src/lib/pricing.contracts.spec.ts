import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  ECOMMERCE_CORE_PRICING_ERROR_CODES,
  PRICE_ORDER_ADJUSTMENT_REASONS,
  PRICE_ORDER_ERROR_CODES,
  PriceOrderInvariantError,
  calculateNonNegativeDifference,
  calculateRefundCompensationRatio,
  calculateRemainingRefundableAmount,
  calculateSplitChildDiscount,
  computeCheckoutPricing,
  computeClampedMembershipDiscount,
  computeMembershipDiscount,
  computeOrderPricing,
  priceOrder,
} from './pricing.contracts';

describe('Pricing Contracts', () => {
  describe('application-boundary error codes', () => {
    it('publishes stable codes for adapters that preserve application contracts', () => {
      const readErrorCode = (operation: () => unknown): string | undefined => {
        try {
          operation();
          return undefined;
        } catch (error) {
          return error instanceof Error && 'errorCode' in error
            ? String((error as Error & { errorCode: unknown }).errorCode)
            : undefined;
        }
      };

      assert.equal(
        readErrorCode(() => calculateSplitChildDiscount(0, 0, 1)),
        ECOMMERCE_CORE_PRICING_ERROR_CODES.INVALID_NUMBER,
      );
      assert.equal(
        readErrorCode(() => calculateNonNegativeDifference(1, 2)),
        ECOMMERCE_CORE_PRICING_ERROR_CODES.INVALID_NUMBER,
      );
      assert.equal(
        readErrorCode(() => calculateRemainingRefundableAmount(1, 2)),
        ECOMMERCE_CORE_PRICING_ERROR_CODES.REFUND_AMOUNT_EXCEEDS_BALANCE,
      );
      assert.equal(
        readErrorCode(() => calculateRefundCompensationRatio(0, 1)),
        ECOMMERCE_CORE_PRICING_ERROR_CODES.INVALID_REFUND_AMOUNT,
      );
    });
  });

  describe('computeMembershipDiscount', () => {
    it('rounds membership discount to the nearest thousand like OLD_CODE', () => {
      assert.equal(computeMembershipDiscount(105500, 15), 16000);
      assert.equal(computeMembershipDiscount(104000, 10), 10000);
      assert.equal(computeMembershipDiscount(100000, 0), 0);
    });

    it('preserves OLD_CODE negative draft semantics unless clamped explicitly', () => {
      assert.equal(computeMembershipDiscount(-100000, 10), -10000);
      assert.equal(computeClampedMembershipDiscount(-100000, 10), 0);
    });
  });

  describe('computeOrderPricing', () => {
    it('applies discounts and shipping in OLD_CODE order', () => {
      const result = computeOrderPricing({
        cartTotal: 500000,
        discountVoucher: 50000,
        discountPoint: 20000,
        membership: {
          discountPercent: 10,
        },
        shippingFee: 30000,
      });

      assert.equal(result.discountMembership, 43000);
      assert.equal(result.totalPayment, 417000);
    });

    it('preserves OLD_CODE non-clamped over-discount behavior by default', () => {
      const result = computeOrderPricing({
        cartTotal: 100000,
        discountVoucher: 150000,
        discountPoint: 50000,
        membership: {
          discountPercent: 10,
        },
        shippingFee: 15000,
      });

      assert.equal(result.discountMembership, -10000);
      assert.equal(result.totalPayment, -75000);
    });

    it('clamps at zero when modern flows opt in', () => {
      const result = computeOrderPricing({
        cartTotal: 100000,
        discountVoucher: 150000,
        discountPoint: 50000,
        membership: {
          discountPercent: 10,
        },
        shippingFee: 15000,
        clampDiscounts: true,
      });

      assert.equal(result.discountMembership, 0);
      assert.equal(result.totalPayment, 15000);
    });
  });

  describe('computeCheckoutPricing', () => {
    it('applies Zalomini checkout precedence tier -> voucher -> collected voucher -> loyalty card -> points', () => {
      const result = computeCheckoutPricing({
        cartTotal: 500000,
        discountTier: 50000,
        discountVoucher: 40000,
        discountCollectedVoucher: 10000,
        discountLoyaltyCard: 25000,
        discountPoints: 15000,
        shippingFee: 30000,
      });

      assert.equal(result.discountTier, 50000);
      assert.equal(result.subtotalAfterTier, 450000);
      assert.equal(result.subtotalAfterVoucher, 410000);
      assert.equal(result.subtotalAfterCollectedVoucher, 400000);
      assert.equal(result.subtotalAfterLoyaltyCard, 375000);
      assert.equal(result.subtotalAfterDiscounts, 360000);
      assert.equal(result.totalPayment, 390000);
    });

    it('matches the staged checkout snapshot used by Zalomini createFromCart', () => {
      const result = computeCheckoutPricing({
        cartTotal: 1000,
        discountTier: 100,
        discountVoucher: 100,
        discountCollectedVoucher: 200,
        discountPoints: 50,
        clampDiscounts: true,
      });

      assert.equal(result.discountTier, 100);
      assert.equal(result.subtotalAfterTier, 900);
      assert.equal(result.subtotalAfterVoucher, 800);
      assert.equal(result.subtotalAfterCollectedVoucher, 600);
      assert.equal(result.subtotalAfterLoyaltyCard, 600);
      assert.equal(result.subtotalAfterDiscounts, 550);
      assert.equal(result.totalPayment, 550);
    });

    it('can clamp all checkout discount stages to zero for fail-closed flows', () => {
      const result = computeCheckoutPricing({
        cartTotal: 100000,
        discountTier: 10000,
        discountVoucher: 70000,
        discountCollectedVoucher: 50000,
        discountLoyaltyCard: 30000,
        discountPoints: 10000,
        shippingFee: 15000,
        clampDiscounts: true,
      });

      assert.equal(result.discountTier, 10000);
      assert.equal(result.subtotalAfterTier, 90000);
      assert.equal(result.subtotalAfterVoucher, 20000);
      assert.equal(result.subtotalAfterCollectedVoucher, 0);
      assert.equal(result.subtotalAfterLoyaltyCard, 0);
      assert.equal(result.subtotalAfterDiscounts, 0);
      assert.equal(result.totalPayment, 15000);
    });
  });

  describe('priceOrder golden parity vectors', () => {
    it('prices catalog and price-book snapshots through the full discount and fee sequence', () => {
      const result = priceOrder({
        commandId: 'order-golden-001',
        currency: 'vnd',
        lines: [
          {
            productId: 'product-a',
            quantity: 2,
            catalogUnitPrice: 120000,
            effectiveUnitPrice: 100000,
            priceSource: 'PRICE_BOOK',
          },
          {
            productId: 'product-b',
            quantity: 1,
            catalogUnitPrice: 80000,
            effectiveUnitPrice: 80000,
            priceSource: 'CATALOG',
          },
        ],
        discounts: {
          MEMBERSHIP_TIER: 28000,
          VOUCHER: 20000,
          COLLECTED_VOUCHER: 10000,
          LOYALTY_CARD: 15000,
          POINTS: 7000,
        },
        shippingFee: 30000,
        taxFee: 5000,
        paymentFee: 2000,
      });

      assert.equal(result.currency, 'VND');
      assert.equal(result.catalogSubtotal, 320000);
      assert.equal(result.effectiveSubtotal, 280000);
      assert.equal(result.priceBookAdjustment, -40000);
      assert.deepEqual(
        result.discounts.map((discount) => discount.subtotalAfter),
        [252000, 232000, 222000, 207000, 200000],
      );
      assert.equal(result.discountTotal, 80000);
      assert.equal(result.totalPayment, 237000);
    });

    it('records membership free-shipping and caps discounts with stable reasons', () => {
      const result = priceOrder({
        commandId: 'order-golden-002',
        currency: 'VND',
        lines: [{
          productId: 'product-a',
          quantity: 1,
          catalogUnitPrice: 100000,
          effectiveUnitPrice: 100000,
        }],
        discounts: {
          MEMBERSHIP_TIER: 10000,
          VOUCHER: 120000,
          POINTS: 5000,
        },
        shippingFee: 25000,
        waiveShipping: true,
      });

      assert.equal(result.subtotalAfterDiscounts, 0);
      assert.equal(result.discountTotal, 100000);
      assert.equal(result.discounts[1].requestedAmount, 120000);
      assert.equal(result.discounts[1].appliedAmount, 90000);
      assert.equal(
        result.discounts[1].adjustmentReason,
        PRICE_ORDER_ADJUSTMENT_REASONS.CAPPED_TO_REMAINING_SUBTOTAL,
      );
      assert.equal(result.discounts[4].appliedAmount, 0);
      assert.equal(result.shippingFee, 0);
      assert.equal(result.shippingDiscount, 25000);
      assert.equal(
        result.shippingAdjustmentReason,
        PRICE_ORDER_ADJUSTMENT_REASONS.SHIPPING_WAIVED,
      );
      assert.equal(result.totalPayment, 0);
    });

    it('keeps multi-quantity member vectors stable across price-book deltas and waived shipping', () => {
      const result = priceOrder({
        commandId: 'order-golden-003',
        currency: 'VND',
        lines: [
          {
            productId: 'product-a',
            quantity: 3,
            catalogUnitPrice: 50000,
            effectiveUnitPrice: 45000,
            priceSource: 'PRICE_BOOK',
          },
          {
            productId: 'product-b',
            quantity: 2,
            catalogUnitPrice: 20000,
            effectiveUnitPrice: 20000,
            priceSource: 'CATALOG',
          },
        ],
        discounts: {
          MEMBERSHIP_TIER: 15000,
          VOUCHER: 20000,
          COLLECTED_VOUCHER: 5000,
          POINTS: 10000,
        },
        shippingFee: 20000,
        waiveShipping: true,
      });

      assert.equal(result.catalogSubtotal, 190000);
      assert.equal(result.effectiveSubtotal, 175000);
      assert.equal(result.priceBookAdjustment, -15000);
      assert.deepEqual(
        result.lines.map((line) => line.priceBookAdjustment),
        [-15000, 0],
      );
      assert.deepEqual(
        result.discounts.map((discount) => discount.subtotalAfter),
        [160000, 140000, 135000, 135000, 125000],
      );
      assert.equal(result.shippingFee, 0);
      assert.equal(result.shippingDiscount, 20000);
      assert.equal(result.totalPayment, 125000);
    });

    it('is deterministic for retries with the same command snapshot', () => {
      const command = {
        commandId: 'order-retry-001',
        currency: 'VND',
        lines: [{
          productId: 'product-a',
          quantity: 3,
          catalogUnitPrice: 50000,
          effectiveUnitPrice: 45000,
        }],
        discounts: { VOUCHER: 10000 },
        shippingFee: 15000,
      } as const;

      assert.deepEqual(priceOrder(command), priceOrder(command));
    });

    it('rejects fractional, negative, non-finite, and overflowing money snapshots', () => {
      const baseCommand = {
        commandId: 'order-invalid-001',
        currency: 'VND',
        lines: [{
          productId: 'product-a',
          quantity: 1,
          catalogUnitPrice: 100000,
          effectiveUnitPrice: 100000,
        }],
      };
      const readCode = (operation: () => unknown) => {
        try {
          operation();
          return undefined;
        } catch (error) {
          return error instanceof PriceOrderInvariantError ? error.code : undefined;
        }
      };

      assert.equal(
        readCode(() => priceOrder({
          ...baseCommand,
          lines: [{ ...baseCommand.lines[0], effectiveUnitPrice: 1.5 }],
        })),
        PRICE_ORDER_ERROR_CODES.MONEY_INVALID,
      );
      assert.equal(
        readCode(() => priceOrder({
          ...baseCommand,
          discounts: { POINTS: -1 },
        })),
        PRICE_ORDER_ERROR_CODES.MONEY_INVALID,
      );
      assert.equal(
        readCode(() => priceOrder({
          ...baseCommand,
          shippingFee: Number.NaN,
        })),
        PRICE_ORDER_ERROR_CODES.MONEY_INVALID,
      );
      assert.equal(
        readCode(() => priceOrder({
          ...baseCommand,
          lines: [{
            ...baseCommand.lines[0],
            quantity: Number.MAX_SAFE_INTEGER,
            catalogUnitPrice: 2,
            effectiveUnitPrice: 2,
          }],
        })),
        PRICE_ORDER_ERROR_CODES.MONEY_OVERFLOW,
      );
      assert.equal(
        readCode(() => priceOrder(null as unknown as typeof baseCommand)),
        PRICE_ORDER_ERROR_CODES.COMMAND_INVALID,
      );
      assert.equal(
        readCode(() => priceOrder({
          ...baseCommand,
          lines: [null] as unknown as typeof baseCommand.lines,
        })),
        PRICE_ORDER_ERROR_CODES.LINES_REQUIRED,
      );
      assert.equal(
        readCode(() => priceOrder({
          ...baseCommand,
          waiveShipping: 'yes' as unknown as boolean,
        })),
        PRICE_ORDER_ERROR_CODES.BOOLEAN_INVALID,
      );
    });
  });

  describe('refund/rollback golden parity vectors', () => {
    it('calculates remaining refundable amount preserving OLD_CODE precision', () => {
      assert.equal(calculateRemainingRefundableAmount(100000, 25000), 75000);
      assert.equal(calculateRemainingRefundableAmount(50000, 50000), 0);
    });

    it('calculates refund compensation ratio preserving OLD_CODE rounding', () => {
      assert.equal(calculateRefundCompensationRatio(100000, 25000), 0.25);
      // Tests legacy precision logic where specific rounding behavior is maintained
      assert.equal(calculateRefundCompensationRatio(30000, 10000), 0.3333333333333333);
      assert.equal(calculateRefundCompensationRatio(100000, 100000), 1);
    });

    it('calculates split child discount with correct rollback proportions', () => {
      // originalParentTotal: 100000, parentDiscount: 20000, childTotal: 25000
      // split discount = (25000 / 100000) * 20000 = 5000
      assert.equal(calculateSplitChildDiscount(100000, 20000, 25000), 5000);
      
      // non-integer results are rounded to nearest minor unit natively
      assert.equal(calculateSplitChildDiscount(150000, 25000, 40000), 6667);
    });
  });
});
