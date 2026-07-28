export const VITA_REFERRAL_LOOKUP_ERRORS = {
  NOT_FOUND: 'not_found',
  SELF_REFERRAL: 'self_referral',
  LOCKED_ACCOUNT: 'locked_account',
} as const;

export type VitaReferralLookupError =
  (typeof VITA_REFERRAL_LOOKUP_ERRORS)[keyof typeof VITA_REFERRAL_LOOKUP_ERRORS];
