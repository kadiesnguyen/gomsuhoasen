import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  QrCampaignStatus,
  QR_CAMPAIGN_MUTABLE_STATUSES,
  QR_CAMPAIGN_STATUS_VALUES,
  QrCampaignType,
  QR_CAMPAIGN_TYPE_VALUES,
  QrCampaignRewardType,
  QR_CAMPAIGN_REWARD_TYPE_VALUES,
  QrCampaignCodeStatus,
  QR_CAMPAIGN_CODE_STATUS_VALUES,
  QrCampaignTurnStatus,
  QR_CAMPAIGN_TURN_STATUS_VALUES,
} from './qr-campaign.contracts';

describe('qr-campaign.contracts', () => {
  it('exposes qr campaign status values', () => {
    assert.ok(QR_CAMPAIGN_STATUS_VALUES.includes(QrCampaignStatus.ACTIVE));
    assert.ok(QR_CAMPAIGN_STATUS_VALUES.includes(QrCampaignStatus.ARCHIVED));
    assert.deepEqual(QR_CAMPAIGN_MUTABLE_STATUSES, [
      QrCampaignStatus.ACTIVE,
      QrCampaignStatus.PAUSED,
    ]);
  });

  it('exposes qr campaign type values', () => {
    assert.ok(QR_CAMPAIGN_TYPE_VALUES.includes(QrCampaignType.POINT));
    assert.ok(QR_CAMPAIGN_TYPE_VALUES.includes(QrCampaignType.REWARD));
  });

  it('exposes qr campaign reward type values', () => {
    assert.ok(QR_CAMPAIGN_REWARD_TYPE_VALUES.includes(QrCampaignRewardType.USER_VOUCHER));
    assert.ok(QR_CAMPAIGN_REWARD_TYPE_VALUES.includes(QrCampaignRewardType.MINIGAME));
  });

  it('exposes qr campaign code status values', () => {
    assert.ok(QR_CAMPAIGN_CODE_STATUS_VALUES.includes(QrCampaignCodeStatus.CLAIMED));
    assert.ok(QR_CAMPAIGN_CODE_STATUS_VALUES.includes(QrCampaignCodeStatus.GRANT_FAILED));
  });

  it('exposes qr campaign turn status values', () => {
    assert.ok(QR_CAMPAIGN_TURN_STATUS_VALUES.includes(QrCampaignTurnStatus.READY));
    assert.ok(QR_CAMPAIGN_TURN_STATUS_VALUES.includes(QrCampaignTurnStatus.VOIDED));
  });
});
