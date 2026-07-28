import {
  requireNonNegativeFiniteNumber,
  requireNonNegativeInteger,
} from './number-guards';

export enum VoucherRuleFailureReason {
  NOT_FOUND = 'NOT_FOUND',
  NOT_FOUND_OR_INACTIVE = 'NOT_FOUND_OR_INACTIVE',
  INACTIVE = 'INACTIVE',
  NOT_STARTED = 'NOT_STARTED',
  EXPIRED = 'EXPIRED',
  TOTAL_LIMIT_REACHED = 'TOTAL_LIMIT_REACHED',
  USER_LIMIT_REACHED = 'USER_LIMIT_REACHED',
  MAX_USES_REACHED = 'MAX_USES_REACHED',
  SELF_USE_BLOCKED = 'SELF_USE_BLOCKED',
  ALREADY_APPLIED = 'ALREADY_APPLIED',
  MIN_ORDER_VALUE_NOT_MET = 'MIN_ORDER_VALUE_NOT_MET',
  MIN_ORDER_NOT_MET = 'MIN_ORDER_NOT_MET',
  MIN_QUANTITY_NOT_MET = 'MIN_QUANTITY_NOT_MET',
  NOT_IN_WHITELIST = 'NOT_IN_WHITELIST',
  NOT_NEW_CUSTOMER = 'NOT_NEW_CUSTOMER',
  SCOPE_MISMATCH = 'SCOPE_MISMATCH',
  INVALID_VOUCHER = 'INVALID_VOUCHER',
}

export const V2_VOUCHER_FAILURE_REASON_VALUES = [
  'NOT_FOUND',
  'NOT_FOUND_OR_INACTIVE',
  'NOT_STARTED',
  'EXPIRED',
  'TOTAL_LIMIT_REACHED',
  'USER_LIMIT_REACHED',
  'MIN_ORDER_VALUE_NOT_MET',
  'MIN_QUANTITY_NOT_MET',
  'NOT_IN_WHITELIST',
  'NOT_NEW_CUSTOMER',
  'SCOPE_MISMATCH',
  'INVALID_VOUCHER',
] as const;

export const VITA_VOUCHER_FAILURE_REASON_VALUES = [
  'not_found',
  'expired',
  'max_uses_reached',
  'self_use_blocked',
  'already_applied',
  'min_order_not_met',
  'inactive',
] as const;

export const VITA_VOUCHER_FAILURE_REASONS = {
  NOT_FOUND: 'not_found',
  EXPIRED: 'expired',
  MAX_USES_REACHED: 'max_uses_reached',
  SELF_USE_BLOCKED: 'self_use_blocked',
  ALREADY_APPLIED: 'already_applied',
  MIN_ORDER_NOT_MET: 'min_order_not_met',
  INACTIVE: 'inactive',
} as const;

export const VITA_VOUCHER_CREATE_ERROR_VALUES = [
  'level_too_low',
  'discount_too_high',
  'duplicate_code',
  'invalid_code',
  'invalid_discount',
] as const;

export const VITA_VOUCHER_CREATE_ERRORS = {
  LEVEL_TOO_LOW: 'level_too_low',
  DISCOUNT_TOO_HIGH: 'discount_too_high',
  DUPLICATE_CODE: 'duplicate_code',
  INVALID_CODE: 'invalid_code',
  INVALID_DISCOUNT: 'invalid_discount',
} as const;

export const VOUCHER_TIMING_STATUS_DEFAULTS = {
  ACTIVE: 'active',
  EXPIRED: 'expired',
} as const;

export const VOUCHER_RULE_ENGINE_MESSAGES = {
  VALID_TIME: 'must be a valid time',
  FIELD_VALID_TIME: (fieldName: string) => `${fieldName} must be a valid time`,
  VOUCHER_ID_REQUIRED: 'createVoucherRedemptionKey: voucherId is required',
  ORDER_ID_REQUIRED: 'createVoucherRedemptionKey: orderId is required',
} as const;

