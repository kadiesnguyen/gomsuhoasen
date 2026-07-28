export interface IMembershipDiscountConfig {
  discountPercent: number;
}

export interface IPricingComputationContext {
  cartTotal: number;
  discountVoucher?: number;
  discountPoint?: number;
  shippingFee?: number;
  membership?: IMembershipDiscountConfig;
  /**
   * OLD_CODE allowed discounts to drive the draft total below zero.
   * Set this to true for modern flows that must fail closed at zero.
   */
  clampDiscounts?: boolean;
}

export interface IPricingResult {
  cartTotal: number;
  discountVoucher: number;
  discountPoint: number;
  discountMembership: number;
  shippingFee: number;
  totalPayment: number;
}

export interface ICheckoutPricingComputationContext {
  cartTotal: number;
  discountTier?: number;
  discountVoucher?: number;
  discountCollectedVoucher?: number;
  discountLoyaltyCard?: number;
  discountPoints?: number;
  shippingFee?: number;
  /**
   * OLD_CODE allowed discount drafts to go negative in some paths.
   * Set this to true for application flows that must fail closed at zero.
   */
  clampDiscounts?: boolean;
}

export interface ICheckoutPricingResult {
  cartTotal: number;
  discountTier: number;
  discountVoucher: number;
  discountCollectedVoucher: number;
  discountLoyaltyCard: number;
  discountPoints: number;
  shippingFee: number;
  subtotalAfterTier: number;
  subtotalAfterVoucher: number;
  subtotalAfterCollectedVoucher: number;
  subtotalAfterLoyaltyCard: number;
  subtotalAfterDiscounts: number;
  totalPayment: number;
}

export const PRICE_ORDER_DISCOUNT_KINDS = [
  'MEMBERSHIP_TIER',
  'VOUCHER',
  'COLLECTED_VOUCHER',
  'LOYALTY_CARD',
  'POINTS',
] as const;

export type PriceOrderDiscountKind = typeof PRICE_ORDER_DISCOUNT_KINDS[number];

export const PRICE_ORDER_ADJUSTMENT_REASONS = {
  CAPPED_TO_REMAINING_SUBTOTAL: 'CAPPED_TO_REMAINING_SUBTOTAL',
  SHIPPING_WAIVED: 'SHIPPING_WAIVED',
} as const;

export const PRICE_ORDER_ERROR_CODES = {
  COMMAND_INVALID: 'ECOM.PRICE.COMMAND_INVALID',
  COMMAND_ID_REQUIRED: 'ECOM.PRICE.COMMAND_ID_REQUIRED',
  CURRENCY_INVALID: 'ECOM.PRICE.CURRENCY_INVALID',
  LINES_REQUIRED: 'ECOM.PRICE.LINES_REQUIRED',
  PRODUCT_ID_REQUIRED: 'ECOM.PRICE.PRODUCT_ID_REQUIRED',
  QUANTITY_INVALID: 'ECOM.PRICE.QUANTITY_INVALID',
  MONEY_INVALID: 'ECOM.PRICE.MONEY_INVALID',
  MONEY_OVERFLOW: 'ECOM.PRICE.MONEY_OVERFLOW',
  BOOLEAN_INVALID: 'ECOM.PRICE.BOOLEAN_INVALID',
} as const;

export type PriceOrderErrorCode =
  typeof PRICE_ORDER_ERROR_CODES[keyof typeof PRICE_ORDER_ERROR_CODES];

export class PriceOrderInvariantError extends Error {
  constructor(
    readonly code: PriceOrderErrorCode,
    readonly path: string,
  ) {
    super(`${code}: ${path}`);
    this.name = 'PriceOrderInvariantError';
  }
}

export interface PriceOrderLineSnapshot {
  productId: string;
  quantity: number;
  catalogUnitPrice: number;
  effectiveUnitPrice: number;
  priceSource?: string;
}

export interface PriceOrderCommand {
  commandId: string;
  currency: string;
  lines: readonly PriceOrderLineSnapshot[];
  discounts?: Partial<Record<PriceOrderDiscountKind, number>>;
  shippingFee?: number;
  waiveShipping?: boolean;
  taxFee?: number;
  paymentFee?: number;
}

