/**
 * @vt/affiliate-core — Shared affiliate referral and commission tracking contracts.
 */

export {
  REFERRAL_LOOKUP_ERRORS,
  type ReferralLookupError,
  type IAffiliateReferral,
} from './lib/referral.contracts';
export {
  REFERRAL_EDGE_INITIAL_STATUS,
  REFERRAL_EDGE_STATUSES,
  REFERRAL_EDGE_STATUS_VALUES,
  type ReferralEdgeStatus,
} from './lib/referral-edge.contracts';
export {
  AFFILIATE_BALANCE_ADJUSTMENT_REQUEST_STATUS_VALUES,
  AFFILIATE_BALANCE_ADJUSTMENT_REQUEST_TYPE_VALUES,
  AFFILIATE_MEMBER_UPDATE_REQUEST_STATUS_VALUES,
  AffiliateBalanceAdjustmentRequestStatus,
  AffiliateBalanceAdjustmentRequestType,
  AffiliateMemberUpdateRequestStatus,
} from './lib/affiliate-request.contracts';
