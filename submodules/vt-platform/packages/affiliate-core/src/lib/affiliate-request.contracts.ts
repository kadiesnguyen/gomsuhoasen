export enum AffiliateMemberUpdateRequestStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

export const AFFILIATE_MEMBER_UPDATE_REQUEST_STATUS_VALUES = Object.values(
  AffiliateMemberUpdateRequestStatus,
) as AffiliateMemberUpdateRequestStatus[];

export enum AffiliateBalanceAdjustmentRequestType {
  ADMIN_ADDITION = 'ADMIN_ADDITION',
  ADMIN_DEDUCTION = 'ADMIN_DEDUCTION',
}

export const AFFILIATE_BALANCE_ADJUSTMENT_REQUEST_TYPE_VALUES = Object.values(
  AffiliateBalanceAdjustmentRequestType,
) as AffiliateBalanceAdjustmentRequestType[];

export enum AffiliateBalanceAdjustmentRequestStatus {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  REJECTED = 'REJECTED',
}

export const AFFILIATE_BALANCE_ADJUSTMENT_REQUEST_STATUS_VALUES = Object.values(
  AffiliateBalanceAdjustmentRequestStatus,
) as AffiliateBalanceAdjustmentRequestStatus[];
