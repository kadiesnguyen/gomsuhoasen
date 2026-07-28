import { requireNonNegativeFiniteNumber } from './number-guards';

export interface MembershipFundAllocationConfig {
  referrerDirectRewardPercent?: unknown;
  nationalShare1Percent?: unknown;
  nationalShare2Percent?: unknown;
  nationalShare3Percent?: unknown;
  regionalShare1Percent?: unknown;
  regionalShare2Percent?: unknown;
  regionalShare3Percent?: unknown;
}

export interface MembershipFundAllocationBreakdown {
  referrerDirect: number;
  regionShared: number;
  eventFund: number;
  tenantRevenue: number;
  totalPercent: number;
}

export class MembershipFundAllocationInputError extends Error {
  constructor(
    public readonly fieldName: string,
    message = `Invalid membership fund allocation field: ${fieldName}`,
  ) {
    super(message);
    this.name = 'MembershipFundAllocationInputError';
  }
}

const membershipFundNumberGuardOptions = {
  createError: (fieldName: string) => new MembershipFundAllocationInputError(fieldName),
};

function requireFundAllocationConfig(value: unknown): MembershipFundAllocationConfig {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new MembershipFundAllocationInputError('fundAllocation');
  }
  return value as MembershipFundAllocationConfig;
}

function calculateAllocationAmount(baseAmount: number, percent: number): number {
  return Math.floor((baseAmount * percent) / 100);
}

export function calculateMembershipFundAllocationBreakdown(input: {
  paidPrice: unknown;
  fundAllocation: unknown;
}): MembershipFundAllocationBreakdown {
  const paidPrice = requireNonNegativeFiniteNumber(input.paidPrice, 'paidPrice', membershipFundNumberGuardOptions);
  const fundAllocation = requireFundAllocationConfig(input.fundAllocation);
  const referrerDirectPercent = requireNonNegativeFiniteNumber(
    fundAllocation.referrerDirectRewardPercent,
    'fundAllocation.referrerDirectRewardPercent',
    membershipFundNumberGuardOptions,
  );
  const eventFundPercent = requireNonNegativeFiniteNumber(
    fundAllocation.nationalShare1Percent,
    'fundAllocation.nationalShare1Percent',
    membershipFundNumberGuardOptions,
  )
    + requireNonNegativeFiniteNumber(
      fundAllocation.nationalShare2Percent,
      'fundAllocation.nationalShare2Percent',
      membershipFundNumberGuardOptions,
    )
    + requireNonNegativeFiniteNumber(
      fundAllocation.nationalShare3Percent,
      'fundAllocation.nationalShare3Percent',
      membershipFundNumberGuardOptions,
    );
  const regionSharedPercent = requireNonNegativeFiniteNumber(
    fundAllocation.regionalShare1Percent,
    'fundAllocation.regionalShare1Percent',
    membershipFundNumberGuardOptions,
  )
    + requireNonNegativeFiniteNumber(
      fundAllocation.regionalShare2Percent,
      'fundAllocation.regionalShare2Percent',
      membershipFundNumberGuardOptions,
    )
    + requireNonNegativeFiniteNumber(
      fundAllocation.regionalShare3Percent,
      'fundAllocation.regionalShare3Percent',
      membershipFundNumberGuardOptions,
    );
  const totalPercent = referrerDirectPercent + eventFundPercent + regionSharedPercent;
  if (totalPercent > 100) {
    throw new MembershipFundAllocationInputError('fundAllocation.percentTotal');
  }

  const referrerDirect = calculateAllocationAmount(paidPrice, referrerDirectPercent);
  const regionShared = calculateAllocationAmount(paidPrice, regionSharedPercent);
  const eventFund = calculateAllocationAmount(paidPrice, eventFundPercent);
  const allocatedAmount = referrerDirect + regionShared + eventFund;
  if (allocatedAmount > paidPrice) {
    throw new MembershipFundAllocationInputError('fundAllocation.amountTotal');
  }

  return {
    referrerDirect,
    regionShared,
    eventFund,
    tenantRevenue: paidPrice - allocatedAmount,
    totalPercent,
  };
}