export interface PriceOrderLineResult extends PriceOrderLineSnapshot {
  catalogLineTotal: number;
  effectiveLineTotal: number;
  priceBookAdjustment: number;
}

export interface PriceOrderDiscountResult {
  kind: PriceOrderDiscountKind;
  requestedAmount: number;
  appliedAmount: number;
  subtotalAfter: number;
  adjustmentReason?: typeof PRICE_ORDER_ADJUSTMENT_REASONS.CAPPED_TO_REMAINING_SUBTOTAL;
}

export interface PriceOrderResult {
  commandId: string;
  currency: string;
  pricingVersion: 'PRICE_ORDER_V1';
  roundingPolicy: 'INTEGER_MINOR_UNIT';
  lines: PriceOrderLineResult[];
  catalogSubtotal: number;
  effectiveSubtotal: number;
  priceBookAdjustment: number;
  discounts: PriceOrderDiscountResult[];
  discountTotal: number;
  subtotalAfterDiscounts: number;
  requestedShippingFee: number;
  shippingFee: number;
  shippingDiscount: number;
  shippingAdjustmentReason?: typeof PRICE_ORDER_ADJUSTMENT_REASONS.SHIPPING_WAIVED;
  taxFee: number;
  paymentFee: number;
  totalPayment: number;
}

const readAmount = (value: number | undefined): number => value ?? 0;

const subtractDiscount = (baseAmount: number, discount: number, clamp: boolean): number => {
  const next = baseAmount - discount;
  return clamp ? Math.max(0, next) : next;
};

export const computeMembershipDiscount = (
  baseAmount: number,
  discountPercent: number,
): number => {
  if (!baseAmount || discountPercent <= 0) return 0;
  const rawDiscount = (baseAmount * discountPercent) / 100;
  return Number((rawDiscount / 1000).toFixed(0)) * 1000;
};

export const computeClampedMembershipDiscount = (
  baseAmount: number,
  discountPercent: number,
): number => {
  if (baseAmount <= 0) return 0;
  return computeMembershipDiscount(baseAmount, discountPercent);
};

export const computeOrderPricing = (context: IPricingComputationContext): IPricingResult => {
  const cartTotal = readAmount(context.cartTotal);
  const discountVoucher = readAmount(context.discountVoucher);
  const discountPoint = readAmount(context.discountPoint);
  const shippingFee = readAmount(context.shippingFee);
  const clampDiscounts = context.clampDiscounts === true;

  let totalDraft = cartTotal;
  totalDraft = subtractDiscount(totalDraft, discountVoucher, clampDiscounts);
  totalDraft = subtractDiscount(totalDraft, discountPoint, clampDiscounts);

  const discountMembership = context.membership
    ? (
      clampDiscounts
        ? computeClampedMembershipDiscount(totalDraft, context.membership.discountPercent)
        : computeMembershipDiscount(totalDraft, context.membership.discountPercent)
    )
    : 0;

  totalDraft = subtractDiscount(totalDraft, discountMembership, clampDiscounts);
  const totalPayment = totalDraft + shippingFee;

  return {
    cartTotal,
    discountVoucher,
    discountPoint,
    discountMembership,
    shippingFee,
    totalPayment,
  };
};

