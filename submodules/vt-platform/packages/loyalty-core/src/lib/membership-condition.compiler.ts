import {
    MEMBERSHIP_CONDITION_CODES,
    VALID_PERIOD_MAP,
    CONDITION_PERIOD,
    CONDITION_NODE_TYPE,
    COMPARISON_OPERATOR,
    type MembershipConditionCode,
    type ConditionPeriodType,
    MEMBERSHIP_CONDITION_VALIDATION_MESSAGES,
} from './membership-condition.constants';
import {
    RuleNodeType,
    type MembershipConditionNode,
    type MembershipConditionInput,
    type CompilationResult,
    type ConditionValidationResult,
    type ConditionValidationError,
    type FactDependency,
    type TierQualificationRuleNode,
} from './membership-condition.contracts';
import {
    PARTY_METRIC_CODES,
    readMetricDimension,
} from './party-metric.constants';

function readMembershipConditionArray(value: unknown): MembershipConditionNode[] {
    return Array.isArray(value) ? value as MembershipConditionNode[] : [];
}

export class MembershipConditionCompiler {
    /**
     * Validate a membership condition tree without compiling.
     * Should be called before save/publish.
     */
    validate(conditions: MembershipConditionInput): ConditionValidationResult {
        const errors: ConditionValidationError[] = [];
        const normalizedConditions = this.normalizeConditionInput(conditions);
        if (!normalizedConditions) {
            errors.push({ path: 'root', message: MEMBERSHIP_CONDITION_VALIDATION_MESSAGES.NODE_INVALID });
            return { isValid: false, errors };
        }
        const useIndexedPaths = Array.isArray(conditions);
        normalizedConditions.forEach((node, i) => this.validateNode(node, useIndexedPaths ? `root[${i}]` : 'root', errors));
        return { isValid: errors.length === 0, errors };
    }

    /**
     * Compile membershipConditions → AST + fact dependencies.
     * Throws if validation fails.
     */
    compile(conditions: MembershipConditionInput): CompilationResult {
        const validation = this.validate(conditions);
        if (!validation.isValid) {
            throw new Error(
                `Condition compile rejected: ${validation.errors.map((e) => `[${e.path}] ${e.message}`).join('; ')}`
            );
        }

        const normalizedConditions = this.normalizeConditionInput(conditions) ?? [];
        const factDependencies: FactDependency[] = [];
        let ast: TierQualificationRuleNode | undefined = undefined;
        if (normalizedConditions.length === 1) {
            ast = this.compileNode(normalizedConditions[0], factDependencies);
        } else if (normalizedConditions.length > 1) {
            ast = {
                type: RuleNodeType.GROUP,
                logicalOperator: 'AND',
                children: normalizedConditions.map((node) => this.compileNode(node, factDependencies)),
            };
        }
        return { ast, factDependencies };
    }

    private normalizeConditionInput(conditions: MembershipConditionInput | undefined | null): MembershipConditionNode[] | null {
        if (!conditions) {
            return null;
        }
        return Array.isArray(conditions) ? conditions : [conditions];
    }

    private validateNode(
        node: MembershipConditionNode,
        path: string,
        errors: ConditionValidationError[],
    ): void {
        if (!node || typeof node !== 'object') {
            errors.push({ path, message: MEMBERSHIP_CONDITION_VALIDATION_MESSAGES.NODE_INVALID });
            return;
        }

        if (node.type === CONDITION_NODE_TYPE.GROUP) {
            this.validateGroupNode(node, path, errors);
        } else if (node.type === CONDITION_NODE_TYPE.CONDITION) {
            this.validateConditionNode(node, path, errors);
        } else {
            errors.push({ path, message: MEMBERSHIP_CONDITION_VALIDATION_MESSAGES.NODE_TYPE_UNKNOWN });
        }
    }

    private validateGroupNode(
        node: MembershipConditionNode,
        path: string,
        errors: ConditionValidationError[],
    ): void {
        if (!node.logicalOperator || !['AND', 'OR'].includes(node.logicalOperator)) {
            errors.push({ path, message: MEMBERSHIP_CONDITION_VALIDATION_MESSAGES.GROUP_OPERATOR_REQUIRED });
        }

        if (!Array.isArray(node.children) || node.children.length === 0) {
            errors.push({ path, message: MEMBERSHIP_CONDITION_VALIDATION_MESSAGES.GROUP_CHILD_REQUIRED });
            return;
        }

        for (let i = 0; i < node.children.length; i++) {
            this.validateNode(node.children[i], `${path}.children[${i}]`, errors);
        }
    }

