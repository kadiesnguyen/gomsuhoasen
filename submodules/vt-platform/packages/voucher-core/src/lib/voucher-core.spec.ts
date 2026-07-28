import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { validateVoucher, validateVoucherRuntime } from './voucher-validation.helper';
import {
  DEFAULT_VOUCHER_STATUS,
  VOUCHER_CONSTANTS,
  VOUCHER_ACTIVE_TIMING_STATUSES,
  VOUCHER_PUBLIC_ERROR_MESSAGES,
  VOUCHER_VALIDATION_MESSAGES,
  VOUCHER_EXPIRED_TIMING_STATUSES,
  VOUCHER_REDEMPTION_STATUSES,
  VOUCHER_STATUSES,
  VOUCHER_TYPES,
  isActiveVoucherStatus,
  isExpiredVoucherStatus,
  isVoucherRedemptionStatus,
  isVoucherStatus,
  isVoucherType,
  readVoucherRedemptionStatus,
  readVoucherStatus,
  readVoucherType,
  voucherInvalidNumericFieldMessage,
  type IVoucher,
} from './voucher.contracts';

const createDummyVoucher = (overrides?: Partial<IVoucher>): IVoucher => ({
  code: 'SUMMER20',
  type: 'percentage',
  value: 20,
  description: 'Summer 20% discount',
  author_member_id: 'member_author_123',
  author_name: 'John Doe',
  status: 'active',
  min_order_amount: 100000,
  turn_per_user: 1,
  current_uses: 0,
  usage_records: [],
  self_use_blocked: true,
  ...overrides,
});

