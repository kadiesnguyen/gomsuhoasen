import type { ComparisonOperatorType, ConditionPeriodType } from './membership-condition.constants';

export enum RuleNodeType {
    METRIC = 'METRIC',
    GROUP = 'GROUP'
}

export interface MetricDimensionConfig {
    kind?: string;
    itemId?: string;
}

export interface TierQualificationRuleNode {
    type: RuleNodeType | 'METRIC' | 'GROUP';
    metricCode?: string;
    comparison?: ComparisonOperatorType | string;
    value?: number;
    dimension?: MetricDimensionConfig;
    logicalOperator?: 'AND' | 'OR' | string;
    children?: TierQualificationRuleNode[];
}

export interface MembershipConditionNode {
    type: 'GROUP' | 'CONDITION';
    // GROUP fields
    logicalOperator?: 'AND' | 'OR';
    children?: MembershipConditionNode[];
    // CONDITION fields
    conditionCode?: string;
    comparison?: ComparisonOperatorType;
    value?: number;
    period?: string;
    dimension?: {
        kind: string;
        itemId?: string;
        key?: string;
        value?: string;
    };
    metadata?: Record<string, unknown>;
}

export type MembershipConditionInput = MembershipConditionNode | MembershipConditionNode[];

export interface FactDependency {
    metricCode: string;
    periodType: string;
    dimension?: {
        kind: string;
        itemId?: string;
    };
}

export interface CompilationResult {
    ast?: TierQualificationRuleNode;
    factDependencies: FactDependency[];
}

export interface ConditionValidationError {
    path: string;
    message: string;
}

export interface ConditionValidationResult {
    isValid: boolean;
    errors: ConditionValidationError[];
}

export interface TierEvaluationResult {
    isEligible: boolean;
    failingMetrics: Array<{
        metricCode: string;
        required: number;
        actual: number;
        dimension?: MetricDimensionConfig;
    }>;
    progressByMetric: Array<{
        metricCode: string;
        required: number;
        actual: number;
        percent: number;
        dimension?: MetricDimensionConfig;
    }>;
}
