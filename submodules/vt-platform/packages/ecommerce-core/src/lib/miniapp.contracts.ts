export const LEGACY_MINIAPP_PACKAGE_STATUS = {
  DRAFT: 'DRAFT',
  ERROR: 'ERROR',
  DOING: 'DOING',
  BUG: 'BUG',
  REJECT: 'REJECT',
  REVIEWED: 'REVIEWED',
} as const;

export type LegacyMiniAppPackageStatus =
  (typeof LEGACY_MINIAPP_PACKAGE_STATUS)[keyof typeof LEGACY_MINIAPP_PACKAGE_STATUS];
export const LEGACY_MINIAPP_PACKAGE_STATUS_VALUES = Object.values(LEGACY_MINIAPP_PACKAGE_STATUS);

export function isLegacyMiniAppPackageStatus(value: string): value is LegacyMiniAppPackageStatus {
  return LEGACY_MINIAPP_PACKAGE_STATUS_VALUES.includes(value as LegacyMiniAppPackageStatus);
}