describe('voucher-core: validation helper', () => {
  it('exposes stable voucher type/status readers and predicates', () => {
    assert.equal(DEFAULT_VOUCHER_STATUS, VOUCHER_STATUSES.ACTIVE);
    assert.deepEqual(VOUCHER_ACTIVE_TIMING_STATUSES, [VOUCHER_STATUSES.ACTIVE]);
    assert.deepEqual(VOUCHER_EXPIRED_TIMING_STATUSES, [VOUCHER_STATUSES.EXPIRED]);
    assert.equal(VOUCHER_CONSTANTS.LIMITS.BULK_CREATE_LIMIT, 50);
    assert.equal(VOUCHER_CONSTANTS.PAGINATION.LIMIT_MAX, 100);
    assert.equal(
      VOUCHER_PUBLIC_ERROR_MESSAGES.BULK_CREATE_LIMIT_EXCEEDED,
      'Bulk create limited to 50 vouchers per request',
    );
    assert.equal(VOUCHER_VALIDATION_MESSAGES.BULK_CREATE_MAX_SIZE, 'Maximum 50 vouchers per request');
    assert.equal(voucherInvalidNumericFieldMessage('value'), 'Invalid voucher numeric field: value');
    assert.equal(readVoucherType('shipping'), VOUCHER_TYPES.SHIPPING);
    assert.equal(readVoucherType('unknown'), VOUCHER_TYPES.PERCENTAGE);
    assert.equal(readVoucherStatus('used'), VOUCHER_STATUSES.USED);
    assert.equal(readVoucherStatus('unknown'), VOUCHER_STATUSES.ACTIVE);
    assert.equal(readVoucherRedemptionStatus('cancelled'), VOUCHER_REDEMPTION_STATUSES.CANCELLED);
    assert.equal(readVoucherRedemptionStatus('unknown'), VOUCHER_REDEMPTION_STATUSES.COMPLETED);
    assert.equal(isVoucherType(VOUCHER_TYPES.AMOUNT), true);
    assert.equal(isVoucherStatus(VOUCHER_STATUSES.INELIGIBLE), true);
    assert.equal(isVoucherRedemptionStatus(VOUCHER_REDEMPTION_STATUSES.RESERVED), true);
    assert.equal(isActiveVoucherStatus(VOUCHER_STATUSES.ACTIVE), true);
    assert.equal(isActiveVoucherStatus(VOUCHER_STATUSES.EXPIRED), false);
    assert.equal(isExpiredVoucherStatus(VOUCHER_STATUSES.EXPIRED), true);
  });

  it('should return valid true and correct discount amount for eligible buyer', () => {
    const voucher = createDummyVoucher();
    const result = validateVoucher({
      voucher,
      buyerMemberId: 'buyer_456',
      subtotal: 150000,
    });
    assert.equal(result.valid, true);
    if (result.valid) {
      assert.equal(result.discount_amount, 30000);
      assert.equal(result.voucher.code, 'SUMMER20');
    }
  });

  it('should block self-use when self_use_blocked is true', () => {
    const voucher = createDummyVoucher({ self_use_blocked: true });
    const result = validateVoucher({
      voucher,
      buyerMemberId: 'member_author_123',
      subtotal: 150000,
    });
    assert.equal(result.valid, false);
    if (!result.valid) {
      assert.equal(result.reason, 'self_use_blocked');
    }
  });

  it('should block when voucher status is expired or ineligible', () => {
    const voucher = createDummyVoucher({ status: 'expired' });
    const result = validateVoucher({
      voucher,
      buyerMemberId: 'buyer_456',
      subtotal: 150000,
    });
    assert.equal(result.valid, false);
    if (!result.valid) {
      assert.equal(result.reason, 'expired');
    }
  });

  it('should block when subtotal is below min_order_amount', () => {
    const voucher = createDummyVoucher({ min_order_amount: 200000 });
    const result = validateVoucher({
      voucher,
      buyerMemberId: 'buyer_456',
      subtotal: 150000,
    });
    assert.equal(result.valid, false);
    if (!result.valid) {
      assert.equal(result.reason, 'min_order_not_met');
    }
  });

  it('should block when total_turn limit is reached', () => {
    const voucher = createDummyVoucher({ total_turn: 5, current_uses: 5 });
    const result = validateVoucher({
      voucher,
      buyerMemberId: 'buyer_456',
      subtotal: 150000,
    });
    assert.equal(result.valid, false);
    if (!result.valid) {
      assert.equal(result.reason, 'max_uses_reached');
    }
  });

  it('should block when user limit per voucher is reached', () => {
    const voucher = createDummyVoucher({
      turn_per_user: 1,
      usage_records: [
        {
          redemption_id: 'red_1',
          buyer_member_id: 'buyer_456',
          discount_amount: 20000,
          status: 'completed',
          created_at: new Date(),
        },
      ],
    });
    const result = validateVoucher({
      voucher,
      buyerMemberId: 'buyer_456',
      subtotal: 150000,
    });
    assert.equal(result.valid, false);
    if (!result.valid) {
      assert.equal(result.reason, 'max_uses_reached');
    }
  });

  it('validates runtime fixed vouchers for host services', () => {
    const result = validateVoucherRuntime({
      voucher: {
        code: 'FIXED50',
        status: 'ACTIVE',
        type: 'FIXED',
        value: 50000,
        usedCount: 0,
        usageLimit: -1,
        usageLimitPerCustomer: 1,
        minOrderValue: 100000,
        minQuantity: 1,
      },
      reasons: {
        invalidVoucher: 'INVALID_VOUCHER',
        notStarted: 'NOT_STARTED',
        expired: 'EXPIRED',
        totalLimitReached: 'TOTAL_LIMIT_REACHED',
        userLimitReached: 'USER_LIMIT_REACHED',
        minOrderValueNotMet: 'MIN_ORDER_VALUE_NOT_MET',
        minQuantityNotMet: 'MIN_QUANTITY_NOT_MET',
        notInWhitelist: 'NOT_IN_WHITELIST',
        notNewCustomer: 'NOT_NEW_CUSTOMER',
        scopeMismatch: 'SCOPE_MISMATCH',
      },
      activeStatuses: ['ACTIVE'],
      expiredStatuses: ['EXPIRED'],
      cartSubtotal: 200000,
      partyId: 'party-1',
      userUsageCount: 0,
      hasPriorOrder: false,
    });

    assert.deepEqual(result, { valid: true, discountAmount: 50000 });
  });

  it('caps runtime percent voucher discount by maxDiscount', () => {
    const result = validateVoucherRuntime({
      voucher: {
        code: 'CAP10',
        status: 'ACTIVE',
        type: 'PERCENT',
        value: 10,
        maxDiscount: 30000,
        usedCount: 0,
        usageLimit: -1,
        usageLimitPerCustomer: 1,
        minOrderValue: 0,
        minQuantity: 1,
      },
      reasons: {
        invalidVoucher: 'INVALID_VOUCHER',
        notStarted: 'NOT_STARTED',
        expired: 'EXPIRED',
        totalLimitReached: 'TOTAL_LIMIT_REACHED',
        userLimitReached: 'USER_LIMIT_REACHED',
        minOrderValueNotMet: 'MIN_ORDER_VALUE_NOT_MET',
        minQuantityNotMet: 'MIN_QUANTITY_NOT_MET',
        notInWhitelist: 'NOT_IN_WHITELIST',
        notNewCustomer: 'NOT_NEW_CUSTOMER',
        scopeMismatch: 'SCOPE_MISMATCH',
      },
      activeStatuses: ['ACTIVE'],
      expiredStatuses: ['EXPIRED'],
      cartSubtotal: 400000,
      partyId: 'party-1',
      userUsageCount: 0,
      hasPriorOrder: false,
    });

    assert.deepEqual(result, { valid: true, discountAmount: 30000 });
  });

  it('fails runtime validation when whitelist party is missing', () => {
    const result = validateVoucherRuntime({
      voucher: {
        code: 'WHITE1',
        status: 'ACTIVE',
        type: 'FIXED',
        value: 10000,
        usedCount: 0,
        usageLimit: -1,
        usageLimitPerCustomer: 1,
        minOrderValue: 0,
        minQuantity: 1,
        eligibility: 'WHITELIST',
        whitelistPartyIds: ['party-allowed'],
      },
      reasons: {
        invalidVoucher: 'INVALID_VOUCHER',
        notStarted: 'NOT_STARTED',
        expired: 'EXPIRED',
        totalLimitReached: 'TOTAL_LIMIT_REACHED',
        userLimitReached: 'USER_LIMIT_REACHED',
        minOrderValueNotMet: 'MIN_ORDER_VALUE_NOT_MET',
        minQuantityNotMet: 'MIN_QUANTITY_NOT_MET',
        notInWhitelist: 'NOT_IN_WHITELIST',
        notNewCustomer: 'NOT_NEW_CUSTOMER',
        scopeMismatch: 'SCOPE_MISMATCH',
      },
      activeStatuses: ['ACTIVE'],
      expiredStatuses: ['EXPIRED'],
      cartSubtotal: 400000,
      partyId: 'party-other',
      userUsageCount: 0,
      hasPriorOrder: false,
    });

    assert.deepEqual(result, { valid: false, reason: 'NOT_IN_WHITELIST' });
  });

  it('fails runtime validation when a different voucher is already applied', () => {
    const result = validateVoucherRuntime({
      voucher: {
        code: 'VOUCHER2',
        status: 'ACTIVE',
        type: 'FIXED',
        value: 10000,
        usedCount: 0,
        usageLimit: -1,
        usageLimitPerCustomer: 1,
        minOrderValue: 0,
        minQuantity: 1,
      },
      reasons: {
        invalidVoucher: 'INVALID_VOUCHER',
        inactive: 'INACTIVE',
        notStarted: 'NOT_STARTED',
        expired: 'EXPIRED',
        totalLimitReached: 'TOTAL_LIMIT_REACHED',
        userLimitReached: 'USER_LIMIT_REACHED',
        alreadyApplied: 'ALREADY_APPLIED',
        selfUseBlocked: 'SELF_USE_BLOCKED',
        minOrderValueNotMet: 'MIN_ORDER_VALUE_NOT_MET',
        minQuantityNotMet: 'MIN_QUANTITY_NOT_MET',
        notInWhitelist: 'NOT_IN_WHITELIST',
        notNewCustomer: 'NOT_NEW_CUSTOMER',
        scopeMismatch: 'SCOPE_MISMATCH',
      },
      activeStatuses: ['ACTIVE'],
      expiredStatuses: ['EXPIRED'],
      cartSubtotal: 400000,
      partyId: 'party-1',
      userUsageCount: 0,
      hasPriorOrder: false,
      alreadyAppliedCode: 'VOUCHER1',
    });

    assert.deepEqual(result, { valid: false, reason: 'ALREADY_APPLIED' });
  });

  it('fails runtime validation when self-use is blocked for the voucher author', () => {
    const result = validateVoucherRuntime({
      voucher: {
        code: 'SELFBLOCK',
        status: 'ACTIVE',
        type: 'FIXED',
        value: 10000,
        usedCount: 0,
        usageLimit: -1,
        usageLimitPerCustomer: 1,
        minOrderValue: 0,
        minQuantity: 1,
        selfUseBlocked: true,
        authorId: 'party-1',
      },
      reasons: {
        invalidVoucher: 'INVALID_VOUCHER',
        inactive: 'INACTIVE',
        notStarted: 'NOT_STARTED',
        expired: 'EXPIRED',
        totalLimitReached: 'TOTAL_LIMIT_REACHED',
        userLimitReached: 'USER_LIMIT_REACHED',
        alreadyApplied: 'ALREADY_APPLIED',
        selfUseBlocked: 'SELF_USE_BLOCKED',
        minOrderValueNotMet: 'MIN_ORDER_VALUE_NOT_MET',
        minQuantityNotMet: 'MIN_QUANTITY_NOT_MET',
        notInWhitelist: 'NOT_IN_WHITELIST',
        notNewCustomer: 'NOT_NEW_CUSTOMER',
        scopeMismatch: 'SCOPE_MISMATCH',
      },
      activeStatuses: ['ACTIVE'],
      expiredStatuses: ['EXPIRED'],
      cartSubtotal: 400000,
      partyId: 'party-1',
      userUsageCount: 0,
      hasPriorOrder: false,
    });

    assert.deepEqual(result, { valid: false, reason: 'SELF_USE_BLOCKED' });
  });

  it('fails runtime validation with explicit inactive mapping', () => {
    const result = validateVoucherRuntime({
      voucher: {
        code: 'INACTIVE1',
        status: 'USED',
        type: 'FIXED',
        value: 10000,
        usedCount: 0,
        usageLimit: -1,
        usageLimitPerCustomer: 1,
        minOrderValue: 0,
        minQuantity: 1,
      },
      reasons: {
        invalidVoucher: 'INVALID_VOUCHER',
        inactive: 'INACTIVE',
        notStarted: 'NOT_STARTED',
        expired: 'EXPIRED',
        totalLimitReached: 'TOTAL_LIMIT_REACHED',
        userLimitReached: 'USER_LIMIT_REACHED',
        alreadyApplied: 'ALREADY_APPLIED',
        selfUseBlocked: 'SELF_USE_BLOCKED',
        minOrderValueNotMet: 'MIN_ORDER_VALUE_NOT_MET',
        minQuantityNotMet: 'MIN_QUANTITY_NOT_MET',
        notInWhitelist: 'NOT_IN_WHITELIST',
        notNewCustomer: 'NOT_NEW_CUSTOMER',
        scopeMismatch: 'SCOPE_MISMATCH',
      },
      activeStatuses: ['ACTIVE'],
      expiredStatuses: ['EXPIRED'],
      cartSubtotal: 400000,
      partyId: 'party-1',
      userUsageCount: 0,
      hasPriorOrder: false,
    });

    assert.deepEqual(result, { valid: false, reason: 'INACTIVE' });
  });

  it('fails runtime validation when scoped products do not match the cart', () => {
    const result = validateVoucherRuntime({
      voucher: {
        code: 'PRODONLY',
        status: 'ACTIVE',
        type: 'FIXED',
        value: 10000,
        usedCount: 0,
        usageLimit: -1,
        usageLimitPerCustomer: 1,
        minOrderValue: 0,
        minQuantity: 1,
        applicableTo: 'PRODUCTS',
        productIds: ['prod-1'],
      },
      reasons: {
        invalidVoucher: 'INVALID_VOUCHER',
        notStarted: 'NOT_STARTED',
        expired: 'EXPIRED',
        totalLimitReached: 'TOTAL_LIMIT_REACHED',
        userLimitReached: 'USER_LIMIT_REACHED',
        minOrderValueNotMet: 'MIN_ORDER_VALUE_NOT_MET',
        minQuantityNotMet: 'MIN_QUANTITY_NOT_MET',
        notInWhitelist: 'NOT_IN_WHITELIST',
        notNewCustomer: 'NOT_NEW_CUSTOMER',
        scopeMismatch: 'SCOPE_MISMATCH',
      },
      activeStatuses: ['ACTIVE'],
      expiredStatuses: ['EXPIRED'],
      cartSubtotal: 400000,
      partyId: 'party-1',
      userUsageCount: 0,
      hasPriorOrder: false,
      items: [{ productId: 'prod-9', quantity: 1 }],
    });

    assert.deepEqual(result, { valid: false, reason: 'SCOPE_MISMATCH' });
  });

  it('fails runtime validation when min quantity is not met', () => {
    const result = validateVoucherRuntime({
      voucher: {
        code: 'QTY2',
        status: 'ACTIVE',
        type: 'FIXED',
        value: 10000,
        usedCount: 0,
        usageLimit: -1,
        usageLimitPerCustomer: 1,
        minOrderValue: 0,
        minQuantity: 2,
      },
      reasons: {
        invalidVoucher: 'INVALID_VOUCHER',
        notStarted: 'NOT_STARTED',
        expired: 'EXPIRED',
        totalLimitReached: 'TOTAL_LIMIT_REACHED',
        userLimitReached: 'USER_LIMIT_REACHED',
        minOrderValueNotMet: 'MIN_ORDER_VALUE_NOT_MET',
        minQuantityNotMet: 'MIN_QUANTITY_NOT_MET',
        notInWhitelist: 'NOT_IN_WHITELIST',
        notNewCustomer: 'NOT_NEW_CUSTOMER',
        scopeMismatch: 'SCOPE_MISMATCH',
      },
      activeStatuses: ['ACTIVE'],
      expiredStatuses: ['EXPIRED'],
      cartSubtotal: 400000,
      partyId: 'party-1',
      userUsageCount: 0,
      hasPriorOrder: false,
      items: [{ productId: 'prod-1', quantity: 1 }],
    });

    assert.deepEqual(result, { valid: false, reason: 'MIN_QUANTITY_NOT_MET' });
  });
});
