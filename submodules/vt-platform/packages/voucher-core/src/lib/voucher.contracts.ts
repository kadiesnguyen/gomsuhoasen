import {
  VoucherRuleFailureReason,
  VITA_VOUCHER_CREATE_ERRORS,
  VITA_VOUCHER_FAILURE_REASONS,
  VITA_VOUCHER_USAGE_STATUSES,
  type VitaVoucherCreateError,
  type VitaVoucherRuleFailureReason,
} from '@vt/domain-recipes';

export const VOUCHER_TYPES = {
  AMOUNT: 'amount',
  PERCENTAGE: 'percentage',
  SHIPPING: 'shipping',
} as const;

export type VoucherType = (typeof VOUCHER_TYPES)[keyof typeof VOUCHER_TYPES];

export const VOUCHER_TYPE_VALUES = Object.values(VOUCHER_TYPES);

export const VOUCHER_STATUSES = {
  ACTIVE: 'active',
  EXPIRED: 'expired',
  USED: 'used',
  INELIGIBLE: 'ineligible',
} as const;

export type VoucherStatus = (typeof VOUCHER_STATUSES)[keyof typeof VOUCHER_STATUSES];

export const VOUCHER_STATUS_VALUES = Object.values(VOUCHER_STATUSES);
export const DEFAULT_VOUCHER_STATUS = VOUCHER_STATUSES.ACTIVE;
export const VOUCHER_ACTIVE_TIMING_STATUSES = [VOUCHER_STATUSES.ACTIVE] as const;
export const VOUCHER_EXPIRED_TIMING_STATUSES = [VOUCHER_STATUSES.EXPIRED] as const;
export const VOUCHER_USER_ERROR_REASONS = {
  USER_VOUCHER_EXCEEDS_CREATOR_TIER_LIMIT: 'USER_VOUCHER_EXCEEDS_CREATOR_TIER_LIMIT',
  USER_VOUCHER_INVALID_OR_INACTIVE: 'USER_VOUCHER_INVALID_OR_INACTIVE',
  USER_VOUCHER_NO_LONGER_AVAILABLE: 'USER_VOUCHER_NO_LONGER_AVAILABLE',
} as const;
export const VOUCHER_VALIDATION_ERROR_REASONS = {
  NOT_FOUND_OR_INACTIVE: VoucherRuleFailureReason.NOT_FOUND_OR_INACTIVE,
  NOT_STARTED: VoucherRuleFailureReason.NOT_STARTED,
  EXPIRED: VoucherRuleFailureReason.EXPIRED,
  TOTAL_LIMIT_REACHED: VoucherRuleFailureReason.TOTAL_LIMIT_REACHED,
  USER_LIMIT_REACHED: VoucherRuleFailureReason.USER_LIMIT_REACHED,
  MIN_ORDER_VALUE_NOT_MET: VoucherRuleFailureReason.MIN_ORDER_VALUE_NOT_MET,
  MIN_QUANTITY_NOT_MET: VoucherRuleFailureReason.MIN_QUANTITY_NOT_MET,
  NOT_IN_WHITELIST: VoucherRuleFailureReason.NOT_IN_WHITELIST,
  NOT_NEW_CUSTOMER: VoucherRuleFailureReason.NOT_NEW_CUSTOMER,
  SCOPE_MISMATCH: VoucherRuleFailureReason.SCOPE_MISMATCH,
  INVALID_VOUCHER: VoucherRuleFailureReason.INVALID_VOUCHER,
} as const;
export const VOUCHER_BULK_REJECTION_REASONS = {
  DUPLICATE_CODE: 'DUPLICATE_CODE',
  DUPLICATE_IN_BATCH: 'DUPLICATE_IN_BATCH',
  INSERT_CONFLICT: 'INSERT_CONFLICT',
  NOT_FOUND: 'NOT_FOUND',
  INVALID_STATUS_TRANSITION: 'INVALID_STATUS_TRANSITION',
} as const;
export const VOUCHER_ELIGIBILITY = {
  ALL: 'ALL',
  WHITELIST: 'WHITELIST',
} as const;
export const VOUCHER_ANALYTICS = {
  TOP_REDEEMED_LIMIT: 5,
} as const;
export const VOUCHER_LIMITS = {
  BULK_CREATE_LIMIT: 50,
} as const;
export const VOUCHER_PAGINATION = {
  PAGE_DEFAULT: 1,
  LIMIT_DEFAULT: 20,
  LIMIT_MAX: 100,
} as const;
export const VOUCHER_CONSTANTS = {
  ERRORS: VOUCHER_USER_ERROR_REASONS,
  VALIDATION_ERROR: VOUCHER_VALIDATION_ERROR_REASONS,
  BULK_REJECTION_REASONS: VOUCHER_BULK_REJECTION_REASONS,
  ELIGIBILITY: VOUCHER_ELIGIBILITY,
  ANALYTICS: VOUCHER_ANALYTICS,
  LIMITS: VOUCHER_LIMITS,
  PAGINATION: VOUCHER_PAGINATION,
} as const;
export const VOUCHER_PUBLIC_ERROR_MESSAGES = {
  TENANT_CONTEXT_MISSING: 'Missing tenantId on request',
  PARTY_CONTEXT_MISSING: 'Missing partyId on request',
  TENANT_CONTEXT_HEADER_REQUIRED: 'Tenant context header required',
  PUBLIC_USER_VOUCHER_TENANT_CONTEXT_REQUIRED: 'Tenant context is required for public user voucher endpoints',
  INVALID_OBJECT_ID: 'Invalid voucher object id',
  INVALID_PAGINATION_QUERY: 'Invalid voucher pagination query',
  INVALID_NUMERIC_FIELD: 'Invalid voucher numeric field',
  BULK_CREATE_LIMIT_EXCEEDED: `Bulk create limited to ${VOUCHER_LIMITS.BULK_CREATE_LIMIT} vouchers per request`,
  BULK_INSERT_CODE_UNRESOLVED: 'Bulk voucher insert conflict did not include a voucher code',
  VOUCHER_CODE_ALREADY_EXISTS: 'Voucher code already exists for this tenant',
  VOUCHER_NOT_FOUND: 'Voucher not found',
  VOUCHER_NOT_FOUND_OR_INACTIVE: 'Voucher not found or inactive',
  VOUCHER_REDEMPTION_REASON_REQUIRED: 'Voucher redemption failure requires an explicit validation reason',
  VOUCHER_CANNOT_BE_REDEEMED: 'Voucher cannot be redeemed.',
  VOUCHER_LIMIT_REACHED_DURING_REDEMPTION: 'Voucher limit reached during redemption',
  USAGE_LIMIT_PER_CUSTOMER_INVALID: 'usageLimitPerCustomer must be at least 1',
  MIN_ORDER_VALUE_INVALID: 'minOrderValue must be >= 0',
  MIN_QUANTITY_INVALID: 'minQuantity must be at least 1',
  VALUE_INVALID: 'value must be >= 0',
  USER_VOUCHER_EXCEEDS_CREATOR_TIER_LIMIT: 'User voucher exceeds creator tier limit.',
  USER_VOUCHER_CODE_ALREADY_EXISTS: 'User voucher code already exists for this tenant',
  USER_VOUCHER_NOT_FOUND: 'User voucher not found',
  USER_VOUCHER_INVALID_OR_INACTIVE: 'User voucher is invalid or inactive.',
  USER_VOUCHER_NO_LONGER_AVAILABLE: 'User voucher is no longer available.',
} as const;
export const VOUCHER_VALIDATION_MESSAGES = {
  BULK_CREATE_MIN_SIZE: 'At least 1 voucher is required',
  BULK_CREATE_MAX_SIZE: `Maximum ${VOUCHER_LIMITS.BULK_CREATE_LIMIT} vouchers per request`,
} as const;

