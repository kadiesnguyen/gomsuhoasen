import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { ECOMMERCE_ERROR_CODES } from '@vt/platform-error';
import {
  computeCartSubtotal,
  computeCartItemCount,
  computeStrictCartSubtotal,
  ECOMMERCE_CORE_ERROR_MESSAGES,
} from './cart.contracts';
import {
  FNB_ORDER_SESSION_STATUSES,
  FNB_RESTAURANT_RECORD_STATUSES,
  FNB_RESTAURANT_RESERVATION_STATUSES,
  isFnbOrderSessionStatus,
  isFnbRestaurantRecordStatus,
  isFnbRestaurantReservationStatus,
} from './fnb.contracts';
import {
  LEGACY_MINIAPP_PACKAGE_STATUS,
  isLegacyMiniAppPackageStatus,
} from './miniapp.contracts';
import {
  VITA_FULFILLMENT_STATUSES,
  VITA_ORDER_PAYMENT_STATUSES,
  VITA_ORDER_STATUSES,
  VITA_STORE_PROGRESS_ORDER_STATUS_VALUES,
  ORDER_PAYMENT_FAILED_WEBHOOK_SOURCE_STATUSES,
  ORDER_RESERVATION_FAILED_SOURCE_STATUSES,
  assertOrderTransition,
  isVitaFulfillmentStatus,
  isVitaOrderPaymentStatus,
  isVitaOrderStatus,
  isVitaStoreProgressOrderStatus,
  readVitaFulfillmentStatus,
  readVitaOrderPaymentStatus,
  readVitaOrderStatus,
} from './order-status.contracts';
import {
  BULK_ORDER_ALLOWED_STATUSES,
  ORDER_REFUND_REVIEW_STATUSES,
  REFUND_REVIEW_ALLOWED_STATUSES,
  STAFF_ORDER_MUTABLE_STATUSES,
} from './refund-review.contracts';
import { ELIGIBLE_REVIEW_ORDER_STATUSES } from './review.contracts';
import { ProductQrCodeStatus, ProductQrDisplayProfile } from './product-qr.contracts';
import { SellerConnectionStatus, SellerCloneStatus } from './seller-marketplace.contracts';
import { roundMoney, calculateDiscount, calculateFinalAmount } from './money';

describe('ecommerce-core: cart.contracts', () => {
  function isCartValidationError(
    error: unknown,
    code: string,
    message: string,
  ): boolean {
    const validationError = error as {
      errorCode?: string;
      message?: string;
      getStatus?: () => number;
    };
    return validationError.errorCode === code
      && validationError.message === message
      && validationError.getStatus?.() === 400;
  }

  it('computeCartSubtotal should calculate correct sum of price * quantity', () => {
    const items = [
      { price: 100, quantity: 2 },
      { price: 250, quantity: 1 },
      { price: 50, quantity: 4 },
    ];
    assert.equal(computeCartSubtotal(items), 650);
  });

  it('computeCartSubtotal should handle items with missing price', () => {
    const items = [
      { price: 100, quantity: 2 },
      { quantity: 3 }, // price is undefined, defaults to 0
    ];
    assert.equal(computeCartSubtotal(items), 200);
  });

  it('computeCartItemCount should return correct sum of quantities', () => {
    const items = [
      { quantity: 2 },
      { quantity: 1 },
      { quantity: 5 },
    ];
    assert.equal(computeCartItemCount(items), 8);
  });

  describe('computeStrictCartSubtotal', () => {
    it('should calculate correct sum of price * quantity', () => {
      const items = [
        { price: 100, quantity: 2 },
        { price: 250, quantity: 1 },
        { price: 50, quantity: 4 },
      ];
      assert.equal(computeStrictCartSubtotal(items), 650);
    });

    it('should throw on missing price', () => {
      const items = [
        { price: 100, quantity: 2 },
        { quantity: 3 } as unknown as { price: number; quantity: number },
      ];
      assert.throws(
        () => computeStrictCartSubtotal(items),
        (error: unknown) => isCartValidationError(
          error,
          ECOMMERCE_ERROR_CODES.ORDER_INVALID_NON_NEGATIVE_NUMBER,
          ECOMMERCE_CORE_ERROR_MESSAGES.CART_ITEM_PRICE_INVALID,
        ),
      );
    });

    it('should throw on negative price', () => {
      const items = [
        { price: -100, quantity: 2 },
      ];
      assert.throws(
        () => computeStrictCartSubtotal(items),
        (error: unknown) => isCartValidationError(
          error,
          ECOMMERCE_ERROR_CODES.ORDER_INVALID_NON_NEGATIVE_NUMBER,
          ECOMMERCE_CORE_ERROR_MESSAGES.CART_ITEM_PRICE_INVALID,
        ),
      );
    });

    it('should throw on missing quantity', () => {
      const items = [
        { price: 100 } as unknown as { price: number; quantity: number },
      ];
      assert.throws(
        () => computeStrictCartSubtotal(items),
        (error: unknown) => isCartValidationError(
          error,
          ECOMMERCE_ERROR_CODES.ORDER_INVALID_POSITIVE_INTEGER,
          ECOMMERCE_CORE_ERROR_MESSAGES.CART_ITEM_QUANTITY_INVALID,
        ),
      );
    });

    it('should throw on negative quantity', () => {
      const items = [
        { price: 100, quantity: -2 },
      ];
      assert.throws(
        () => computeStrictCartSubtotal(items),
        (error: unknown) => isCartValidationError(
          error,
          ECOMMERCE_ERROR_CODES.ORDER_INVALID_POSITIVE_INTEGER,
          ECOMMERCE_CORE_ERROR_MESSAGES.CART_ITEM_QUANTITY_INVALID,
        ),
      );
    });

    it('should throw on fractional quantity', () => {
      const items = [
        { price: 100, quantity: 1.5 },
      ];
      assert.throws(
        () => computeStrictCartSubtotal(items),
        (error: unknown) => isCartValidationError(
          error,
          ECOMMERCE_ERROR_CODES.ORDER_INVALID_POSITIVE_INTEGER,
          ECOMMERCE_CORE_ERROR_MESSAGES.CART_ITEM_QUANTITY_INVALID,
        ),
      );
    });
  });
});

