import {
    type TierQualificationRuleNode,
    type MembershipConditionNode,
    type TierEvaluationResult,
    type MetricDimensionConfig,
    RuleNodeType
} from '@vt/loyalty-core';
import {
    evaluateMembershipConditions,
    type ExtendedMembershipMetricSnapshot,
} from './membership-condition-evaluator';
import {
    type MembershipCondition,
    type MembershipConditionType,
} from '.';

export class TierQualificationEvaluator {
    /**
     * Evaluates the persisted qualification AST used by legacy/published tiers.
     */
    evaluateAst(ast: unknown, metrics: Record<string, number>): TierEvaluationResult {
        if (!ast) {
            return { isEligible: true, failingMetrics: [], progressByMetric: [] };
        }
        return this.processNode(ast as TierQualificationRuleNode, metrics);
    }

    private processNode(node: TierQualificationRuleNode, metrics: Record<string, number>): TierEvaluationResult {
        if (node.type === RuleNodeType.METRIC) {
            const metricCode = this.requireMetricCode(node.metricCode);
            const dimension = node.dimension;
            const metricKey = this.toPartyMetricLookupKey(metricCode, dimension);
            const actualValue = this.readMetricInputValue(metrics, metricKey);
            const requiredValue = this.requireNonNegativeMetricNumber(node.value, `${metricKey} required value`);
            let isEligible = false;

            switch (node.comparison) {
                case 'GTE':
                    isEligible = actualValue >= requiredValue;
                    break;
                case 'LTE':
                    isEligible = actualValue <= requiredValue;
                    break;
                case 'EQ':
                    isEligible = actualValue === requiredValue;
                    break;
                default:
                    throw new Error(`Unsupported tier comparison operator: ${node.comparison}`);
            }

            return {
                isEligible,
                failingMetrics: isEligible ? [] : [{
                    metricCode,
                    required: requiredValue,
                    actual: actualValue,
                    dimension,
                }],
                progressByMetric: [{
                    metricCode,
                    required: requiredValue,
                    actual: actualValue,
                    percent: this.calculateProgressPercent(actualValue, requiredValue, node.comparison),
                    dimension,
                }],
            };
        }

        if (node.type === RuleNodeType.GROUP) {
            const children = Array.isArray(node.children) ? node.children : [];
            if (children.length === 0) {
                return { isEligible: true, failingMetrics: [], progressByMetric: [] };
            }

            if (node.logicalOperator === 'AND') {
                const failingMetrics: TierEvaluationResult['failingMetrics'] = [];
                const progressByMetric: TierEvaluationResult['progressByMetric'] = [];
                for (const child of children) {
                    const result = this.processNode(child, metrics);
                    progressByMetric.push(...result.progressByMetric);
                    if (!result.isEligible) {
                        failingMetrics.push(...result.failingMetrics);
                    }
                }
                return {
                    isEligible: failingMetrics.length === 0,
                    failingMetrics,
                    progressByMetric,
                };
            }

            if (node.logicalOperator === 'OR') {
                const combinedFailingMetrics: TierEvaluationResult['failingMetrics'] = [];
                const progressByMetric: TierEvaluationResult['progressByMetric'] = [];
                for (const child of children) {
                    const result = this.processNode(child, metrics);
                    progressByMetric.push(...result.progressByMetric);
                    if (result.isEligible) {
                        return { isEligible: true, failingMetrics: [], progressByMetric };
                    }
                    combinedFailingMetrics.push(...result.failingMetrics);
                }
                return {
                    isEligible: false,
                    failingMetrics: combinedFailingMetrics,
                    progressByMetric,
                };
            }
        }

        return { isEligible: false, failingMetrics: [], progressByMetric: [] };
    }

