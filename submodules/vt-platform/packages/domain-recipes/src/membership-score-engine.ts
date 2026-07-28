import {
  DOMAIN_RECIPE_NUMBER_GUARD_MESSAGES,
  requireNonNegativeFiniteNumber,
  requirePositiveInteger,
} from './number-guards';
import {
  SCORE_SOURCE_TYPES,
  SCORE_TYPES,
  type ScoreSourceType,
  type ScoreType,
} from '@vt/loyalty-core';

export type MembershipScoreType = Extract<ScoreType,
  | typeof SCORE_TYPES.BUYER
  | typeof SCORE_TYPES.VOUCHER
  | typeof SCORE_TYPES.REFERRER
  | typeof SCORE_TYPES.OWNER
  | typeof SCORE_TYPES.EMPLOYEE
  | typeof SCORE_TYPES.OWNER_REFERRER
  | typeof SCORE_TYPES.POOL_1
  | typeof SCORE_TYPES.POOL_2
  | typeof SCORE_TYPES.POOL_3
  | typeof SCORE_TYPES.WARD
  | typeof SCORE_TYPES.PROVINCE
  | typeof SCORE_TYPES.REGION
  | typeof SCORE_TYPES.TGD_VITA
  | typeof SCORE_TYPES.VITATH
  | typeof SCORE_TYPES.VITATH_POOL
  | typeof SCORE_TYPES.VITATH_STORE
  | typeof SCORE_TYPES.POINT_REDEEM
  | typeof SCORE_TYPES.TRANSFER_OUT
  | typeof SCORE_TYPES.TRANSFER_IN
  | typeof SCORE_TYPES.WITHDRAW
  | typeof SCORE_TYPES.CHECKIN_REWARD
  | typeof SCORE_TYPES.RANK_UPGRADE
>;

export type MembershipScoreSourceType = Extract<ScoreSourceType,
  | typeof SCORE_SOURCE_TYPES.ORDER
  | typeof SCORE_SOURCE_TYPES.STORE_BILL
  | typeof SCORE_SOURCE_TYPES.POOL
  | typeof SCORE_SOURCE_TYPES.TRANSFER
  | typeof SCORE_SOURCE_TYPES.WITHDRAW
  | typeof SCORE_SOURCE_TYPES.REDEEM
  | typeof SCORE_SOURCE_TYPES.CHECKIN
  | typeof SCORE_SOURCE_TYPES.UPGRADE
  | typeof SCORE_SOURCE_TYPES.MANUAL
>;

export interface MembershipScoreEntry {
  score_id: string;
  member_id: string;
  score_type: MembershipScoreType;
  amount: number;
  source_type: MembershipScoreSourceType;
  source_id: string;
  related_member_id?: string;
  level_at_time: number;
  pool_commission_id?: string;
  description: string;
  created_at: string;
}

export interface ScoreRateConfig {
  buyer_rates: Record<number, number>;
  voucher_rates: Record<number, number>;
  referrer_rates: Record<number, number>;
  owner_rate: number;
  employee_rate: number;
}

export interface PoolConfig {
  pool_id: 'pool_1' | 'pool_2' | 'pool_3';
  pool_name: string;
  percentage: number;
  eligible_min_level: number;
  point_usage_percentage: number;
}

export interface GeoDistributionConfig {
  ward_percentage: number;
  province_percentage: number;
  region_percentage: number;
  tgd_vita_percentage: number;
  vitath_remainder: boolean;
}

export interface OrderScoreInput {
  order_id: string;
  buyer_member_id: string;
  vitath_member_id: string;
  order_amount: number;
  voucher_author_member_id?: string;
  referrer_member_id?: string;
  buyer_level: number;
}

