export const REFERRAL_EDGE_STATUSES = {
  ACTIVE: 'active',
  DISABLED: 'disabled',
} as const;

export type ReferralEdgeStatus =
  (typeof REFERRAL_EDGE_STATUSES)[keyof typeof REFERRAL_EDGE_STATUSES];

export const REFERRAL_EDGE_STATUS_VALUES = Object.values(
  REFERRAL_EDGE_STATUSES,
) as ReferralEdgeStatus[];

export const REFERRAL_EDGE_INITIAL_STATUS =
  REFERRAL_EDGE_STATUSES.ACTIVE satisfies ReferralEdgeStatus;
