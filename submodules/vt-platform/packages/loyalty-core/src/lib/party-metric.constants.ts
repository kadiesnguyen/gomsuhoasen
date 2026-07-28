function readTrimmedString(value: unknown): string | undefined {
    if (typeof value !== 'string') {
        return undefined;
    }
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
}

export const PARTY_METRIC_CODES = {
    POINT_TOTAL: 'POINT_TOTAL',
    ROLLING_SPEND: 'ROLLING_SPEND',
    ROLLING_ORDER_COUNT: 'ROLLING_ORDER_COUNT',
    ITEM_PURCHASED: 'ITEM_PURCHASED',
    PACKAGE_PURCHASED: 'PACKAGE_PURCHASED',
    INVITED_TOTAL: 'INVITED_TOTAL',
} as const;

export type PartyMetricCode = typeof PARTY_METRIC_CODES[keyof typeof PARTY_METRIC_CODES];

export const PARTY_METRIC_DIMENSION_KIND = {
    ITEM: 'ITEM',
    PACKAGE: 'PACKAGE',
    CATEGORY: 'CATEGORY',
    CHANNEL: 'CHANNEL',
    CUSTOM: 'CUSTOM',
} as const;

export type PartyMetricDimensionKind = typeof PARTY_METRIC_DIMENSION_KIND[keyof typeof PARTY_METRIC_DIMENSION_KIND];

export type MetricDimension = {
    kind: string;
    itemId: string;
};

export type MetricDimensionInput = {
    kind?: unknown;
    itemId?: unknown;
};

export type PartyMetricDimensionFilter = {
    'dimension.kind': string | { $exists: false };
    'dimension.itemId': string | { $exists: false };
};

export function readMetricDimension(dimension?: MetricDimensionInput): MetricDimension | undefined {
    const kind = readTrimmedString(dimension?.kind);
    const itemId = readTrimmedString(dimension?.itemId);
    return kind !== undefined && itemId !== undefined
        ? { kind, itemId }
        : undefined;
}

export function toPartyMetricLookupKey(metricCode: string, dimension?: MetricDimensionInput): string {
    const normalizedDimension = readMetricDimension(dimension);
    return normalizedDimension
        ? `${metricCode}::${normalizedDimension.kind}:${normalizedDimension.itemId}`
        : metricCode;
}

export function toPartyMetricDependencyKey(dep: {
    metricCode: string;
    periodType: string;
    dimension?: MetricDimensionInput;
}): string {
    const normalizedDimension = readMetricDimension(dep.dimension);
    return normalizedDimension
        ? `${dep.metricCode}:${dep.periodType}:${normalizedDimension.kind}:${normalizedDimension.itemId}`
        : `${dep.metricCode}:${dep.periodType}`;
}

export function toPartyMetricDimensionFilter(dimension?: MetricDimensionInput): PartyMetricDimensionFilter {
    const normalizedDimension = readMetricDimension(dimension);
    return normalizedDimension
        ? {
            'dimension.kind': normalizedDimension.kind,
            'dimension.itemId': normalizedDimension.itemId,
        }
        : {
            'dimension.kind': { $exists: false },
            'dimension.itemId': { $exists: false },
        };
}