const VITA_TO_CANONICAL: Record<(typeof VITA_VOUCHER_FAILURE_REASON_VALUES)[number], VoucherRuleFailureReason> = {
  [VITA_VOUCHER_FAILURE_REASONS.NOT_FOUND]: VoucherRuleFailureReason.NOT_FOUND,
  [VITA_VOUCHER_FAILURE_REASONS.EXPIRED]: VoucherRuleFailureReason.EXPIRED,
  [VITA_VOUCHER_FAILURE_REASONS.MAX_USES_REACHED]: VoucherRuleFailureReason.MAX_USES_REACHED,
  [VITA_VOUCHER_FAILURE_REASONS.SELF_USE_BLOCKED]: VoucherRuleFailureReason.SELF_USE_BLOCKED,
  [VITA_VOUCHER_FAILURE_REASONS.ALREADY_APPLIED]: VoucherRuleFailureReason.ALREADY_APPLIED,
  [VITA_VOUCHER_FAILURE_REASONS.MIN_ORDER_NOT_MET]: VoucherRuleFailureReason.MIN_ORDER_NOT_MET,
  [VITA_VOUCHER_FAILURE_REASONS.INACTIVE]: VoucherRuleFailureReason.INACTIVE,
};

export type VitaVoucherRuleFailureReason =
  (typeof VITA_VOUCHER_FAILURE_REASONS)[keyof typeof VITA_VOUCHER_FAILURE_REASONS];

export type VitaVoucherCreateError =
  (typeof VITA_VOUCHER_CREATE_ERRORS)[keyof typeof VITA_VOUCHER_CREATE_ERRORS];

const CANONICAL_TO_VITA: Partial<Record<VoucherRuleFailureReason, VitaVoucherRuleFailureReason>> = {
  [VoucherRuleFailureReason.NOT_FOUND]: VITA_VOUCHER_FAILURE_REASONS.NOT_FOUND,
  [VoucherRuleFailureReason.NOT_FOUND_OR_INACTIVE]: VITA_VOUCHER_FAILURE_REASONS.NOT_FOUND,
  [VoucherRuleFailureReason.INACTIVE]: VITA_VOUCHER_FAILURE_REASONS.INACTIVE,
  [VoucherRuleFailureReason.NOT_STARTED]: VITA_VOUCHER_FAILURE_REASONS.INACTIVE,
  [VoucherRuleFailureReason.EXPIRED]: VITA_VOUCHER_FAILURE_REASONS.EXPIRED,
  [VoucherRuleFailureReason.TOTAL_LIMIT_REACHED]: VITA_VOUCHER_FAILURE_REASONS.MAX_USES_REACHED,
  [VoucherRuleFailureReason.USER_LIMIT_REACHED]: VITA_VOUCHER_FAILURE_REASONS.MAX_USES_REACHED,
  [VoucherRuleFailureReason.MAX_USES_REACHED]: VITA_VOUCHER_FAILURE_REASONS.MAX_USES_REACHED,
  [VoucherRuleFailureReason.SELF_USE_BLOCKED]: VITA_VOUCHER_FAILURE_REASONS.SELF_USE_BLOCKED,
  [VoucherRuleFailureReason.ALREADY_APPLIED]: VITA_VOUCHER_FAILURE_REASONS.ALREADY_APPLIED,
  [VoucherRuleFailureReason.MIN_ORDER_VALUE_NOT_MET]: VITA_VOUCHER_FAILURE_REASONS.MIN_ORDER_NOT_MET,
  [VoucherRuleFailureReason.MIN_ORDER_NOT_MET]: VITA_VOUCHER_FAILURE_REASONS.MIN_ORDER_NOT_MET,
};

const CANONICAL_REASONS = new Set<string>(Object.values(VoucherRuleFailureReason));

export function normalizeVoucherRuleFailureReason(reason: string | null | undefined): VoucherRuleFailureReason | null {
  if (!reason) return null;
  const trimmed = reason.trim();
  if (!trimmed) return null;
  const vitaReason = VITA_TO_CANONICAL[trimmed as keyof typeof VITA_TO_CANONICAL];
  if (vitaReason) return vitaReason;

  const upper = trimmed.toUpperCase();
  if (CANONICAL_REASONS.has(upper)) return upper as VoucherRuleFailureReason;
  return null;
}

export function isVoucherRuleFailureReason(reason: string | null | undefined): reason is VoucherRuleFailureReason {
  return normalizeVoucherRuleFailureReason(reason) === reason;
}