export const computeCheckoutPricing = (
  context: ICheckoutPricingComputationContext,
): ICheckoutPricingResult => {
  const cartTotal = readAmount(context.cartTotal);
  const discountTier = readAmount(context.discountTier);
  const discountVoucher = readAmount(context.discountVoucher);
  const discountCollectedVoucher = readAmount(context.discountCollectedVoucher);
  const discountLoyaltyCard = readAmount(context.discountLoyaltyCard);
  const discountPoints = readAmount(context.discountPoints);
  const shippingFee = readAmount(context.shippingFee);
  const clampDiscounts = context.clampDiscounts === true;

  const subtotalAfterTier = subtractDiscount(cartTotal, discountTier, clampDiscounts);
  const subtotalAfterVoucher = subtractDiscount(subtotalAfterTier, discountVoucher, clampDiscounts);
  const subtotalAfterCollectedVoucher = subtractDiscount(
    subtotalAfterVoucher,
    discountCollectedVoucher,
    clampDiscounts,
  );
  const subtotalAfterLoyaltyCard = subtractDiscount(
    subtotalAfterCollectedVoucher,
    discountLoyaltyCard,
    clampDiscounts,
  );
  const subtotalAfterDiscounts = subtractDiscount(
    subtotalAfterLoyaltyCard,
    discountPoints,
    clampDiscounts,
  );
  const totalPayment = subtotalAfterDiscounts + shippingFee;

  return {
    cartTotal,
    discountTier,
    discountVoucher,
    discountCollectedVoucher,
    discountLoyaltyCard,
    discountPoints,
    shippingFee,
    subtotalAfterTier,
    subtotalAfterVoucher,
    subtotalAfterCollectedVoucher,
    subtotalAfterLoyaltyCard,
    subtotalAfterDiscounts,
    totalPayment,
  };
};

function requireNonEmptyString(
  value: unknown,
  code: PriceOrderErrorCode,
  path: string,
): string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new PriceOrderInvariantError(code, path);
  }
  return value.trim();
}

function requireMoney(value: unknown, path: string): number {
  if (
    typeof value !== 'number'
    || !Number.isSafeInteger(value)
    || value < 0
  ) {
    throw new PriceOrderInvariantError(PRICE_ORDER_ERROR_CODES.MONEY_INVALID, path);
  }
  return value;
}

function requirePositiveInteger(value: unknown, path: string): number {
  if (
    typeof value !== 'number'
    || !Number.isSafeInteger(value)
    || value <= 0
  ) {
    throw new PriceOrderInvariantError(PRICE_ORDER_ERROR_CODES.QUANTITY_INVALID, path);
  }
  return value;
}

function safeAdd(left: number, right: number, path: string): number {
  const result = left + right;
  if (!Number.isSafeInteger(result)) {
    throw new PriceOrderInvariantError(PRICE_ORDER_ERROR_CODES.MONEY_OVERFLOW, path);
  }
  return result;
}

function safeMultiply(left: number, right: number, path: string): number {
  const result = left * right;
  if (!Number.isSafeInteger(result)) {
    throw new PriceOrderInvariantError(PRICE_ORDER_ERROR_CODES.MONEY_OVERFLOW, path);
  }
  return result;
}

