/**
 * Canonical Membership Condition Catalog
 *
 * This is the finite, versioned catalog of condition types that the tenant
 * membership engine supports. Each condition code maps to a specific business
 * qualification criterion.
 *
 * Architecture rule: This catalog is the ONLY source of valid condition codes.
 * Tenants cannot define arbitrary condition codes.
 *
 * @see docs_hub_v3/07_GROWTH_ENGINE/04_MEMBERSHIP_TIER_SPEC.md §5
 */

// ── Condition Codes ──────────────────────────────────────────────────────

export const MEMBERSHIP_CONDITION_CODES = {
    /** Member purchased a configured package/rank product */
    PACKAGE_PURCHASED: 'PACKAGE_PURCHASED',
    /** Total accumulated earned points (lifetime by default) */
    POINT_TOTAL: 'POINT_TOTAL',
    /** Total successful invites (lifetime by default) */
    INVITED_TOTAL: 'INVITED_TOTAL',
    /** Total paid amount — can be lifetime, month, year, or rolling */
    PAID_TOTAL: 'PAID_TOTAL',
    /** Completed order count — can be lifetime, month, year, or rolling */
    ORDER_COUNT: 'ORDER_COUNT',
    /** Quantity of a specific item purchased — multi-instance, item-scoped */
    ITEM_PURCHASED: 'ITEM_PURCHASED',
    /** Approved extension fact from controlled catalog */
    CUSTOM_FACT: 'CUSTOM_FACT',
} as const;

export type MembershipConditionCode =
    typeof MEMBERSHIP_CONDITION_CODES[keyof typeof MEMBERSHIP_CONDITION_CODES];

// ── Period Types ─────────────────────────────────────────────────────────

export const CONDITION_PERIOD = {
    DAY: 'DAY',
    MONTH: 'MONTH',
    YEAR: 'YEAR',
    LIFETIME: 'LIFETIME',
    ROLLING_WINDOW: 'ROLLING_WINDOW',
    FIXED_TERM: 'FIXED_TERM',
} as const;

export type ConditionPeriodType =
    typeof CONDITION_PERIOD[keyof typeof CONDITION_PERIOD];

export const CONDITION_PERIOD_VALUES = Object.values(CONDITION_PERIOD);

export const CALENDAR_CONDITION_PERIODS = [
    CONDITION_PERIOD.DAY,
    CONDITION_PERIOD.MONTH,
    CONDITION_PERIOD.YEAR,
] as const;

export const WINDOW_CONDITION_PERIODS = [
    CONDITION_PERIOD.ROLLING_WINDOW,
    CONDITION_PERIOD.FIXED_TERM,
] as const;

// ── Comparison Operators ─────────────────────────────────────────────────

export const COMPARISON_OPERATOR = {
    GTE: 'GTE',
    LTE: 'LTE',
    EQ: 'EQ',
} as const;

export type ComparisonOperatorType =
    typeof COMPARISON_OPERATOR[keyof typeof COMPARISON_OPERATOR];

// ── Valid Period Combinations ────────────────────────────────────────────
// Each condition code has a list of valid periods. Engine validates before
// persist and before publish.

export const VALID_PERIOD_MAP: Record<MembershipConditionCode, readonly ConditionPeriodType[]> = {
    [MEMBERSHIP_CONDITION_CODES.PACKAGE_PURCHASED]: [
        CONDITION_PERIOD.LIFETIME,
        CONDITION_PERIOD.FIXED_TERM,
    ],
    [MEMBERSHIP_CONDITION_CODES.POINT_TOTAL]: [
        CONDITION_PERIOD.LIFETIME,
        CONDITION_PERIOD.MONTH,
        CONDITION_PERIOD.YEAR,
        CONDITION_PERIOD.ROLLING_WINDOW,
    ],
    [MEMBERSHIP_CONDITION_CODES.INVITED_TOTAL]: [
        CONDITION_PERIOD.LIFETIME,
        CONDITION_PERIOD.MONTH,
        CONDITION_PERIOD.YEAR,
    ],
    [MEMBERSHIP_CONDITION_CODES.PAID_TOTAL]: [
        CONDITION_PERIOD.DAY,
        CONDITION_PERIOD.MONTH,
        CONDITION_PERIOD.YEAR,
        CONDITION_PERIOD.LIFETIME,
        CONDITION_PERIOD.ROLLING_WINDOW,
    ],
    [MEMBERSHIP_CONDITION_CODES.ORDER_COUNT]: [
        CONDITION_PERIOD.DAY,
        CONDITION_PERIOD.MONTH,
        CONDITION_PERIOD.YEAR,
        CONDITION_PERIOD.LIFETIME,
        CONDITION_PERIOD.ROLLING_WINDOW,
    ],
    [MEMBERSHIP_CONDITION_CODES.ITEM_PURCHASED]: [
        CONDITION_PERIOD.LIFETIME,
        CONDITION_PERIOD.MONTH,
        CONDITION_PERIOD.YEAR,
    ],
    [MEMBERSHIP_CONDITION_CODES.CUSTOM_FACT]: [
        CONDITION_PERIOD.DAY,
        CONDITION_PERIOD.MONTH,
        CONDITION_PERIOD.YEAR,
        CONDITION_PERIOD.LIFETIME,
        CONDITION_PERIOD.ROLLING_WINDOW,
        CONDITION_PERIOD.FIXED_TERM,
    ],
};