export function toVitaVoucherRuleFailureReason(reason: string | null | undefined): VitaVoucherRuleFailureReason | null {
  const normalized = normalizeVoucherRuleFailureReason(reason);
  return normalized ? CANONICAL_TO_VITA[normalized] ?? null : null;
}

function toTime(value: Date | string | number | null | undefined): number | null {
  if (value == null) return null;
  const time = value instanceof Date ? value.getTime() : new Date(value).getTime();
  return Number.isFinite(time) ? time : null;
}

function requireTime(value: Date | string | number | null | undefined, fieldName: string): number | null {
  if (value == null) return null;
  const time = toTime(value);
  if (time == null) {
    throw new Error(VOUCHER_RULE_ENGINE_MESSAGES.FIELD_VALID_TIME(fieldName));
  }
  return time;
}

function requirePresentTime(value: Date | string | number, fieldName: string): number {
  const time = requireTime(value, fieldName);
  if (time == null) {
    throw new Error(VOUCHER_RULE_ENGINE_MESSAGES.FIELD_VALID_TIME(fieldName));
  }
  return time;
}

export interface VoucherTimingRuleInput {
  now?: Date | string | number;
  status?: string | null;
  activeStatuses?: readonly string[];
  expiredStatuses?: readonly string[];
  startAt?: Date | string | number | null;
  expiresAt?: Date | string | number | null;
}

export function evaluateVoucherTimingRule(input: VoucherTimingRuleInput): VoucherRuleFailureReason | null {
  const now = input.now == null ? Date.now() : requirePresentTime(input.now, 'now');
  const status = input.status?.toLowerCase();
  const activeStatuses = new Set(
    (input.activeStatuses ?? [VOUCHER_TIMING_STATUS_DEFAULTS.ACTIVE]).map((item) => item.toLowerCase()),
  );
  const expiredStatuses = new Set(
    (input.expiredStatuses ?? [VOUCHER_TIMING_STATUS_DEFAULTS.EXPIRED]).map((item) => item.toLowerCase()),
  );

  if (status && !activeStatuses.has(status)) {
    return expiredStatuses.has(status) ? VoucherRuleFailureReason.EXPIRED : VoucherRuleFailureReason.INACTIVE;
  }

  const startAt = requireTime(input.startAt, 'startAt');
  if (startAt != null && now < startAt) return VoucherRuleFailureReason.NOT_STARTED;

  const expiresAt = requireTime(input.expiresAt, 'expiresAt');
  if (expiresAt != null && now > expiresAt) return VoucherRuleFailureReason.EXPIRED;

  return null;
}

export interface VoucherUsageRuleInput {
  totalLimit?: number | null;
  usedCount?: number | null;
  perUserLimit?: number | null;
  userUsedCount?: number | null;
  totalLimitReason?: VoucherRuleFailureReason.TOTAL_LIMIT_REACHED | VoucherRuleFailureReason.MAX_USES_REACHED;
  perUserLimitReason?: VoucherRuleFailureReason.USER_LIMIT_REACHED | VoucherRuleFailureReason.MAX_USES_REACHED;
}

export function evaluateVoucherUsageRule(input: VoucherUsageRuleInput): VoucherRuleFailureReason | null {
  const totalLimit = input.totalLimit ?? null;
  if (totalLimit != null) {
    const normalizedTotalLimit = requireNonNegativeInteger(totalLimit, 'totalLimit');
    const usedCount = requireNonNegativeInteger(input.usedCount, 'usedCount');
    if (usedCount >= normalizedTotalLimit) {
      return input.totalLimitReason ?? VoucherRuleFailureReason.TOTAL_LIMIT_REACHED;
    }
  }

  const perUserLimit = input.perUserLimit ?? null;
  if (perUserLimit != null) {
    const normalizedPerUserLimit = requireNonNegativeInteger(perUserLimit, 'perUserLimit');
    const userUsedCount = requireNonNegativeInteger(input.userUsedCount, 'userUsedCount');
    if (userUsedCount >= normalizedPerUserLimit) {
      return input.perUserLimitReason ?? VoucherRuleFailureReason.USER_LIMIT_REACHED;
    }
  }

  return null;
}