export function priceOrder(command: PriceOrderCommand): PriceOrderResult {
  if (!command || typeof command !== 'object') {
    throw new PriceOrderInvariantError(
      PRICE_ORDER_ERROR_CODES.COMMAND_INVALID,
      'command',
    );
  }
  const commandId = requireNonEmptyString(
    command.commandId,
    PRICE_ORDER_ERROR_CODES.COMMAND_ID_REQUIRED,
    'commandId',
  );
  const currency = requireNonEmptyString(
    command.currency,
    PRICE_ORDER_ERROR_CODES.CURRENCY_INVALID,
    'currency',
  ).toUpperCase();
  if (!/^[A-Z]{3}$/.test(currency)) {
    throw new PriceOrderInvariantError(
      PRICE_ORDER_ERROR_CODES.CURRENCY_INVALID,
      'currency',
    );
  }
  if (!Array.isArray(command.lines) || command.lines.length === 0) {
    throw new PriceOrderInvariantError(
      PRICE_ORDER_ERROR_CODES.LINES_REQUIRED,
      'lines',
    );
  }

  let catalogSubtotal = 0;
  let effectiveSubtotal = 0;
  const lines = command.lines.map((line, index): PriceOrderLineResult => {
    const prefix = `lines[${index}]`;
    if (!line || typeof line !== 'object') {
      throw new PriceOrderInvariantError(
        PRICE_ORDER_ERROR_CODES.LINES_REQUIRED,
        prefix,
      );
    }
    const productId = requireNonEmptyString(
      line.productId,
      PRICE_ORDER_ERROR_CODES.PRODUCT_ID_REQUIRED,
      `${prefix}.productId`,
    );
    const quantity = requirePositiveInteger(line.quantity, `${prefix}.quantity`);
    const catalogUnitPrice = requireMoney(
      line.catalogUnitPrice,
      `${prefix}.catalogUnitPrice`,
    );
    const effectiveUnitPrice = requireMoney(
      line.effectiveUnitPrice,
      `${prefix}.effectiveUnitPrice`,
    );
    const catalogLineTotal = safeMultiply(
      catalogUnitPrice,
      quantity,
      `${prefix}.catalogLineTotal`,
    );
    const effectiveLineTotal = safeMultiply(
      effectiveUnitPrice,
      quantity,
      `${prefix}.effectiveLineTotal`,
    );
    catalogSubtotal = safeAdd(
      catalogSubtotal,
      catalogLineTotal,
      'catalogSubtotal',
    );
    effectiveSubtotal = safeAdd(
      effectiveSubtotal,
      effectiveLineTotal,
      'effectiveSubtotal',
    );

    return {
      productId,
      quantity,
      catalogUnitPrice,
      effectiveUnitPrice,
      ...(typeof line.priceSource === 'string' && line.priceSource.trim()
        ? { priceSource: line.priceSource.trim() }
        : {}),
      catalogLineTotal,
      effectiveLineTotal,
      priceBookAdjustment: effectiveLineTotal - catalogLineTotal,
    };
  });

  let subtotalAfterDiscounts = effectiveSubtotal;
  let discountTotal = 0;
  const discounts = PRICE_ORDER_DISCOUNT_KINDS.map((kind): PriceOrderDiscountResult => {
    const requestedAmount = requireMoney(
      command.discounts?.[kind] ?? 0,
      `discounts.${kind}`,
    );
    const appliedAmount = Math.min(requestedAmount, subtotalAfterDiscounts);
    subtotalAfterDiscounts -= appliedAmount;
    discountTotal = safeAdd(discountTotal, appliedAmount, 'discountTotal');
    return {
      kind,
      requestedAmount,
      appliedAmount,
      subtotalAfter: subtotalAfterDiscounts,
      ...(appliedAmount < requestedAmount
        ? {
          adjustmentReason:
            PRICE_ORDER_ADJUSTMENT_REASONS.CAPPED_TO_REMAINING_SUBTOTAL,
        }
        : {}),
    };
  });

  const requestedShippingFee = requireMoney(
    command.shippingFee ?? 0,
    'shippingFee',
  );
  if (
    command.waiveShipping !== undefined
    && typeof command.waiveShipping !== 'boolean'
  ) {
    throw new PriceOrderInvariantError(
      PRICE_ORDER_ERROR_CODES.BOOLEAN_INVALID,
      'waiveShipping',
    );
  }
  const shippingFee = command.waiveShipping ? 0 : requestedShippingFee;
  const shippingDiscount = requestedShippingFee - shippingFee;
  const taxFee = requireMoney(command.taxFee ?? 0, 'taxFee');
  const paymentFee = requireMoney(command.paymentFee ?? 0, 'paymentFee');
  const subtotalWithShipping = safeAdd(
    subtotalAfterDiscounts,
    shippingFee,
    'totalPayment',
  );
  const subtotalWithTax = safeAdd(subtotalWithShipping, taxFee, 'totalPayment');
  const totalPayment = safeAdd(subtotalWithTax, paymentFee, 'totalPayment');

  return {
    commandId,
    currency,
    pricingVersion: 'PRICE_ORDER_V1',
    roundingPolicy: 'INTEGER_MINOR_UNIT',
    lines,
    catalogSubtotal,
    effectiveSubtotal,
    priceBookAdjustment: effectiveSubtotal - catalogSubtotal,
    discounts,
    discountTotal,
    subtotalAfterDiscounts,
    requestedShippingFee,
    shippingFee,
    shippingDiscount,
    ...(command.waiveShipping && requestedShippingFee > 0
      ? { shippingAdjustmentReason: PRICE_ORDER_ADJUSTMENT_REASONS.SHIPPING_WAIVED }
      : {}),
    taxFee,
    paymentFee,
    totalPayment,
  };
}
