import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  AFFILIATE_BALANCE_ADJUSTMENT_REQUEST_STATUS_VALUES,
  AFFILIATE_BALANCE_ADJUSTMENT_REQUEST_TYPE_VALUES,
  AFFILIATE_MEMBER_UPDATE_REQUEST_STATUS_VALUES,
  AffiliateBalanceAdjustmentRequestStatus,
  AffiliateBalanceAdjustmentRequestType,
  AffiliateMemberUpdateRequestStatus,
} from './affiliate-request.contracts';
import {
  REFERRAL_EDGE_INITIAL_STATUS,
  REFERRAL_EDGE_STATUSES,
  REFERRAL_EDGE_STATUS_VALUES,
} from './referral-edge.contracts';
import { REFERRAL_LOOKUP_ERRORS, type IAffiliateReferral } from './referral.contracts';

describe('affiliate-core: contracts structure verification', () => {
  it('should allow using REFERRAL_LOOKUP_ERRORS', () => {
    assert.equal(REFERRAL_LOOKUP_ERRORS.SELF_REFERRAL, 'self_referral');
  });

  it('should allow instantiating structures satisfying IAffiliateReferral', () => {
    const referral: IAffiliateReferral = {
      referral_id: 'ref_111',
      referrer_member_id: 'member_referrer',
      referee_member_id: 'member_referee',
      referral_code: 'REFCODE123',
      status: 'active',
      created_at: new Date(),
    };
    assert.equal(referral.referral_code, 'REFCODE123');
    assert.equal(referral.status, 'active');
  });

  it('exposes canonical affiliate request statuses and types', () => {
    assert.deepEqual(Object.values(AffiliateMemberUpdateRequestStatus), ['PENDING', 'APPROVED', 'REJECTED']);
    assert.deepEqual(AFFILIATE_MEMBER_UPDATE_REQUEST_STATUS_VALUES, ['PENDING', 'APPROVED', 'REJECTED']);
    assert.deepEqual(Object.values(AffiliateBalanceAdjustmentRequestType), ['ADMIN_ADDITION', 'ADMIN_DEDUCTION']);
    assert.deepEqual(AFFILIATE_BALANCE_ADJUSTMENT_REQUEST_TYPE_VALUES, ['ADMIN_ADDITION', 'ADMIN_DEDUCTION']);
    assert.deepEqual(Object.values(AffiliateBalanceAdjustmentRequestStatus), ['PENDING', 'COMPLETED', 'REJECTED']);
    assert.deepEqual(AFFILIATE_BALANCE_ADJUSTMENT_REQUEST_STATUS_VALUES, ['PENDING', 'COMPLETED', 'REJECTED']);
  });

  it('exposes canonical referral edge statuses for runtime writers', () => {
    assert.deepEqual(REFERRAL_EDGE_STATUS_VALUES, [
      REFERRAL_EDGE_STATUSES.ACTIVE,
      REFERRAL_EDGE_STATUSES.DISABLED,
    ]);
    assert.equal(REFERRAL_EDGE_INITIAL_STATUS, REFERRAL_EDGE_STATUSES.ACTIVE);
  });
});