export interface VoucherCheckoutRuleInput {
  currentCode?: string | null;
  alreadyAppliedCode?: string | null;
  selfUseBlocked?: boolean;
  authorId?: string | null;
  buyerId?: string | null;
  minOrderAmount?: number | null;
  subtotal?: number | null;
  minOrderReason?: VoucherRuleFailureReason.MIN_ORDER_VALUE_NOT_MET | VoucherRuleFailureReason.MIN_ORDER_NOT_MET;
}

export function evaluateVoucherCheckoutRule(input: VoucherCheckoutRuleInput): VoucherRuleFailureReason | null {
  if (
    input.alreadyAppliedCode
    && input.currentCode
    && input.alreadyAppliedCode.toUpperCase() !== input.currentCode.toUpperCase()
  ) {
    return VoucherRuleFailureReason.ALREADY_APPLIED;
  }

  if (input.selfUseBlocked && input.authorId && input.buyerId && input.authorId === input.buyerId) {
    return VoucherRuleFailureReason.SELF_USE_BLOCKED;
  }

  const minOrderAmount = input.minOrderAmount ?? null;
  if (minOrderAmount != null) {
    const normalizedMinOrderAmount = requireNonNegativeFiniteNumber(minOrderAmount, 'minOrderAmount');
    const subtotal = requireNonNegativeFiniteNumber(input.subtotal, 'subtotal');
    if (subtotal < normalizedMinOrderAmount) {
      return input.minOrderReason ?? VoucherRuleFailureReason.MIN_ORDER_VALUE_NOT_MET;
    }
  }

  return null;
}

export enum VoucherRedemptionLifecycleState {
  RESERVED = 'RESERVED',
  REDEEMED = 'REDEEMED',
  RELEASED = 'RELEASED',
}

export const V2_VOUCHER_REDEMPTION_STATUS_VALUES = ['RESERVED', 'CONSUMED', 'RELEASED'] as const;
export const VITA_VOUCHER_USAGE_STATUSES = {
  RESERVED: 'reserved',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
} as const;

export const VITA_VOUCHER_USAGE_STATUS_VALUES = Object.values(VITA_VOUCHER_USAGE_STATUSES);

export const VOUCHER_USAGE_RELEASE_DEFAULTS = {
  EXHAUSTED_VOUCHER_STATUS: 'used',
  ACTIVE_VOUCHER_STATUS: VOUCHER_TIMING_STATUS_DEFAULTS.ACTIVE,
  RELEASED_USAGE_STATUS: VITA_VOUCHER_USAGE_STATUSES.CANCELLED,
} as const;

export const VOUCHER_USAGE_REDEEM_DEFAULTS = {
  REDEEMED_USAGE_STATUS: VITA_VOUCHER_USAGE_STATUSES.COMPLETED,
} as const;

const REDEMPTION_STATUS_ALIASES: Record<string, VoucherRedemptionLifecycleState> = {
  RESERVED: VoucherRedemptionLifecycleState.RESERVED,
  [VITA_VOUCHER_USAGE_STATUSES.RESERVED]: VoucherRedemptionLifecycleState.RESERVED,
  CONSUMED: VoucherRedemptionLifecycleState.REDEEMED,
  [VITA_VOUCHER_USAGE_STATUSES.COMPLETED]: VoucherRedemptionLifecycleState.REDEEMED,
  RELEASED: VoucherRedemptionLifecycleState.RELEASED,
  [VITA_VOUCHER_USAGE_STATUSES.CANCELLED]: VoucherRedemptionLifecycleState.RELEASED,
};

export function normalizeVoucherRedemptionState(
  status: string | null | undefined,
): VoucherRedemptionLifecycleState | null {
  if (!status) return null;
  return REDEMPTION_STATUS_ALIASES[status] ?? REDEMPTION_STATUS_ALIASES[status.trim()] ?? null;
}

export function isVoucherUsageActive(status: string | null | undefined): boolean {
  const normalized = normalizeVoucherRedemptionState(status);
  if (!normalized) return true;
  return normalized !== VoucherRedemptionLifecycleState.RELEASED;
}