export const VOUCHER_REDEMPTION_STATUSES = VITA_VOUCHER_USAGE_STATUSES;
export type VoucherRedemptionStatus = (typeof VOUCHER_REDEMPTION_STATUSES)[keyof typeof VOUCHER_REDEMPTION_STATUSES];
export const VOUCHER_REDEMPTION_STATUS_VALUES = Object.values(VOUCHER_REDEMPTION_STATUSES);

export function isVoucherType(input: unknown): input is VoucherType {
  return typeof input === 'string' && VOUCHER_TYPE_VALUES.includes(input as VoucherType);
}

export function readVoucherType(input: unknown, fallback: VoucherType = VOUCHER_TYPES.PERCENTAGE): VoucherType {
  return isVoucherType(input) ? input : fallback;
}

export function isVoucherStatus(input: unknown): input is VoucherStatus {
  return typeof input === 'string' && VOUCHER_STATUS_VALUES.includes(input as VoucherStatus);
}

export function readVoucherStatus(input: unknown, fallback: VoucherStatus = DEFAULT_VOUCHER_STATUS): VoucherStatus {
  return isVoucherStatus(input) ? input : fallback;
}

export function voucherInvalidNumericFieldMessage(fieldName: string): string {
  return `${VOUCHER_PUBLIC_ERROR_MESSAGES.INVALID_NUMERIC_FIELD}: ${fieldName}`;
}

