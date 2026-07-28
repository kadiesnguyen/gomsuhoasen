export enum QrCampaignStatus {
  ACTIVE = 'ACTIVE',
  PAUSED = 'PAUSED',
  ARCHIVED = 'ARCHIVED',
}

export const QR_CAMPAIGN_STATUS_VALUES = Object.values(QrCampaignStatus);
export const QR_CAMPAIGN_MUTABLE_STATUSES = [
  QrCampaignStatus.ACTIVE,
  QrCampaignStatus.PAUSED,
] as const;

export enum QrCampaignType {
  POINT = 'POINT',
  REWARD = 'REWARD',
}

export const QR_CAMPAIGN_TYPE_VALUES = Object.values(QrCampaignType);

export enum QrCampaignRewardType {
  MINIGAME = 'MINIGAME',
  USER_VOUCHER = 'USER_VOUCHER',
  VOUCHER = 'VOUCHER',
  EXTERNAL = 'EXTERNAL',
}

export const QR_CAMPAIGN_REWARD_TYPE_VALUES = Object.values(QrCampaignRewardType);

export enum QrCampaignCodeStatus {
  AVAILABLE = 'AVAILABLE',
  CLAIMING = 'CLAIMING',
  CLAIMED = 'CLAIMED',
  GRANT_FAILED = 'GRANT_FAILED',
  VOIDED = 'VOIDED',
}

export const QR_CAMPAIGN_CODE_STATUS_VALUES = Object.values(QrCampaignCodeStatus);

export enum QrCampaignTurnStatus {
  READY = 'READY',
  VOIDED = 'VOIDED',
}

export const QR_CAMPAIGN_TURN_STATUS_VALUES = Object.values(QrCampaignTurnStatus);
