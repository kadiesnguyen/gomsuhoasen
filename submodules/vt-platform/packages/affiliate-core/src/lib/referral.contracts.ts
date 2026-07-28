import {
  VITA_REFERRAL_LOOKUP_ERRORS,
  type VitaReferralLookupError,
} from '@vt/domain-recipes';

export const REFERRAL_LOOKUP_ERRORS = VITA_REFERRAL_LOOKUP_ERRORS;
export type ReferralLookupError = VitaReferralLookupError;

export interface IAffiliateReferral {
  referral_id: string;
  referrer_member_id: string;
  referee_member_id: string;
  referral_code: string;
  status: 'pending' | 'active' | 'expired';
  created_at: Date;
}
