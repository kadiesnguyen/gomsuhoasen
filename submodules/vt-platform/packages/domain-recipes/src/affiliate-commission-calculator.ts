import { AFFILIATE_COMMISSION_RATES, AffiliateCommissionType } from '.';
import type { ModernAffiliateCommissionType } from '.';
import { MembershipConditionType } from '.';
import { DOMAIN_RECIPE_NUMBER_GUARD_MESSAGES } from './number-guards';

export interface AffiliateUplineNode {
  memberId: string;
  depth: number;
}

export interface AffiliateLeadershipMatch {
  memberId: string;
  depth: number;
  accumulatedTeamRevenueAfterOrder: number;
}

export interface AffiliateCommissionFeatureFlags {
  direct?: boolean;
  indirect?: boolean;
}

export interface AffiliateCommissionInput {
  orderId: string;
  buyerId: string;
  targetId: string;
  totalPayment: number;
  upline?: AffiliateUplineNode[];
  enabled?: AffiliateCommissionFeatureFlags;
}

export interface AffiliateCommissionLedgerEntry {
  idempotencyKey: string;
  memberId: string;
  type: ModernAffiliateCommissionType;
  amount: number;
  eligibleRevenue?: number;
}

export interface AffiliateMetricIncrement {
  memberId: string;
  type: MembershipConditionType;
  amount: number;
}

export interface AffiliateCommissionCalculation {
  ledger: AffiliateCommissionLedgerEntry[];
  metricIncrements: AffiliateMetricIncrement[];
}

export interface AffiliateCommissionIdempotencyKeyInput {
  orderId: string;
  memberId: string;
  type: ModernAffiliateCommissionType;
  tenantId?: string;
}

const DEFAULT_ENABLED: Required<AffiliateCommissionFeatureFlags> = {
  direct: true,
  indirect: true,
};

export const AFFILIATE_COMMISSION_CALCULATOR_MESSAGES = {
  FINITE_NON_NEGATIVE_NUMBER: (fieldName: string) => (
    `${fieldName} ${DOMAIN_RECIPE_NUMBER_GUARD_MESSAGES.FINITE_NON_NEGATIVE_NUMBER}`
  ),
} as const;

export function createAffiliateCommissionIdempotencyKey(input: AffiliateCommissionIdempotencyKeyInput): string {
  const tenantPrefix = input.tenantId ? `${input.tenantId}:` : '';
  return `commission:${tenantPrefix}${input.orderId}:${input.memberId}:${input.type}`;
}

function positiveAmount(amount: number): number {
  return Math.max(0, Math.round(amount));
}

function pushCommission(
  result: AffiliateCommissionCalculation,
  input: AffiliateCommissionInput,
  memberId: string | undefined,
  type: ModernAffiliateCommissionType,
  amount: number,
  metricPairs: Array<[MembershipConditionType, number]>,
  eligibleRevenue?: number,
): void {
  if (!memberId || memberId === input.buyerId) {
    return;
  }
  const rounded = positiveAmount(amount);
  if (rounded <= 0) {
    return;
  }
  result.ledger.push({
    idempotencyKey: createAffiliateCommissionIdempotencyKey({
      orderId: input.orderId,
      memberId,
      type,
    }),
    memberId,
    type,
    amount: rounded,
    ...(eligibleRevenue !== undefined ? { eligibleRevenue: positiveAmount(eligibleRevenue) } : {}),
  });
  for (const [metricType, metricAmount] of metricPairs) {
    result.metricIncrements.push({
      memberId,
      type: metricType,
      amount: positiveAmount(metricAmount),
    });
  }
}

function commissionMetrics(
  commissionType: MembershipConditionType,
  accumulatedType: MembershipConditionType,
  amount: number,
): Array<[MembershipConditionType, number]> {
  return [
    [commissionType, amount],
    [accumulatedType, amount],
    [MembershipConditionType.AFF_PERSONAL_ACCUMULATED_COMMISSION, amount],
  ];
}

function requireNonNegativeFiniteAmount(value: unknown, fieldName: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    throw new Error(AFFILIATE_COMMISSION_CALCULATOR_MESSAGES.FINITE_NON_NEGATIVE_NUMBER(fieldName));
  }
  return value;
}

export function calculateAffiliateCommissions(input: AffiliateCommissionInput): AffiliateCommissionCalculation {
  const enabled = { ...DEFAULT_ENABLED, ...input.enabled };
  const result: AffiliateCommissionCalculation = { ledger: [], metricIncrements: [] };
  const totalPayment = requireNonNegativeFiniteAmount(input.totalPayment, 'totalPayment');
  if (totalPayment <= 0) {
    return result;
  }

  const direct = input.upline?.find((node) => node.depth === 1);
  if (enabled.direct) {
    const amount = totalPayment * AFFILIATE_COMMISSION_RATES.DIRECT;
    pushCommission(result, input, direct?.memberId, AffiliateCommissionType.DIRECT, amount, [
      ...commissionMetrics(
        MembershipConditionType.AFF_PERSONAL_MONTHLY_DIRECT_COMMISSION,
        MembershipConditionType.AFF_PERSONAL_ACCUMULATED_DIRECT_COMMISSION,
        amount,
      ),
      [MembershipConditionType.AFF_PERSONAL_MONTHLY_DIRECT_REVENUE, totalPayment],
      [MembershipConditionType.AFF_PERSONAL_ACCUMULATED_DIRECT_REVENUE, totalPayment],
    ]);
  }

  const indirect = input.upline?.find((node) => node.depth === 2);
  if (enabled.indirect) {
    const amount = totalPayment * AFFILIATE_COMMISSION_RATES.INDIRECT;
    pushCommission(result, input, indirect?.memberId, AffiliateCommissionType.INDIRECT, amount, [
      ...commissionMetrics(
        MembershipConditionType.AFF_PERSONAL_MONTHLY_INDIRECT_COMMISSION,
        MembershipConditionType.AFF_PERSONAL_ACCUMULATED_INDIRECT_COMMISSION,
        amount,
      ),
      [MembershipConditionType.AFF_PERSONAL_MONTHLY_INDIRECT_REVENUE, totalPayment],
      [MembershipConditionType.AFF_PERSONAL_ACCUMULATED_INDIRECT_REVENUE, totalPayment],
    ]);
  }

  return result;
}
