export const CAPABILITY_STATUS = {
  supported: 'supported',
  degraded: 'degraded',
  unavailable: 'unavailable',
} as const;

export type CapabilityStatus =
  (typeof CAPABILITY_STATUS)[keyof typeof CAPABILITY_STATUS];

export const COMPATIBILITY_LABELS = {
  stable: 'stable',
  experimental: 'experimental',
} as const;

export type CompatibilityLabel =
  (typeof COMPATIBILITY_LABELS)[keyof typeof COMPATIBILITY_LABELS];
