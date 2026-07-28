import { DOMAIN_RECIPE_NUMBER_GUARD_MESSAGES } from './number-guards';

export type AffiliateCommissionBalanceBucket = 'pending' | 'available' | 'paid' | 'ignored';

export const AFFILIATE_COMMISSION_BALANCE_BUCKETS = {
  PENDING: 'pending',
  AVAILABLE: 'available',
  PAID: 'paid',
  IGNORED: 'ignored',
} as const;

export const AFFILIATE_COMMISSION_STATUSES = {
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  PAYABLE: 'PAYABLE',
  PAID: 'PAID',
} as const;

export const AFFILIATE_COMMISSION_REVERSIBLE_STATUSES = [
  AFFILIATE_COMMISSION_STATUSES.PENDING,
  AFFILIATE_COMMISSION_STATUSES.APPROVED,
  AFFILIATE_COMMISSION_STATUSES.PAID,
] as const;

export const AFFILIATE_COMMISSION_BALANCE_DEBIT_STATUSES = [
  AFFILIATE_COMMISSION_STATUSES.PAID,
] as const;

export const AFFILIATE_COMMISSION_BALANCE_MESSAGES = {
  FINITE_NON_NEGATIVE_NUMBER: (fieldName: string) => (
    `${fieldName} ${DOMAIN_RECIPE_NUMBER_GUARD_MESSAGES.FINITE_NON_NEGATIVE_NUMBER}`
  ),
  COMPONENTS_EXCEED_TOTAL_EARNED: 'affiliate available balance components exceed total earned',
} as const;

export interface AffiliateCommissionStatusTotal {
  status: string;
  total: number;
  count: number;
}

export interface AffiliateCommissionBucketTotal {
  total: number;
  count: number;
}

export interface AffiliateCommissionBalanceSummary {
  pending: AffiliateCommissionBucketTotal;
  available: AffiliateCommissionBucketTotal;
  paid: AffiliateCommissionBucketTotal;
  ignored: AffiliateCommissionBucketTotal;
  totalCount: number;
}

export interface AffiliateAvailableBalanceInput {
  totalEarned: number;
  totalWithdrawn: number;
  withdrawingAmount: number;
}

export function classifyAffiliateCommissionStatus(status: string): AffiliateCommissionBalanceBucket {
  switch (status) {
    case AFFILIATE_COMMISSION_STATUSES.PENDING:
    case AFFILIATE_COMMISSION_STATUSES.APPROVED:
      return AFFILIATE_COMMISSION_BALANCE_BUCKETS.PENDING;
    case AFFILIATE_COMMISSION_STATUSES.PAYABLE:
      return AFFILIATE_COMMISSION_BALANCE_BUCKETS.AVAILABLE;
    case AFFILIATE_COMMISSION_STATUSES.PAID:
      return AFFILIATE_COMMISSION_BALANCE_BUCKETS.PAID;
    default:
      return AFFILIATE_COMMISSION_BALANCE_BUCKETS.IGNORED;
  }
}

export function canReverseAffiliateCommissionStatus(status: string): boolean {
  return AFFILIATE_COMMISSION_REVERSIBLE_STATUSES.includes(
    status as (typeof AFFILIATE_COMMISSION_REVERSIBLE_STATUSES)[number],
  );
}

export function shouldDebitAffiliateCommissionBalance(status: string): boolean {
  return AFFILIATE_COMMISSION_BALANCE_DEBIT_STATUSES.includes(
    status as (typeof AFFILIATE_COMMISSION_BALANCE_DEBIT_STATUSES)[number],
  );
}

function emptyBucket(): AffiliateCommissionBucketTotal {
  return { total: 0, count: 0 };
}

function requireNonNegativeFiniteNumber(value: unknown, fieldName: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    throw new Error(AFFILIATE_COMMISSION_BALANCE_MESSAGES.FINITE_NON_NEGATIVE_NUMBER(fieldName));
  }
  return value;
}

export function summarizeAffiliateCommissionStatusTotals(
  rows: AffiliateCommissionStatusTotal[],
): AffiliateCommissionBalanceSummary {
  const summary: AffiliateCommissionBalanceSummary = {
    pending: emptyBucket(),
    available: emptyBucket(),
    paid: emptyBucket(),
    ignored: emptyBucket(),
    totalCount: 0,
  };

  for (const row of rows) {
    const bucket = classifyAffiliateCommissionStatus(row.status);
    const total = Math.round(requireNonNegativeFiniteNumber(row.total, 'affiliate commission total'));
    const count = Math.round(requireNonNegativeFiniteNumber(row.count, 'affiliate commission count'));
    summary[bucket].total += total;
    summary[bucket].count += count;
    summary.totalCount += count;
  }

  return summary;
}

export function calculateAffiliateAvailableBalance(input: AffiliateAvailableBalanceInput): number {
  const totalEarned = Math.round(requireNonNegativeFiniteNumber(input.totalEarned, 'affiliate total earned'));
  const totalWithdrawn = Math.round(requireNonNegativeFiniteNumber(input.totalWithdrawn, 'affiliate total withdrawn'));
  const withdrawingAmount = Math.round(requireNonNegativeFiniteNumber(input.withdrawingAmount, 'affiliate withdrawing amount'));
  const reservedBalance = totalWithdrawn + withdrawingAmount;

  if (reservedBalance > totalEarned) {
    throw new Error(AFFILIATE_COMMISSION_BALANCE_MESSAGES.COMPONENTS_EXCEED_TOTAL_EARNED);
  }

  return totalEarned - reservedBalance;
}
