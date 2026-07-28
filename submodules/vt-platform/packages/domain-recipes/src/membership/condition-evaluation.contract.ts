import type { MembershipConditionGroupType, MembershipConditionType } from './condition-matrix';

export interface MembershipCondition {
  type: MembershipConditionType;
  group: MembershipConditionGroupType;
  threshold: number;
  itemId?: string;
}

export interface MembershipConditionProgress {
  type: MembershipConditionType;
  group: MembershipConditionGroupType;
  threshold: number;
  actual: number;
  percent: number;
  passed: boolean;
  itemId?: string;
}

export interface MembershipMetricSnapshot {
  memberId: string;
  metrics: Partial<Record<MembershipConditionType, number>>;
}

export interface MembershipConditionEvaluationResult {
  memberId: string;
  passed: boolean;
  passedConditions: MembershipConditionType[];
  failedConditions: MembershipConditionType[];
  progress: MembershipConditionProgress[];
}

export interface MembershipConditionEvaluator {
  evaluate(
    snapshot: MembershipMetricSnapshot,
    conditions: MembershipCondition[],
  ): MembershipConditionEvaluationResult;
}