    private validateConditionNode(
        node: MembershipConditionNode,
        path: string,
        errors: ConditionValidationError[],
    ): void {
        if (!node.conditionCode) {
            errors.push({ path, message: MEMBERSHIP_CONDITION_VALIDATION_MESSAGES.CONDITION_CODE_REQUIRED });
            return;
        }

        const validCodes = Object.values(MEMBERSHIP_CONDITION_CODES) as string[];
        if (!validCodes.includes(node.conditionCode)) {
            errors.push({ path, message: MEMBERSHIP_CONDITION_VALIDATION_MESSAGES.CONDITION_CODE_UNKNOWN });
            return;
        }

        if (!node.comparison || !Object.values(COMPARISON_OPERATOR).includes(node.comparison)) {
            errors.push({ path, message: MEMBERSHIP_CONDITION_VALIDATION_MESSAGES.CONDITION_COMPARISON_REQUIRED });
        }

        if (typeof node.value !== 'number' || Number.isNaN(node.value)) {
            errors.push({ path, message: MEMBERSHIP_CONDITION_VALIDATION_MESSAGES.CONDITION_NUMERIC_VALUE_REQUIRED });
        }

        const period = node.period || CONDITION_PERIOD.LIFETIME;
        const validPeriods = VALID_PERIOD_MAP[node.conditionCode as MembershipConditionCode];
        if (validPeriods && !validPeriods.includes(period as ConditionPeriodType)) {
            errors.push({
                path,
                message: MEMBERSHIP_CONDITION_VALIDATION_MESSAGES.CONDITION_PERIOD_INVALID,
            });
        }

        if (node.conditionCode === MEMBERSHIP_CONDITION_CODES.ITEM_PURCHASED) {
            if (!node.dimension?.kind || !node.dimension?.itemId) {
                errors.push({
                    path,
                    message: MEMBERSHIP_CONDITION_VALIDATION_MESSAGES.ITEM_PURCHASED_DIMENSION_REQUIRED,
                });
            }
        }

        if (node.conditionCode === MEMBERSHIP_CONDITION_CODES.PACKAGE_PURCHASED) {
            if (!node.dimension?.kind) {
                errors.push({
                    path,
                    message: MEMBERSHIP_CONDITION_VALIDATION_MESSAGES.PACKAGE_PURCHASED_DIMENSION_REQUIRED,
                });
            }
        }
    }

    private compileNode(
        node: MembershipConditionNode,
        deps: FactDependency[],
    ): TierQualificationRuleNode {
        if (node.type === CONDITION_NODE_TYPE.GROUP) {
            return this.compileGroupNode(node, deps);
        }
        return this.compileConditionNode(node, deps);
    }

    private compileGroupNode(
        node: MembershipConditionNode,
        deps: FactDependency[],
    ): TierQualificationRuleNode {
        const children = readMembershipConditionArray(node.children)
            .map((child) => this.compileNode(child, deps));
        return {
            type: RuleNodeType.GROUP,
            logicalOperator: node.logicalOperator === 'OR' ? 'OR' : 'AND',
            children,
        };
    }

    private compileConditionNode(
        node: MembershipConditionNode,
        deps: FactDependency[],
    ): TierQualificationRuleNode {
        const metricCode = this.resolveMetricCode(node.conditionCode!);
        const periodType = node.period || CONDITION_PERIOD.LIFETIME;

        const dep: FactDependency = {
            metricCode,
            periodType,
        };
        const dimension = readMetricDimension(node.dimension);
        if (dimension) {
            dep.dimension = dimension;
        }
        deps.push(dep);

        const ast: TierQualificationRuleNode = {
            type: RuleNodeType.METRIC,
            metricCode,
            comparison: node.comparison,
            value: node.value,
        };

        if (dimension) {
            ast.dimension = dimension;
        }

        return ast;
    }

    private resolveMetricCode(conditionCode: string): string {
        switch (conditionCode) {
            case MEMBERSHIP_CONDITION_CODES.PAID_TOTAL:
                return PARTY_METRIC_CODES.ROLLING_SPEND;
            case MEMBERSHIP_CONDITION_CODES.ORDER_COUNT:
                return PARTY_METRIC_CODES.ROLLING_ORDER_COUNT;
            default:
                return conditionCode;
        }
    }
}