// ── Vietnamese Business Labels ──────────────────────────────────────────
// Used by client explainability and portal setup. These are the canonical
// human-readable labels for each condition code.

export interface ConditionLabel {
    title: string;
    suffix: string;
    description: string;
}

export const CONDITION_LABELS: Record<MembershipConditionCode, ConditionLabel> = {
    [MEMBERSHIP_CONDITION_CODES.PACKAGE_PURCHASED]: {
        title: 'Mua gói thành viên',
        suffix: 'gói',
        description: 'Mua gói/cấp thành viên chỉ định',
    },
    [MEMBERSHIP_CONDITION_CODES.POINT_TOTAL]: {
        title: 'Tổng điểm tích lũy',
        suffix: 'điểm',
        description: 'Tổng lượng điểm thưởng tích lũy',
    },
    [MEMBERSHIP_CONDITION_CODES.INVITED_TOTAL]: {
        title: 'Số người đã mời',
        suffix: 'thành viên',
        description: 'Tổng số người đã mời thành công',
    },
    [MEMBERSHIP_CONDITION_CODES.PAID_TOTAL]: {
        title: 'Tổng thanh toán',
        suffix: 'vnđ',
        description: 'Tổng số tiền đã thanh toán',
    },
    [MEMBERSHIP_CONDITION_CODES.ORDER_COUNT]: {
        title: 'Số đơn hàng hoàn thành',
        suffix: 'đơn hàng',
        description: 'Tổng số đơn hàng đã hoàn thành',
    },
    [MEMBERSHIP_CONDITION_CODES.ITEM_PURCHASED]: {
        title: 'Mua sản phẩm chỉ định',
        suffix: 'sản phẩm',
        description: 'Mua sản phẩm cụ thể với số lượng yêu cầu',
    },
    [MEMBERSHIP_CONDITION_CODES.CUSTOM_FACT]: {
        title: 'Tiêu chí tùy chỉnh',
        suffix: '',
        description: 'Tiêu chí mở rộng từ catalog được duyệt',
    },
};

// ── Condition Node Types ─────────────────────────────────────────────────

export const CONDITION_NODE_TYPE = {
    GROUP: 'GROUP',
    CONDITION: 'CONDITION',
} as const;

export type ConditionNodeTypeValue =
    typeof CONDITION_NODE_TYPE[keyof typeof CONDITION_NODE_TYPE];

export const CONDITION_LOGICAL_OPERATOR = {
    AND: 'AND',
    OR: 'OR',
} as const;

export type ConditionLogicalOperator =
    typeof CONDITION_LOGICAL_OPERATOR[keyof typeof CONDITION_LOGICAL_OPERATOR];

export const MEMBERSHIP_CONDITION_VALIDATION_MESSAGES = {
    NODE_INVALID: 'Node is null or not an object',
    NODE_TYPE_UNKNOWN: 'Unknown node type',
    GROUP_OPERATOR_REQUIRED: 'GROUP node must have logicalOperator AND or OR',
    GROUP_CHILD_REQUIRED: 'GROUP node must have at least one child',
    CONDITION_CODE_REQUIRED: 'CONDITION node must have conditionCode',
    CONDITION_CODE_UNKNOWN: 'Unknown conditionCode',
    CONDITION_COMPARISON_REQUIRED: 'CONDITION must have comparison GTE/LTE/EQ',
    CONDITION_NUMERIC_VALUE_REQUIRED: 'CONDITION must have numeric value',
    CONDITION_PERIOD_INVALID: 'Period is not valid for conditionCode',
    ITEM_PURCHASED_DIMENSION_REQUIRED:
        'ITEM_PURCHASED condition must have dimension with kind and itemId',
    PACKAGE_PURCHASED_DIMENSION_REQUIRED:
        'PACKAGE_PURCHASED condition must have dimension with kind=PACKAGE',
} as const;

