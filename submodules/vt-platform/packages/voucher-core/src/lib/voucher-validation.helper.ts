import {
  evaluateVoucherCheckoutRule,
  evaluateVoucherTimingRule,
  evaluateVoucherUsageRule,
  normalizeVoucherRedemptionState,
  toVitaVoucherRuleFailureReason,
  VoucherRedemptionLifecycleState,
  VoucherRuleFailureReason,
} from '@vt/domain-recipes';
import {
  VOUCHER_STATUSES,
  type IVoucher,
  type VoucherInvalidReason,
  type VoucherValidationResult,
} from './voucher.contracts';

function toVitaReason(reason: VoucherRuleFailureReason | null): VoucherInvalidReason | null {
  return toVitaVoucherRuleFailureReason(reason) as VoucherInvalidReason | null;
}

export function validateVoucher(input: {
  voucher: IVoucher;
  buyerMemberId: string;
  subtotal: number;
  alreadyAppliedCode?: string;
}): VoucherValidationResult {
  const reason = getVoucherInvalidReason(input);
  if (reason) {
    return { valid: false, reason };
  }

  const discountAmount = Math.floor((input.subtotal * input.voucher.value) / 100);
  return {
    valid: true,
    voucher: input.voucher,
    discount_amount: Math.max(0, discountAmount),
  };
}

export function getVoucherInvalidReason(input: {
  voucher: IVoucher;
  buyerMemberId: string;
  subtotal: number;
  alreadyAppliedCode?: string;
}): VoucherInvalidReason | null {
  const { voucher, buyerMemberId, subtotal, alreadyAppliedCode } = input;

  const alreadyApplied = toVitaReason(
    evaluateVoucherCheckoutRule({
      currentCode: voucher.code,
      alreadyAppliedCode,
    })
  );
  if (alreadyApplied) return alreadyApplied;

  const timing = toVitaReason(
    evaluateVoucherTimingRule({
      status: voucher.status,
      activeStatuses: [VOUCHER_STATUSES.ACTIVE],
      expiredStatuses: [VOUCHER_STATUSES.EXPIRED],
      startAt: voucher.start_at,
      expiresAt: voucher.expires_at,
    })
  );
  if (timing) return timing;

  const totalTurn = voucher.total_turn;
  const totalUsage = toVitaReason(
    evaluateVoucherUsageRule({
      totalLimit: totalTurn && totalTurn > 0 ? totalTurn : null,
      usedCount: voucher.current_uses,
      totalLimitReason: VoucherRuleFailureReason.MAX_USES_REACHED,
    })
  );
  if (totalUsage) return totalUsage;

  const selfUse = toVitaReason(
    evaluateVoucherCheckoutRule({
      selfUseBlocked: voucher.self_use_blocked,
      buyerId: buyerMemberId,
      authorId: voucher.author_member_id,
    })
  );
  if (selfUse) return selfUse;

  const usedByBuyer = voucher.usage_records.filter(
    (r) =>
      r.buyer_member_id === buyerMemberId &&
      normalizeVoucherRedemptionState(r.status) === VoucherRedemptionLifecycleState.REDEEMED
  ).length;

  const perUserUsage = toVitaReason(
    evaluateVoucherUsageRule({
      perUserLimit: voucher.turn_per_user,
      userUsedCount: usedByBuyer,
      perUserLimitReason: VoucherRuleFailureReason.MAX_USES_REACHED,
    })
  );
  if (perUserUsage) return perUserUsage;

  const minOrder = toVitaReason(
    evaluateVoucherCheckoutRule({
      minOrderAmount: voucher.min_order_amount,
      subtotal,
      minOrderReason: VoucherRuleFailureReason.MIN_ORDER_NOT_MET,
    })
  );
  if (minOrder) return minOrder;

  return null;
}

export type VoucherRuntimeValidationReasonMap = {
  invalidVoucher: string;
  inactive?: string;
  notStarted: string;
  expired: string;
  totalLimitReached: string;
  userLimitReached: string;
  alreadyApplied?: string;
  selfUseBlocked?: string;
  minOrderValueNotMet: string;
  minQuantityNotMet: string;
  notInWhitelist: string;
  notNewCustomer: string;
  scopeMismatch: string;
};

export type VoucherRuntimeCartItem = {
  productId?: string;
  categoryId?: string;
  quantity?: number;
};

