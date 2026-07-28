import type { MembershipCondition, MembershipConditionEvaluationResult } from '.';
import {
  evaluateMembershipConditions,
  type ExtendedMembershipMetricSnapshot,
} from './membership-condition-evaluator';
import {
  normalizeMembershipBenefits,
  type LegacyMembershipBenefitConfig,
  type MembershipBenefitConfig,
} from './membership-benefit-engine';

export interface MembershipTierDefinition {
  id: string;
  title: string;
  level?: number;
  position?: number;
  isDefault?: boolean;
  conditions?: MembershipCondition[];
  benefits?: LegacyMembershipBenefitConfig;
}

export interface MembershipTierEvaluation {
  tier: MembershipTierDefinition;
  priority: number;
  eligible: boolean;
  benefits: MembershipBenefitConfig;
  evaluation: MembershipConditionEvaluationResult;
}

export interface MembershipTierResolution {
  memberId: string;
  currentTierId?: string;
  selectedTier: MembershipTierDefinition;
  selectedBenefits: MembershipBenefitConfig;
  action: 'stay' | 'upgrade';
  evaluations: MembershipTierEvaluation[];
}

export const MEMBERSHIP_TIER_ENGINE_MESSAGES = {
  TIER_ID_REQUIRED: 'Membership tier id is required.',
  LEVEL_POSITION_MISMATCH: (tierId: string) => (
    `Membership tier ${tierId} level and position must match when both are provided.`
  ),
  LEVEL_OR_POSITION_REQUIRED: (tierId: string) => `Membership tier ${tierId} requires level or position.`,
  PRIORITY_POSITIVE_INTEGER: (tierId: string) => `Membership tier ${tierId} priority must be a positive integer.`,
  CONDITIONS_REQUIRED: (tierId: string) => `Membership tier ${tierId} requires conditions unless it is default.`,
  CONDITIONS_MUST_BE_ARRAY: (tierId: string) => `Membership tier ${tierId} conditions must be an array.`,
  CONDITIONS_MUST_NOT_BE_EMPTY: (tierId: string) => (
    `Membership tier ${tierId} requires at least one condition unless it is default.`
  ),
  CURRENT_TIER_NOT_FOUND: (tierId: string) => `Current membership tier ${tierId} was not found in tier definitions.`,
  TIER_DEFINITIONS_REQUIRED: 'Cannot resolve membership tier without tier definitions.',
  CURRENT_OR_DEFAULT_REQUIRED: 'Cannot resolve membership tier without current tier or default tier.',
} as const;

function tierPriority(tier: MembershipTierDefinition): number {
  if (typeof tier.id !== 'string' || tier.id.trim().length === 0) {
    throw new Error(MEMBERSHIP_TIER_ENGINE_MESSAGES.TIER_ID_REQUIRED);
  }

  if (tier.level !== undefined && tier.position !== undefined && tier.level !== tier.position) {
    throw new Error(MEMBERSHIP_TIER_ENGINE_MESSAGES.LEVEL_POSITION_MISMATCH(tier.id));
  }

  const priority = tier.level !== undefined ? tier.level : tier.position;
  if (priority === undefined) {
    throw new Error(MEMBERSHIP_TIER_ENGINE_MESSAGES.LEVEL_OR_POSITION_REQUIRED(tier.id));
  }
  if (!Number.isFinite(priority) || !Number.isInteger(priority) || priority < 1) {
    throw new Error(MEMBERSHIP_TIER_ENGINE_MESSAGES.PRIORITY_POSITIVE_INTEGER(tier.id));
  }
  return priority;
}

function tierConditions(tier: MembershipTierDefinition): MembershipCondition[] {
  if (tier.conditions === undefined) {
    if (tier.isDefault === true) {
      return [];
    }
    throw new Error(MEMBERSHIP_TIER_ENGINE_MESSAGES.CONDITIONS_REQUIRED(tier.id));
  }
  if (!Array.isArray(tier.conditions)) {
    throw new Error(MEMBERSHIP_TIER_ENGINE_MESSAGES.CONDITIONS_MUST_BE_ARRAY(tier.id));
  }
  if (tier.conditions.length === 0 && tier.isDefault !== true) {
    throw new Error(MEMBERSHIP_TIER_ENGINE_MESSAGES.CONDITIONS_MUST_NOT_BE_EMPTY(tier.id));
  }
  return tier.conditions;
}

function sortByPriorityDesc(tiers: MembershipTierDefinition[]): MembershipTierDefinition[] {
  return [...tiers].sort((a, b) => tierPriority(b) - tierPriority(a));
}

export function evaluateMembershipTiers(
  snapshot: ExtendedMembershipMetricSnapshot,
  tiers: MembershipTierDefinition[],
): MembershipTierEvaluation[] {
  return sortByPriorityDesc(tiers).map((tier) => {
    const conditions = tierConditions(tier);
    const evaluation = evaluateMembershipConditions(snapshot, conditions);
    return {
      tier,
      priority: tierPriority(tier),
      eligible: tier.isDefault === true || evaluation.passed,
      benefits: normalizeMembershipBenefits(tier.benefits),
      evaluation,
    };
  });
}

export function resolveMembershipTier(
  snapshot: ExtendedMembershipMetricSnapshot,
  tiers: MembershipTierDefinition[],
  currentTierId?: string,
): MembershipTierResolution {
  if (tiers.length === 0) {
    throw new Error(MEMBERSHIP_TIER_ENGINE_MESSAGES.TIER_DEFINITIONS_REQUIRED);
  }

  const evaluations = evaluateMembershipTiers(snapshot, tiers);
  const current = currentTierId
    ? evaluations.find((item) => item.tier.id === currentTierId)
    : undefined;
  if (currentTierId && !current) {
    throw new Error(MEMBERSHIP_TIER_ENGINE_MESSAGES.CURRENT_TIER_NOT_FOUND(currentTierId));
  }

  const baseline = current ?? evaluations.find((item) => item.tier.isDefault);
  if (!baseline) {
    throw new Error(MEMBERSHIP_TIER_ENGINE_MESSAGES.CURRENT_OR_DEFAULT_REQUIRED);
  }

  const selected = evaluations.find((item) => (
    item.eligible && item.priority >= baseline.priority
  )) ?? baseline;

  return {
    memberId: snapshot.memberId,
    currentTierId,
    selectedTier: selected.tier,
    selectedBenefits: selected.benefits,
    action: selected.priority > baseline.priority ? 'upgrade' : 'stay',
    evaluations,
  };
}