    /**
     * Evaluates canonical membership conditions against a flat dictionary of numeric metrics
     * using the shared @vt/domain-recipes evaluator.
     */
    evaluateConditions(
        partyId: string,
        conditionsTree: MembershipConditionNode | MembershipConditionNode[] | undefined | null,
        metrics: Record<string, number>
    ): TierEvaluationResult {
        if (!conditionsTree) {
            return { isEligible: true, failingMetrics: [], progressByMetric: [] };
        }

        const flatConditions = this.flattenMembershipConditions(conditionsTree);

        const snapshotMetrics: Partial<Record<string, number>> = {};
        for (const [key, value] of Object.entries(metrics)) {
            snapshotMetrics[key] = value;
        }

        for (const condition of flatConditions) {
            const recipeKey = condition.itemId ? `${condition.type}:${condition.itemId}` : condition.type;
            const localKey = condition.itemId
                ? this.toPartyMetricLookupKey(condition.type, { kind: 'ITEM', itemId: condition.itemId })
                : condition.type;
            if (snapshotMetrics[recipeKey] === undefined) {
                snapshotMetrics[recipeKey] = snapshotMetrics[localKey] ?? 0;
            }
        }

        const snapshot: ExtendedMembershipMetricSnapshot = {
            memberId: partyId,
            metrics: snapshotMetrics as Partial<Record<MembershipConditionType | `${MembershipConditionType}:${string}`, number>>,
        };

        const result = evaluateMembershipConditions(snapshot, flatConditions);

        const failingMetrics = result.progress
            .filter(p => !p.passed)
            .map(p => ({
                metricCode: p.type,
                required: p.threshold,
                actual: p.actual,
                dimension: p.itemId ? { kind: 'ITEM', itemId: p.itemId } : undefined,
            }));

        const progressByMetric = result.progress.map(p => ({
            metricCode: p.type,
            required: p.threshold,
            actual: p.actual,
            percent: p.percent,
            dimension: p.itemId ? { kind: 'ITEM', itemId: p.itemId } : undefined,
        }));

        return {
            isEligible: result.passed,
            failingMetrics,
            progressByMetric,
        };
    }

    private flattenMembershipConditions(
        node: MembershipConditionNode | MembershipConditionNode[] | undefined | null,
        parentGroup: 'AND' | 'OR' = 'AND',
    ): MembershipCondition[] {
        if (!node) return [];

        if (Array.isArray(node)) {
            const result: MembershipCondition[] = [];
            for (const child of node) {
                result.push(...this.flattenMembershipConditions(child, parentGroup));
            }
            return result;
        }

        if (node.type === 'GROUP') {
            const group = node.logicalOperator || parentGroup;
            const result: MembershipCondition[] = [];
            const children = Array.isArray(node.children) ? node.children : [];
            for (const child of children) {
                result.push(...this.flattenMembershipConditions(child, group));
            }
            return result;
        }

        if (node.type === 'CONDITION' && node.conditionCode) {
            return [{
                type: node.conditionCode as MembershipConditionType,
                group: parentGroup,
                threshold: node.value ?? 0,
                ...(node.dimension?.itemId ? { itemId: node.dimension.itemId } : {}),
            }];
        }

        return [];
    }

    private calculateProgressPercent(actual: number, required: number, comparison?: string): number {
        const actualValue = this.requireNonNegativeMetricNumber(actual, 'tier progress actual value');
        const requiredValue = this.requireNonNegativeMetricNumber(required, 'tier progress required value');

        if (comparison === 'LTE') {
            if (requiredValue <= 0) {
                return actualValue <= 0 ? 100 : 0;
            }
            if (actualValue <= requiredValue) {
                return 100;
            }
            return this.capProgressPercent(Math.round((requiredValue / actualValue) * 100));
        }

        if (comparison === 'EQ') {
            return actualValue === requiredValue ? 100 : 0;
        }

        if (requiredValue <= 0) {
            return 100;
        }

        return this.capProgressPercent(Math.round((actualValue / requiredValue) * 100));
    }

    private readMetricInputValue(metrics: Record<string, number>, key: string): number {
        if (!Object.prototype.hasOwnProperty.call(metrics, key)) {
            return 0;
        }
        return this.requireNonNegativeMetricNumber(metrics[key], `${key} input metric value`);
    }

    private requireNonNegativeMetricNumber(value: unknown, context: string): number {
        if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
            throw new Error(`Invalid tier qualification metric number for ${context}: ${value}`);
        }
        return value;
    }

    private requireMetricCode(metricCode: unknown): string {
        const normalized = typeof metricCode === 'string' ? metricCode.trim() : undefined;
        if (!normalized) {
            throw new Error(`Invalid tier qualification metric code: ${metricCode}`);
        }
        return normalized;
    }

    private capProgressPercent(percent: number): number {
        if (!Number.isFinite(percent) || percent < 0) {
            throw new Error(`Invalid tier qualification progress percent: ${percent}`);
        }
        return percent > 100 ? 100 : percent;
    }

    private toPartyMetricLookupKey(metricCode: string, dimension?: MetricDimensionConfig): string {
        if (dimension && dimension.kind && dimension.itemId) {
            return `${metricCode}::${dimension.kind.trim()}:${dimension.itemId.trim()}`;
        }
        return metricCode;
    }
}