export type VoucherRuntimeSnapshot = {
  code: string;
  status: string;
  startAt?: Date | string | null;
  endAt?: Date | string | null;
  usageLimit?: number | null;
  usedCount: number;
  usageLimitPerCustomer?: number | null;
  minOrderValue?: number | null;
  minQuantity?: number | null;
  eligibility?: string | null;
  whitelistPartyIds?: string[];
  applicableTo?: string | null;
  productIds?: string[];
  categoryIds?: string[];
  selfUseBlocked?: boolean | null;
  authorId?: string | null;
  type: string;
  value: number;
  maxDiscount?: number | null;
  buyX?: number | null;
  getY?: number | null;
};

export type VoucherRuntimeValidationInput = {
  voucher: VoucherRuntimeSnapshot;
  reasons: VoucherRuntimeValidationReasonMap;
  activeStatuses: readonly string[];
  expiredStatuses: readonly string[];
  cartSubtotal: number;
  shippingCost?: number;
  partyId: string;
  userUsageCount: number;
  hasPriorOrder: boolean;
  alreadyAppliedCode?: string | null;
  items?: VoucherRuntimeCartItem[];
  now?: Date | string;
};

export type VoucherRuntimeValidationResult =
  | { valid: true; discountAmount: number }
  | { valid: false; reason: string };

function mapRuntimeFailureReason(
  reason: VoucherRuleFailureReason | null,
  reasons: VoucherRuntimeValidationReasonMap,
): string | null {
  switch (reason) {
    case VoucherRuleFailureReason.INACTIVE:
      return reasons.inactive ?? reasons.invalidVoucher;
    case VoucherRuleFailureReason.NOT_STARTED:
      return reasons.notStarted;
    case VoucherRuleFailureReason.EXPIRED:
      return reasons.expired;
    case VoucherRuleFailureReason.TOTAL_LIMIT_REACHED:
      return reasons.totalLimitReached;
    case VoucherRuleFailureReason.USER_LIMIT_REACHED:
      return reasons.userLimitReached;
    case VoucherRuleFailureReason.ALREADY_APPLIED:
      return reasons.alreadyApplied ?? reasons.invalidVoucher;
    case VoucherRuleFailureReason.SELF_USE_BLOCKED:
      return reasons.selfUseBlocked ?? reasons.invalidVoucher;
    case VoucherRuleFailureReason.MIN_ORDER_VALUE_NOT_MET:
    case VoucherRuleFailureReason.MIN_ORDER_NOT_MET:
      return reasons.minOrderValueNotMet;
    default:
      return reason ? reasons.invalidVoucher : null;
  }
}

function normalizeRuntimeId(value: string | undefined): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function normalizeRuntimeIdSet(values: string[] | undefined): Set<string> {
  return new Set(
    (values ?? [])
      .map((value) => normalizeRuntimeId(value))
      .filter((value): value is string => value !== null),
  );
}

function sumVoucherCartQuantities(items: VoucherRuntimeCartItem[] | undefined): number {
  if (!Array.isArray(items)) {
    return 0;
  }

  return items.reduce((sum, item) => (
    typeof item.quantity === 'number' && Number.isFinite(item.quantity) && item.quantity > 0
      ? sum + item.quantity
      : sum
  ), 0);
}

function calculateVoucherRuntimeDiscount(input: VoucherRuntimeValidationInput): number {
  const { voucher, cartSubtotal, shippingCost, items } = input;

  if (voucher.type === 'FIXED') {
    return voucher.value;
  }

  if (voucher.type === 'PERCENT') {
    const uncappedDiscount = (cartSubtotal * voucher.value) / 100;
    if (typeof voucher.maxDiscount === 'number' && Number.isFinite(voucher.maxDiscount) && uncappedDiscount > voucher.maxDiscount) {
      return voucher.maxDiscount;
    }
    return uncappedDiscount;
  }

  if (voucher.type === 'FREE_SHIPPING') {
    return shippingCost ?? 0;
  }

  if (voucher.type === 'BOGO' || voucher.type === 'BUY_X_GET_Y') {
    const buyX = typeof voucher.buyX === 'number' ? voucher.buyX : 0;
    const getY = typeof voucher.getY === 'number' ? voucher.getY : 0;
    const totalQty = sumVoucherCartQuantities(items);

    if (buyX <= 0 || getY <= 0 || totalQty < buyX + getY || totalQty <= 0) {
      return 0;
    }

    const timesApplicable = Math.floor(totalQty / (buyX + getY));
    const averagePrice = cartSubtotal / totalQty;
    return timesApplicable * getY * averagePrice;
  }

  return 0;
}