export function createVoucherRedemptionKey(input: {
  tenantId?: string | null;
  voucherId: string;
  orderId: string;
  partyId?: string | null;
}): string {
  const tenant = input.tenantId?.trim();
  const voucherId = input.voucherId.trim();
  const orderId = input.orderId.trim();
  const party = input.partyId?.trim();

  if (!voucherId) {
    throw new Error(VOUCHER_RULE_ENGINE_MESSAGES.VOUCHER_ID_REQUIRED);
  }
  if (!orderId) {
    throw new Error(VOUCHER_RULE_ENGINE_MESSAGES.ORDER_ID_REQUIRED);
  }

  const segments = ['voucher-redemption'];
  if (tenant) segments.push(tenant);
  segments.push(voucherId, orderId);
  if (party) segments.push(party);
  return segments.join(':');
}

export function applyVoucherUsageDelta(currentUses: number, delta: 1 | -1): number {
  return Math.max(0, requireNonNegativeInteger(currentUses, 'currentUses') + delta);
}

export interface VoucherUsageRedeemPlanInput {
  tenantId?: string | null;
  voucherId: string;
  orderId: string;
  partyId?: string | null;
  currentUses?: number | null;
  usageLimit?: number | null;
  currentVoucherStatus?: string | null;
  exhaustedVoucherStatus?: string | null;
  redeemedUsageStatus?: string;
}

export interface VoucherUsageRedeemPlan {
  correlationId: string;
  nextUses: number;
  nextVoucherStatus: string | null;
  nextUsageStatus: string;
  expectedCurrentUses: number;
  usageLimit: number | null;
  limitReached: boolean;
}

export function createVoucherUsageRedeemPlan(input: VoucherUsageRedeemPlanInput): VoucherUsageRedeemPlan {
  const expectedCurrentUses = requireNonNegativeInteger(input.currentUses, 'currentUses');
  const usageLimit = input.usageLimit == null || input.usageLimit < 0
    ? null
    : requireNonNegativeInteger(input.usageLimit, 'usageLimit');
  const nextUses = applyVoucherUsageDelta(expectedCurrentUses, 1);
  const limitReached = usageLimit != null && nextUses >= usageLimit;
  const exhaustedVoucherStatus = input.exhaustedVoucherStatus ?? null;
  const currentVoucherStatus = input.currentVoucherStatus ?? null;

  return {
    correlationId: createVoucherRedemptionKey({
      tenantId: input.tenantId,
      voucherId: input.voucherId,
      orderId: input.orderId,
      partyId: input.partyId,
    }),
    nextUses,
    nextVoucherStatus: limitReached && exhaustedVoucherStatus
      ? exhaustedVoucherStatus
      : currentVoucherStatus,
    nextUsageStatus: input.redeemedUsageStatus ?? VOUCHER_USAGE_REDEEM_DEFAULTS.REDEEMED_USAGE_STATUS,
    expectedCurrentUses,
    usageLimit,
    limitReached,
  };
}

export interface VoucherUsageReleasePlanInput {
  currentUses?: number | null;
  currentVoucherStatus?: string | null;
  exhaustedVoucherStatus?: string;
  activeVoucherStatus?: string;
  releasedUsageStatus?: string;
}

export interface VoucherUsageReleasePlan {
  nextUses: number;
  nextVoucherStatus: string | null;
  nextUsageStatus: string;
}

export function createVoucherUsageReleasePlan(input: VoucherUsageReleasePlanInput): VoucherUsageReleasePlan {
  const exhaustedVoucherStatus = input.exhaustedVoucherStatus
    ?? VOUCHER_USAGE_RELEASE_DEFAULTS.EXHAUSTED_VOUCHER_STATUS;
  const activeVoucherStatus = input.activeVoucherStatus ?? VOUCHER_USAGE_RELEASE_DEFAULTS.ACTIVE_VOUCHER_STATUS;
  const currentVoucherStatus = input.currentVoucherStatus ?? null;
  const currentUses = requireNonNegativeInteger(input.currentUses, 'currentUses');
  const nextUses = applyVoucherUsageDelta(currentUses, -1);

  return {
    nextUses,
    nextVoucherStatus: currentVoucherStatus === exhaustedVoucherStatus ? activeVoucherStatus : currentVoucherStatus,
    nextUsageStatus: input.releasedUsageStatus ?? VOUCHER_USAGE_RELEASE_DEFAULTS.RELEASED_USAGE_STATUS,
  };
}
