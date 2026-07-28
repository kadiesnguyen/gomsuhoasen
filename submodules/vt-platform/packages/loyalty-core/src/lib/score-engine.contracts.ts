export const SCORE_TYPES = {
  // Order-based score rows.
  BUYER: 'BUYER',
  VOUCHER: 'VOUCHER',
  REFERRER: 'REFERRER',
  DIRECT_COMMISSION: 'DIRECT_COMMISSION',
  INDIRECT_COMMISSION: 'INDIRECT_COMMISSION',
  // Store bill-based score rows.
  OWNER: 'OWNER',
  EMPLOYEE: 'EMPLOYEE',
  OWNER_REFERRER: 'OWNER_REFERRER',
  // Pool distribution score rows.
  POOL_1: 'POOL_1',
  POOL_2: 'POOL_2',
  POOL_3: 'POOL_3',
  // Geo management score rows.
  WARD: 'WARD',
  PROVINCE: 'PROVINCE',
  REGION: 'REGION',
  TGD_VITA: 'TGD_VITA',
  // Company and member-action score rows.
  VITATH: 'VITATH',
  VITATH_VAT: 'VITATH_VAT',
  VITATH_POOL: 'VITATH_POOL',
  VITATH_STORE: 'VITATH_STORE',
  POINT_REDEEM: 'POINT_REDEEM',
  TRANSFER_OUT: 'TRANSFER_OUT',
  TRANSFER_IN: 'TRANSFER_IN',
  WITHDRAW: 'WITHDRAW',
  CHECKIN_REWARD: 'CHECKIN_REWARD',
  RANK_UPGRADE: 'RANK_UPGRADE',
} as const;

export const SCORE_TYPE_VALUES = Object.values(SCORE_TYPES);

export type ScoreType = (typeof SCORE_TYPES)[keyof typeof SCORE_TYPES];

export const SCORE_SOURCE_TYPES = {
  ORDER: 'order',
  STORE_BILL: 'store_bill',
  POOL: 'pool',
  COMMISSION: 'commission',
  TRANSFER: 'transfer',
  WITHDRAW: 'withdraw',
  REDEEM: 'redeem',
  CHECKIN: 'checkin',
  UPGRADE: 'upgrade',
  MANUAL: 'manual',
} as const;

export const SCORE_SOURCE_TYPE_VALUES = Object.values(SCORE_SOURCE_TYPES);

export type ScoreSourceType = (typeof SCORE_SOURCE_TYPES)[keyof typeof SCORE_SOURCE_TYPES];

export interface IScoreEntry {
  score_id: string;
  member_id: string;
  score_type: ScoreType;
  amount: number;
  source_type: ScoreSourceType;
  source_id: string;
  related_member_id?: string;
  level_at_time: number;
  pool_commission_id?: string;
  description: string;
  created_at: Date;
}

export interface IPoolConfig {
  pool_id: string;
  pool_name: string;
  percentage: number;
  eligible_min_level: number;
  point_usage_percentage: number;
}

export interface ILevelPoolMapping {
  level: number;
  pool_ids: string[];
}

export interface IScoreRateConfig {
  buyer_rates: Record<number, number>;
  voucher_rates: Record<number, number>;
  referrer_rates: Record<number, number>;
  owner_rate: number;
  employee_rate: number;
}

export interface IOrderScoreInput {
  order_id: string;
  buyer_member_id: string;
  vitath_member_id: string;
  order_amount: number;
  voucher_author_member_id?: string;
  referrer_member_id?: string;
  buyer_level: number;
}

export interface IStoreBillScoreInput {
  bill_id: string;
  store_id: string;
  payer_member_id: string;
  owner_member_id: string;
  amount: number;
  vita_cut_percentage: number;
  employee_member_id?: string;
  voucher_author_member_id?: string;
  payer_referrer_member_id?: string;
  owner_referrer_member_id?: string;
  payer_level: number;
  owner_level: number;
  ward_manager_member_id?: string;
  province_manager_member_id?: string;
  region_manager_member_id?: string;
  vitath_member_id: string;
  tgd_member_id: string;
  pool_recipients?: Array<{
    pool_id: 'pool_1' | 'pool_2' | 'pool_3';
    member_id: string;
    level: number;
  }>;
}
