export enum AffiliateCommissionType {
  DIRECT = 'DIRECT',
  INDIRECT = 'INDIRECT',
  LEADER1 = 'LEADER1',
  LEADER2 = 'LEADER2',
  HIGH_LEADER = 'HIGH_LEADER',
  OUTSTANDING_MEMBER = 'OUTSTANDING_MEMBER',
  AMBASSADOR = 'AMBASSADOR',
}

export const MODERN_AFFILIATE_COMMISSION_TYPES = [
  AffiliateCommissionType.DIRECT,
  AffiliateCommissionType.INDIRECT,
] as const;

export type ModernAffiliateCommissionType = typeof MODERN_AFFILIATE_COMMISSION_TYPES[number];

export const LEGACY_TITLE_COMMISSION_TYPES = [
  AffiliateCommissionType.LEADER1,
  AffiliateCommissionType.LEADER2,
  AffiliateCommissionType.HIGH_LEADER,
  AffiliateCommissionType.OUTSTANDING_MEMBER,
  AffiliateCommissionType.AMBASSADOR,
] as const;

export type LegacyTitleCommissionType = typeof LEGACY_TITLE_COMMISSION_TYPES[number];

const MODERN_COMMISSION_TYPE_SET = new Set<string>(MODERN_AFFILIATE_COMMISSION_TYPES);
const LEGACY_TITLE_COMMISSION_TYPE_SET = new Set<string>(LEGACY_TITLE_COMMISSION_TYPES);

export function isModernAffiliateCommissionType(value: string | null | undefined): value is ModernAffiliateCommissionType {
  return !!value && MODERN_COMMISSION_TYPE_SET.has(value);
}

export function isLegacyTitleCommissionType(value: string | null | undefined): value is LegacyTitleCommissionType {
  return !!value && LEGACY_TITLE_COMMISSION_TYPE_SET.has(value);
}

export const AFFILIATE_COMMISSION_RATES = {
  DIRECT: 0.1,
  INDIRECT: 0.07,
  LEADER1: 0.03,
  LEADER2: 0.01,
  HIGH_LEADER_POOL: 0.03,
  OUTSTANDING_MEMBER: 0.01,
  AMBASSADOR_POOL: 0.05,
} as const;

export enum AffiliateRevenueMetric {
  PERSONAL_DAILY_SALES = 'PERSONAL_DAILY_SALES',
  PERSONAL_MONTHLY_SALES = 'PERSONAL_MONTHLY_SALES',
  PERSONAL_YEARLY_SALES = 'PERSONAL_YEARLY_SALES',
  PERSONAL_ACCUMULATED_SALES = 'PERSONAL_ACCUMULATED_SALES',
  TEAM_DAILY_REVENUE = 'TEAM_DAILY_REVENUE',
  TEAM_MONTHLY_REVENUE = 'TEAM_MONTHLY_REVENUE',
  TEAM_YEARLY_REVENUE = 'TEAM_YEARLY_REVENUE',
  TEAM_ACCUMULATED_REVENUE = 'TEAM_ACCUMULATED_REVENUE',
  COMPANY_DAILY_REVENUE = 'COMPANY_DAILY_REVENUE',
  COMPANY_MONTHLY_REVENUE = 'COMPANY_MONTHLY_REVENUE',
  COMPANY_YEARLY_REVENUE = 'COMPANY_YEARLY_REVENUE',
  COMPANY_ACCUMULATED_REVENUE = 'COMPANY_ACCUMULATED_REVENUE',
}
