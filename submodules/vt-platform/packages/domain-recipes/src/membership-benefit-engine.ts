import { DOMAIN_RECIPE_NUMBER_GUARD_MESSAGES } from './number-guards';

export interface LegacyMembershipBenefitConfig {
  enableDiscountPercent?: boolean;
  discountPercent?: number;
  enableAllowWithdraw?: boolean;
  allowWithdraw?: boolean;
  enableCommissions?: boolean;
  commissions?: number;
  enableSelfPoint?: boolean;
  selfPoint?: number;
}

export interface MembershipBenefitConfig {
  discountPercent: number;
  allowWithdraw: boolean;
  commissionRate: number;
  selfPointRate: number;
  pointsMultiplier: number;
}

export const MEMBERSHIP_BENEFIT_ENGINE_MESSAGES = {
  FINITE_NON_NEGATIVE_NUMBER: (fieldName: string) => (
    `${fieldName} ${DOMAIN_RECIPE_NUMBER_GUARD_MESSAGES.FINITE_NON_NEGATIVE_NUMBER}`
  ),
  PERCENTAGE_BETWEEN_0_AND_100: (fieldName: string) => (
    `${fieldName} ${DOMAIN_RECIPE_NUMBER_GUARD_MESSAGES.PERCENTAGE_BETWEEN_0_AND_100}`
  ),
} as const;

function nonNegative(value: number | undefined, fieldName: string): number {
  if (value === undefined || value === null) {
    return 0;
  }
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(MEMBERSHIP_BENEFIT_ENGINE_MESSAGES.FINITE_NON_NEGATIVE_NUMBER(fieldName));
  }
  return value;
}

function percentage(value: number | undefined, fieldName: string): number {
  const normalized = nonNegative(value, fieldName);
  if (normalized > 100) {
    throw new Error(MEMBERSHIP_BENEFIT_ENGINE_MESSAGES.PERCENTAGE_BETWEEN_0_AND_100(fieldName));
  }
  return normalized;
}

export function normalizeMembershipBenefits(input: LegacyMembershipBenefitConfig = {}): MembershipBenefitConfig {
  const selfPointRate = input.enableSelfPoint === false ? 0 : percentage(input.selfPoint, 'selfPoint');

  return {
    discountPercent: input.enableDiscountPercent === false ? 0 : percentage(input.discountPercent, 'discountPercent'),
    allowWithdraw: input.enableAllowWithdraw === false ? false : Boolean(input.allowWithdraw),
    commissionRate: input.enableCommissions === false ? 0 : percentage(input.commissions, 'commissions'),
    selfPointRate,
    pointsMultiplier: 1 + (selfPointRate / 100),
  };
}