export function isActiveVoucherStatus(input: unknown): boolean {
  return isVoucherStatus(input) && input === VOUCHER_STATUSES.ACTIVE;
}

export function isExpiredVoucherStatus(input: unknown): boolean {
  return isVoucherStatus(input) && input === VOUCHER_STATUSES.EXPIRED;
}

export function isVoucherRedemptionStatus(input: unknown): input is VoucherRedemptionStatus {
  return typeof input === 'string' && VOUCHER_REDEMPTION_STATUS_VALUES.includes(input as VoucherRedemptionStatus);
}

export function readVoucherRedemptionStatus(
  input: unknown,
  fallback: VoucherRedemptionStatus = VOUCHER_REDEMPTION_STATUSES.COMPLETED,
): VoucherRedemptionStatus {
  return isVoucherRedemptionStatus(input) ? input : fallback;
}

export interface IVoucherRedemptionRecord {
  redemption_id: string;
  buyer_member_id: string;
  order_id?: string;
  discount_amount: number;
  status: VoucherRedemptionStatus;
  created_at: Date;
}

export interface IVoucher {
  code: string;
  type: VoucherType;
  value: number;
  description: string;
  author_member_id: string;
  author_name: string;
  status: VoucherStatus;
  min_order_amount: number;
  total_turn?: number;
  turn_per_user: number;
  current_uses: number;
  usage_records: IVoucherRedemptionRecord[];
  self_use_blocked: boolean;
  start_at?: Date;
  expires_at?: Date;
  deleted_at?: Date;
}

export type VoucherValidationResult =
  | { valid: true; voucher: IVoucher; discount_amount: number }
  | { valid: false; reason: VoucherInvalidReason };

export const VOUCHER_INVALID_REASONS = VITA_VOUCHER_FAILURE_REASONS;
export type VoucherInvalidReason = VitaVoucherRuleFailureReason;

export const VOUCHER_CREATE_ERRORS = VITA_VOUCHER_CREATE_ERRORS;
export type VoucherCreateError = VitaVoucherCreateError;

export interface VoucherRules {
  one_coupon_per_order: boolean;
  self_use_blocked: boolean;
  author_earns_score: boolean;
  min_create_level: number;
  max_discount_by_level: Record<number, number>;
}

export const DEFAULT_VOUCHER_RULES: VoucherRules = {
  one_coupon_per_order: true,
  self_use_blocked: true,
  author_earns_score: true,
  min_create_level: 2,
  max_discount_by_level: {
    1: 0,
    2: 10,
    3: 20,
    4: 30,
    5: 40,
  },
};