describe('ecommerce-core: money', () => {
  it('roundMoney should round correctly with default decimals (0)', () => {
    assert.equal(roundMoney(123.45), 123);
    assert.equal(roundMoney(123.55), 124);
  });

  it('roundMoney should round correctly with specified decimals', () => {
    assert.equal(roundMoney(123.456, 2), 123.46);
    assert.equal(roundMoney(123.454, 2), 123.45);
  });

  it('calculateDiscount should subtract discount and not drop below 0', () => {
    assert.equal(calculateDiscount(100, 30), 70);
    assert.equal(calculateDiscount(100, 150), 0);
  });

  it('calculateFinalAmount should compute subtotal - discount - points + shipping', () => {
    assert.equal(calculateFinalAmount(1000, 100, 50, 20), 930);
    assert.equal(calculateFinalAmount(1000, 1100, 50, 0), 0); // No negative total
  });
});

describe('ecommerce-core: order-status.contracts', () => {
  const transitions = [
    { from: 'pending', to: 'confirmed' },
    { from: 'confirmed', to: 'processing' },
    { from: 'processing', to: 'completed' },
    { from: 'pending', to: 'cancelled' },
    {
      from: 'confirmed',
      to: 'cancelled',
      guard: (ctx: Record<string, any>) => !!ctx.allowCancel,
    },
  ];

  it('assertOrderTransition should succeed on valid transition', () => {
    assert.doesNotThrow(() => {
      assertOrderTransition(transitions, 'pending', 'confirmed');
    });
  });

  it('assertOrderTransition should throw DomainBadRequestException on invalid transition', () => {
    assert.throws(() => {
      assertOrderTransition(transitions, 'pending', 'completed');
    }, /Cannot transition from "pending" to "completed"/);
  });

  it('assertOrderTransition should honor guard condition', () => {
    // Fails because guard returns false when context.allowCancel is not set
    assert.throws(() => {
      assertOrderTransition(transitions, 'confirmed', 'cancelled');
    }, /blocked by guard/);

    // Succeeds when context.allowCancel is true
    assert.doesNotThrow(() => {
      assertOrderTransition(transitions, 'confirmed', 'cancelled', { allowCancel: true });
    });
  });

  it('exposes VITA order/payment/fulfillment status readers and predicates', () => {
    assert.equal(readVitaOrderStatus('paid'), VITA_ORDER_STATUSES.PAID);
    assert.equal(readVitaOrderStatus('unknown'), VITA_ORDER_STATUSES.PENDING_PAYMENT);
    assert.equal(readVitaOrderPaymentStatus('expired'), VITA_ORDER_PAYMENT_STATUSES.EXPIRED);
    assert.equal(readVitaOrderPaymentStatus('unknown'), VITA_ORDER_PAYMENT_STATUSES.PENDING);
    assert.equal(readVitaFulfillmentStatus('service_completed'), VITA_FULFILLMENT_STATUSES.SERVICE_COMPLETED);
    assert.equal(readVitaFulfillmentStatus('unknown'), VITA_FULFILLMENT_STATUSES.NOT_STARTED);
    assert.equal(isVitaOrderStatus(VITA_ORDER_STATUSES.CANCELLED), true);
    assert.equal(isVitaOrderPaymentStatus(VITA_ORDER_PAYMENT_STATUSES.PAID), true);
    assert.equal(isVitaFulfillmentStatus(VITA_FULFILLMENT_STATUSES.DELIVERED), true);
    assert.equal(isVitaStoreProgressOrderStatus(VITA_ORDER_STATUSES.PAID), true);
    assert.equal(isVitaStoreProgressOrderStatus(VITA_ORDER_STATUSES.CANCELLED), false);
    assert.deepEqual(VITA_STORE_PROGRESS_ORDER_STATUS_VALUES, [
      VITA_ORDER_STATUSES.PAID,
      VITA_ORDER_STATUSES.PROCESSING,
      VITA_ORDER_STATUSES.COMPLETED,
    ]);
  });

  it('exposes shared refund review and bulk mutation status arrays for v2 hosts', () => {
    assert.deepEqual(REFUND_REVIEW_ALLOWED_STATUSES, ['APPROVED', 'REJECTED']);
    assert.deepEqual(ORDER_REFUND_REVIEW_STATUSES, ['REFUND_REQUESTED', 'REFUND_APPROVED', 'REFUND_REJECTED']);
    assert.deepEqual(STAFF_ORDER_MUTABLE_STATUSES, ['CONFIRMED', 'PROCESSING', 'SHIPPED', 'COMPLETED', 'CANCELLED', 'ON_HOLD']);
    assert.deepEqual(BULK_ORDER_ALLOWED_STATUSES, ['CONFIRMED', 'CANCELLED']);
  });

  it('exposes shared review eligibility statuses for ecommerce hosts', () => {
    assert.deepEqual(ELIGIBLE_REVIEW_ORDER_STATUSES, ['COMPLETED']);
  });

  it('exposes shared order event source status arrays for host workflows', () => {
    assert.deepEqual(ORDER_PAYMENT_FAILED_WEBHOOK_SOURCE_STATUSES, ['NEW', 'CONFIRMED', 'PROCESSING']);
    assert.deepEqual(ORDER_RESERVATION_FAILED_SOURCE_STATUSES, ['NEW', 'CONFIRMED']);
  });

  it('exposes shared product QR and seller marketplace statuses for ecommerce hosts', () => {
    assert.equal(ProductQrCodeStatus.ACTIVE, 'ACTIVE');
    assert.equal(ProductQrDisplayProfile.WARRANTY, 'WARRANTY');
    assert.equal(SellerConnectionStatus.ACCEPTED, 'ACCEPTED');
    assert.equal(SellerCloneStatus.DISABLED, 'DISABLED');
  });
});

describe('ecommerce-core: fnb and miniapp contracts', () => {
  it('exposes shared FNB reservation, record, and session statuses', () => {
    assert.equal(FNB_RESTAURANT_RESERVATION_STATUSES.PENDING, 'PENDING');
    assert.equal(FNB_RESTAURANT_RECORD_STATUSES.DEFAULT, 'default');
    assert.equal(FNB_ORDER_SESSION_STATUSES.ACTIVE, 'ACTIVE');
    assert.equal(isFnbRestaurantReservationStatus('DONE'), true);
    assert.equal(isFnbRestaurantRecordStatus('inactive'), true);
    assert.equal(isFnbOrderSessionStatus('EXPIRED'), true);
  });

  it('exposes legacy miniapp package statuses', () => {
    assert.equal(LEGACY_MINIAPP_PACKAGE_STATUS.DRAFT, 'DRAFT');
    assert.equal(LEGACY_MINIAPP_PACKAGE_STATUS.REVIEWED, 'REVIEWED');
    assert.equal(isLegacyMiniAppPackageStatus('BUG'), true);
    assert.equal(isLegacyMiniAppPackageStatus('UNKNOWN'), false);
  });
});