export interface StoreBillScoreInput {
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

export const DEFAULT_SCORE_RATES: ScoreRateConfig = {
  buyer_rates: { 1: 0.10, 2: 0.15, 3: 0.25, 4: 0.35, 5: 0.50 },
  voucher_rates: { 1: 0.03, 2: 0.05, 3: 0.08, 4: 0.10, 5: 0.15 },
  referrer_rates: { 1: 0.01, 2: 0.02, 3: 0.03, 4: 0.04, 5: 0.05 },
  owner_rate: 0.10,
  employee_rate: 0.02,
};

export const DEFAULT_POOL_CONFIGS: PoolConfig[] = [
  { pool_id: 'pool_1', pool_name: 'Pool 1', percentage: 40, eligible_min_level: 1, point_usage_percentage: 5 },
  { pool_id: 'pool_2', pool_name: 'Pool 2', percentage: 30, eligible_min_level: 3, point_usage_percentage: 5 },
  { pool_id: 'pool_3', pool_name: 'Pool 3', percentage: 30, eligible_min_level: 5, point_usage_percentage: 5 },
];

export const DEFAULT_GEO_DISTRIBUTION: GeoDistributionConfig = {
  ward_percentage: 70,
  province_percentage: 15,
  region_percentage: 10,
  tgd_vita_percentage: 5,
  vitath_remainder: true,
};

const UNALLOCATED_POOL_LEVEL = 0;

export const MEMBERSHIP_SCORE_ENGINE_MESSAGES = {
  PERCENTAGE_BETWEEN_0_AND_100: (fieldName: string) => (
    `${fieldName} ${DOMAIN_RECIPE_NUMBER_GUARD_MESSAGES.PERCENTAGE_BETWEEN_0_AND_100}`
  ),
  RATE_REQUIRED: (rateName: string, level: number) => `${rateName} rate is required for level ${level}`,
  FIELD_REQUIRED: (fieldName: string) => `${fieldName} is required`,
  POOL_POINT_USAGE_PERCENTAGE_REQUIRED: 'pool point_usage_percentage is required',
  POOL_RECIPIENTS_MUST_BE_ARRAY: 'pool_recipients must be an array',
} as const;

function entryId(sourceType: MembershipScoreSourceType, sourceId: string, memberId: string, scoreType: string): string {
  return `score:${sourceType}:${sourceId}:${memberId}:${scoreType}`;
}

function makeEntry(
  memberId: string,
  scoreType: MembershipScoreType,
  amount: number,
  sourceType: MembershipScoreSourceType,
  sourceId: string,
  levelAtTime: number,
  description: string,
  relatedMemberId?: string,
): MembershipScoreEntry {
  return {
    score_id: entryId(sourceType, sourceId, memberId, scoreType),
    member_id: memberId,
    score_type: scoreType,
    amount: Math.round(amount),
    source_type: sourceType,
    source_id: sourceId,
    related_member_id: relatedMemberId,
    level_at_time: levelAtTime,
    description,
    created_at: new Date().toISOString(),
  };
}

function requirePercentage(value: number, fieldName: string): number {
  if (!Number.isFinite(value) || value < 0 || value > 100) {
    throw new Error(MEMBERSHIP_SCORE_ENGINE_MESSAGES.PERCENTAGE_BETWEEN_0_AND_100(fieldName));
  }
  return value;
}

function getRate(rates: Record<number, number>, level: number, rateName: string): number {
  const normalizedLevel = requirePositiveInteger(level, `${rateName}_level`);
  const rate = rates[level];
  if (!Number.isFinite(rate)) {
    throw new Error(MEMBERSHIP_SCORE_ENGINE_MESSAGES.RATE_REQUIRED(rateName, normalizedLevel));
  }
  return requireNonNegativeFiniteNumber(rate, `${rateName} rate for level ${normalizedLevel}`);
}

function requireScoreMemberId(value: string, fieldName: string): string {
  const normalized = value.trim();
  if (!normalized) {
    throw new Error(MEMBERSHIP_SCORE_ENGINE_MESSAGES.FIELD_REQUIRED(fieldName));
  }
  return normalized;
}

function requirePoolUsagePercentage(pools: PoolConfig[]): number {
  const usagePercentage = pools[0]?.point_usage_percentage;
  if (!Number.isFinite(usagePercentage)) {
    throw new Error(MEMBERSHIP_SCORE_ENGINE_MESSAGES.POOL_POINT_USAGE_PERCENTAGE_REQUIRED);
  }
  return requirePercentage(usagePercentage, 'pool point_usage_percentage');
}

function normalizePoolRecipients(input: StoreBillScoreInput): NonNullable<StoreBillScoreInput['pool_recipients']> {
  if (input.pool_recipients === undefined) {
    return [];
  }
  if (!Array.isArray(input.pool_recipients)) {
    throw new Error(MEMBERSHIP_SCORE_ENGINE_MESSAGES.POOL_RECIPIENTS_MUST_BE_ARRAY);
  }
  return input.pool_recipients.map((recipient, index) => ({
    pool_id: recipient.pool_id,
    member_id: requireScoreMemberId(recipient.member_id, `pool_recipients[${index}].member_id`),
    level: requirePositiveInteger(recipient.level, `pool_recipients[${index}].level`),
  }));
}

function sumAmounts(entries: MembershipScoreEntry[]): number {
  return entries.reduce((sum, entry) => sum + Math.max(0, entry.amount), 0);
}

function scoreTypeForPool(poolId: PoolConfig['pool_id']): Extract<MembershipScoreType, 'POOL_1' | 'POOL_2' | 'POOL_3'> {
  if (poolId === 'pool_2') return SCORE_TYPES.POOL_2;
  if (poolId === 'pool_3') return SCORE_TYPES.POOL_3;
  return SCORE_TYPES.POOL_1;
}

function uniqueTransferId(fromMemberId: string, toMemberId: string, points: number): string {
  const randomPart = Math.random().toString(36).slice(2, 10);
  return `transfer:${Date.now()}:${randomPart}:${fromMemberId}:${toMemberId}:${Math.abs(points)}`;
}

export function calculateOrderScores(
  input: OrderScoreInput,
  rates: ScoreRateConfig = DEFAULT_SCORE_RATES,
): MembershipScoreEntry[] {
  const entries: MembershipScoreEntry[] = [];
  const orderAmount = requireNonNegativeFiniteNumber(input.order_amount, 'order_amount');
  const vitathMemberId = requireScoreMemberId(input.vitath_member_id, 'vitath_member_id');
  const buyerRate = getRate(rates.buyer_rates, input.buyer_level, 'buyer');
  entries.push(makeEntry(
    input.buyer_member_id,
    SCORE_TYPES.BUYER,
    orderAmount * buyerRate,
    SCORE_SOURCE_TYPES.ORDER,
    input.order_id,
    input.buyer_level,
    `Diem mua hang don #${input.order_id} (${(buyerRate * 100).toFixed(0)}%)`,
    input.buyer_member_id,
  ));

  if (input.voucher_author_member_id) {
    const voucherRate = getRate(rates.voucher_rates, input.buyer_level, 'voucher');
    entries.push(makeEntry(
      input.voucher_author_member_id,
      SCORE_TYPES.VOUCHER,
      orderAmount * voucherRate,
      SCORE_SOURCE_TYPES.ORDER,
      input.order_id,
      input.buyer_level,
      `Hoa hong voucher don #${input.order_id}`,
      input.buyer_member_id,
    ));
  }

  if (input.referrer_member_id) {
    const referrerRate = getRate(rates.referrer_rates, input.buyer_level, 'referrer');
    entries.push(makeEntry(
      input.referrer_member_id,
      SCORE_TYPES.REFERRER,
      orderAmount * referrerRate,
      SCORE_SOURCE_TYPES.ORDER,
      input.order_id,
      input.buyer_level,
      `Hoa hong gioi thieu don #${input.order_id}`,
      input.buyer_member_id,
    ));
  }

  const distributedPct = buyerRate
    + (input.voucher_author_member_id ? getRate(rates.voucher_rates, input.buyer_level, 'voucher') : 0)
    + (input.referrer_member_id ? getRate(rates.referrer_rates, input.buyer_level, 'referrer') : 0);
  const vitathAmount = orderAmount * (1 - distributedPct) * 0.10;
  if (vitathAmount > 0) {
    entries.push(makeEntry(
      vitathMemberId,
      SCORE_TYPES.VITATH,
      vitathAmount,
      SCORE_SOURCE_TYPES.ORDER,
      input.order_id,
      0,
      `VITA giu lai don #${input.order_id}`,
    ));
  }

  return entries;
}

export function calculateStoreBillScores(
  input: StoreBillScoreInput,
  rates: ScoreRateConfig = DEFAULT_SCORE_RATES,
  pools: PoolConfig[] = DEFAULT_POOL_CONFIGS,
  geoDistribution: GeoDistributionConfig = DEFAULT_GEO_DISTRIBUTION,
): MembershipScoreEntry[] {
  const billAmount = requireNonNegativeFiniteNumber(input.amount, 'amount');
  const vitaCutPercentage = requirePercentage(input.vita_cut_percentage, 'vita_cut_percentage');
  const ownerLevel = requirePositiveInteger(input.owner_level, 'owner_level');
  const payerLevel = requirePositiveInteger(input.payer_level, 'payer_level');
  const ownerRate = requireNonNegativeFiniteNumber(rates.owner_rate, 'owner_rate');
  const employeeRate = requireNonNegativeFiniteNumber(rates.employee_rate, 'employee_rate');
  const distributable = billAmount * (1 - vitaCutPercentage / 100);
  const entries: MembershipScoreEntry[] = [];
  const vitathMemberId = requireScoreMemberId(input.vitath_member_id, 'vitath_member_id');
  const tgdMemberId = requireScoreMemberId(input.tgd_member_id, 'tgd_member_id');

  entries.push(makeEntry(
    input.owner_member_id,
    SCORE_TYPES.OWNER,
    distributable * ownerRate,
    SCORE_SOURCE_TYPES.STORE_BILL,
    input.bill_id,
    ownerLevel,
    `Diem chu cua hang hoa don #${input.bill_id}`,
    input.payer_member_id,
  ));
  entries.push(makeEntry(
    input.payer_member_id,
    SCORE_TYPES.BUYER,
    distributable * getRate(rates.buyer_rates, payerLevel, 'buyer'),
    SCORE_SOURCE_TYPES.STORE_BILL,
    input.bill_id,
    payerLevel,
    `Diem mua hang hoa don #${input.bill_id}`,
    input.payer_member_id,
  ));
  if (input.employee_member_id) {
    entries.push(makeEntry(
      input.employee_member_id,
      SCORE_TYPES.EMPLOYEE,
      distributable * employeeRate,
      SCORE_SOURCE_TYPES.STORE_BILL,
      input.bill_id,
      1,
      `Diem nhan vien hoa don #${input.bill_id}`,
      input.payer_member_id,
    ));
  }
  if (input.voucher_author_member_id) {
    entries.push(makeEntry(
      input.voucher_author_member_id,
      SCORE_TYPES.VOUCHER,
      distributable * getRate(rates.voucher_rates, payerLevel, 'voucher'),
      SCORE_SOURCE_TYPES.STORE_BILL,
      input.bill_id,
      payerLevel,
      `Hoa hong voucher hoa don #${input.bill_id}`,
      input.payer_member_id,
    ));
  }
  if (input.payer_referrer_member_id) {
    entries.push(makeEntry(
      input.payer_referrer_member_id,
      SCORE_TYPES.REFERRER,
      distributable * getRate(rates.referrer_rates, payerLevel, 'referrer'),
      SCORE_SOURCE_TYPES.STORE_BILL,
      input.bill_id,
      payerLevel,
      `Hoa hong gioi thieu khach hoa don #${input.bill_id}`,
      input.payer_member_id,
    ));
  }
  if (input.owner_referrer_member_id) {
    entries.push(makeEntry(
      input.owner_referrer_member_id,
      SCORE_TYPES.OWNER_REFERRER,
      distributable * getRate(rates.referrer_rates, ownerLevel, 'referrer'),
      SCORE_SOURCE_TYPES.STORE_BILL,
      input.bill_id,
      ownerLevel,
      `Hoa hong gioi thieu chu store hoa don #${input.bill_id}`,
      input.owner_member_id,
    ));
  }

  const vitaCut = billAmount * (vitaCutPercentage / 100);
  entries.push(makeEntry(
    vitathMemberId,
    SCORE_TYPES.VITATH_STORE,
    vitaCut,
    SCORE_SOURCE_TYPES.STORE_BILL,
    input.bill_id,
    0,
    `VITA cut ${vitaCutPercentage}% hoa don #${input.bill_id}`,
  ));

  const directDistributed = sumAmounts(entries.filter((entry) => entry.score_type !== SCORE_TYPES.VITATH_STORE));
  const poolUsagePercentage = requirePoolUsagePercentage(pools);
  const poolRecipients = normalizePoolRecipients(input);
  const poolBase = Math.min(
    Math.max(0, distributable - directDistributed),
    distributable * (poolUsagePercentage / 100),
  );

  pools.forEach((pool) => {
    const poolPercentage = requirePercentage(pool.percentage, `${pool.pool_id}.percentage`);
    const eligibleMinLevel = requirePositiveInteger(pool.eligible_min_level, `${pool.pool_id}.eligible_min_level`);
    const poolAmount = poolBase * (poolPercentage / 100);
    if (poolAmount <= 0) return;
    const recipient = poolRecipients.find((item) => (
      item.pool_id === pool.pool_id && item.level >= eligibleMinLevel
    ));
    const poolMemberId = recipient ? recipient.member_id : vitathMemberId;
    const poolScoreType = recipient ? scoreTypeForPool(pool.pool_id) : SCORE_TYPES.VITATH_POOL;
    const poolLevel = recipient ? recipient.level : UNALLOCATED_POOL_LEVEL;
    const poolDescription = recipient
      ? `${pool.pool_name} hoa don #${input.bill_id}`
      : `${pool.pool_name} chua phan bo hoa don #${input.bill_id}`;
    entries.push(makeEntry(
      poolMemberId,
      poolScoreType,
      poolAmount,
      SCORE_SOURCE_TYPES.STORE_BILL,
      input.bill_id,
      poolLevel,
      poolDescription,
    ));
  });

  const geoBase = Math.max(0, distributable - directDistributed - poolBase);
  [
    {
      member_id: input.ward_manager_member_id,
      score_type: SCORE_TYPES.WARD,
      percentage: geoDistribution.ward_percentage,
      fieldName: 'geoDistribution.ward_percentage',
      label: 'Quan ly phuong',
    },
    {
      member_id: input.province_manager_member_id,
      score_type: SCORE_TYPES.PROVINCE,
      percentage: geoDistribution.province_percentage,
      fieldName: 'geoDistribution.province_percentage',
      label: 'Quan ly tinh',
    },
    {
      member_id: input.region_manager_member_id,
      score_type: SCORE_TYPES.REGION,
      percentage: geoDistribution.region_percentage,
      fieldName: 'geoDistribution.region_percentage',
      label: 'Quan ly mien',
    },
    {
      member_id: tgdMemberId,
      score_type: SCORE_TYPES.TGD_VITA,
      percentage: geoDistribution.tgd_vita_percentage,
      fieldName: 'geoDistribution.tgd_vita_percentage',
      label: 'TGD VITA',
    },
  ].forEach((row) => {
    const amount = geoBase * (requirePercentage(row.percentage, row.fieldName) / 100);
    if (amount <= 0) return;
    entries.push(makeEntry(
      row.member_id ?? vitathMemberId,
      row.member_id ? row.score_type : SCORE_TYPES.VITATH,
      amount,
      SCORE_SOURCE_TYPES.STORE_BILL,
      input.bill_id,
      0,
      `${row.label} hoa don #${input.bill_id}`,
    ));
  });

  return entries;
}

export function createRedeemEntry(memberId: string, points: number, sourceId: string, level: number): MembershipScoreEntry {
  return makeEntry(
    memberId,
    SCORE_TYPES.POINT_REDEEM,
    -Math.abs(points),
    SCORE_SOURCE_TYPES.REDEEM,
    sourceId,
    level,
    `Su dung ${points} diem cho don #${sourceId}`,
  );
}

export function createTransferEntries(
  fromMemberId: string,
  toMemberId: string,
  points: number,
  fromLevel: number,
  toLevel: number,
  transferId = uniqueTransferId(fromMemberId, toMemberId, points),
): [MembershipScoreEntry, MembershipScoreEntry] {
  return [
    makeEntry(
      fromMemberId,
      SCORE_TYPES.TRANSFER_OUT,
      -Math.abs(points),
      SCORE_SOURCE_TYPES.TRANSFER,
      transferId,
      fromLevel,
      `Chuyen ${points} diem`,
    ),
    makeEntry(
      toMemberId,
      SCORE_TYPES.TRANSFER_IN,
      Math.abs(points),
      SCORE_SOURCE_TYPES.TRANSFER,
      transferId,
      toLevel,
      `Nhan ${points} diem`,
    ),
  ];
}