export function validateVoucherRuntime(input: VoucherRuntimeValidationInput): VoucherRuntimeValidationResult {
  const {
    voucher,
    reasons,
    activeStatuses,
    expiredStatuses,
    cartSubtotal,
    partyId,
    userUsageCount,
    hasPriorOrder,
    alreadyAppliedCode,
    items,
  } = input;

  const timingFailure = mapRuntimeFailureReason(
    evaluateVoucherTimingRule({
      now: input.now ?? new Date(),
      status: voucher.status,
      activeStatuses,
      expiredStatuses,
      startAt: voucher.startAt ?? undefined,
      expiresAt: voucher.endAt ?? undefined,
    }),
    reasons,
  );
  if (timingFailure) {
    return { valid: false, reason: timingFailure };
  }

  const totalUsageFailure = mapRuntimeFailureReason(
    evaluateVoucherUsageRule({
      totalLimit: typeof voucher.usageLimit === 'number' && voucher.usageLimit >= 0 ? voucher.usageLimit : null,
      usedCount: voucher.usedCount,
      totalLimitReason: VoucherRuleFailureReason.TOTAL_LIMIT_REACHED,
    }),
    reasons,
  );
  if (totalUsageFailure) {
    return { valid: false, reason: totalUsageFailure };
  }

  const userUsageFailure = mapRuntimeFailureReason(
    evaluateVoucherUsageRule({
      perUserLimit: typeof voucher.usageLimitPerCustomer === 'number' ? voucher.usageLimitPerCustomer : null,
      userUsedCount: userUsageCount,
      perUserLimitReason: VoucherRuleFailureReason.USER_LIMIT_REACHED,
    }),
    reasons,
  );
  if (userUsageFailure) {
    return { valid: false, reason: userUsageFailure };
  }

  const checkoutFailure = mapRuntimeFailureReason(
    evaluateVoucherCheckoutRule({
      currentCode: voucher.code,
      alreadyAppliedCode,
      selfUseBlocked: voucher.selfUseBlocked ?? undefined,
      authorId: voucher.authorId ?? undefined,
      buyerId: partyId,
      minOrderAmount: voucher.minOrderValue ?? null,
      subtotal: cartSubtotal,
      minOrderReason: VoucherRuleFailureReason.MIN_ORDER_VALUE_NOT_MET,
    }),
    reasons,
  );
  if (checkoutFailure) {
    return { valid: false, reason: checkoutFailure };
  }

  const minQuantity = typeof voucher.minQuantity === 'number' ? voucher.minQuantity : 0;
  const cartQuantity = sumVoucherCartQuantities(items);
  if (minQuantity > 1 && cartQuantity < minQuantity) {
    return { valid: false, reason: reasons.minQuantityNotMet };
  }

  if (voucher.eligibility === 'WHITELIST') {
    const whitelistPartyIds = normalizeRuntimeIdSet(voucher.whitelistPartyIds);
    if (!whitelistPartyIds.has(normalizeRuntimeId(partyId) ?? '')) {
      return { valid: false, reason: reasons.notInWhitelist };
    }
  }

  if (voucher.eligibility === 'NEW_CUSTOMER' && hasPriorOrder) {
    return { valid: false, reason: reasons.notNewCustomer };
  }

  if (voucher.applicableTo === 'PRODUCTS' && (voucher.productIds?.length ?? 0) > 0 && (items?.length ?? 0) > 0) {
    const allowedProductIds = normalizeRuntimeIdSet(voucher.productIds);
    const hasMatchingProduct = items?.some((item) => {
      const productId = normalizeRuntimeId(item.productId);
      return productId ? allowedProductIds.has(productId) : false;
    });
    if (!hasMatchingProduct) {
      return { valid: false, reason: reasons.scopeMismatch };
    }
  }

  if (voucher.applicableTo === 'CATEGORIES' && (voucher.categoryIds?.length ?? 0) > 0 && (items?.length ?? 0) > 0) {
    const allowedCategoryIds = normalizeRuntimeIdSet(voucher.categoryIds);
    const hasMatchingCategory = items?.some((item) => {
      const categoryId = normalizeRuntimeId(item.categoryId);
      return categoryId ? allowedCategoryIds.has(categoryId) : false;
    });
    if (!hasMatchingCategory) {
      return { valid: false, reason: reasons.scopeMismatch };
    }
  }

  const rawDiscount = calculateVoucherRuntimeDiscount(input);
  const cappedDiscount = voucher.type === 'FREE_SHIPPING'
    ? rawDiscount
    : Math.min(cartSubtotal, rawDiscount);

  return { valid: true, discountAmount: Math.floor(Math.max(0, cappedDiscount)) };
}
