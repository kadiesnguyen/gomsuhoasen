import { MembershipConditionType } from '.';
import type {
  MembershipCondition,
  MembershipConditionEvaluationResult,
  MembershipConditionProgress,
  MembershipMetricSnapshot,
} from '.';
import { requireNonNegativeFiniteNumber } from './number-guards';

export type MembershipMetricKey = MembershipConditionType | `${MembershipConditionType}:${string}`;

export interface ExtendedMembershipMetricSnapshot extends Omit<MembershipMetricSnapshot, 'metrics'> {
  metrics: Partial<Record<MembershipMetricKey, number>>;
}

export const MEMBERSHIP_CONDITION_EVALUATOR_MESSAGES = {
  METRIC_REQUIRED: (key: MembershipMetricKey) => `metrics.${key} is required`,
} as const;

function metricKey(condition: MembershipCondition): MembershipMetricKey {
  return condition.itemId ? `${condition.type}:${condition.itemId}` : condition.type;
}

function metricValue(snapshot: ExtendedMembershipMetricSnapshot, condition: MembershipCondition): number {
  const key = metricKey(condition);
  const value = snapshot.metrics[key];
  if (value === undefined) {
    throw new Error(MEMBERSHIP_CONDITION_EVALUATOR_MESSAGES.METRIC_REQUIRED(key));
  }
  return requireNonNegativeFiniteNumber(value, `metrics.${key}`);
}

function progressPercent(actual: number, threshold: number): number {
  if (threshold <= 0) {
    return 100;
  }
  return Math.max(0, Math.min(100, Math.round((actual / threshold) * 100)));
}

export function evaluateMembershipConditions(
  snapshot: ExtendedMembershipMetricSnapshot,
  conditions: MembershipCondition[],
): MembershipConditionEvaluationResult {
  const passedConditions: MembershipConditionType[] = [];
  const failedConditions: MembershipConditionType[] = [];
  const progress: MembershipConditionProgress[] = [];

  const andConditions = conditions.filter((condition) => condition.group === 'AND');
  const orConditions = conditions.filter((condition) => condition.group === 'OR');

  for (const condition of conditions) {
    const threshold = requireNonNegativeFiniteNumber(condition.threshold, `${condition.type}.threshold`);
    const actual = metricValue(snapshot, condition);
    const passed = actual >= threshold;
    if (passed) {
      passedConditions.push(condition.type);
    } else {
      failedConditions.push(condition.type);
    }
    progress.push({
      type: condition.type,
      group: condition.group,
      threshold,
      actual,
      percent: progressPercent(actual, threshold),
      passed,
      ...(condition.itemId ? { itemId: condition.itemId } : {}),
    });
  }

  const andPassed = andConditions.every((condition) => (
    metricValue(snapshot, condition) >= requireNonNegativeFiniteNumber(condition.threshold, `${condition.type}.threshold`)
  ));
  const orPassed = orConditions.length === 0
    || orConditions.some((condition) => (
      metricValue(snapshot, condition) >= requireNonNegativeFiniteNumber(condition.threshold, `${condition.type}.threshold`)
    ));

  return {
    memberId: snapshot.memberId,
    passed: andPassed && orPassed,
    passedConditions,
    failedConditions,
    progress,
  };
}
