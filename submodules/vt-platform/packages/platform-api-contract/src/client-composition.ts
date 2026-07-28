import type {
  BusinessTypeId,
  ClientCapabilityKey,
  ClientPlatform,
  SurfaceMode,
  FeatureKey,
} from './domain-tokens';
import type { CapabilityStatus, CompatibilityLabel } from './enums';

export type RouteFallbackMode = 'degraded' | 'hidden';

export interface RouteCapabilityRequirement {
  capabilityKey: ClientCapabilityKey;
  fallbackMode: RouteFallbackMode;
}

/**
 * Route eligibility for business types.
 * - `['*']` means route is available to ALL business types.
 * - Explicit array e.g. `['clinic', 'salon']` restricts to listed types only.
 */
export interface FunctionRouteDefinition {
  routeId: string;
  path: string;
  featureKey: FeatureKey;
  screenId: string;
  routeGroup: string;
  businessTypeIds: BusinessTypeId[] | ['*'];
  capabilityRequirements?: RouteCapabilityRequirement[];
}

export interface BusinessTypeManifest {
  id: BusinessTypeId;
  enabledFeatures: FeatureKey[];
  routeGroups: string[];
  variants: Record<string, string>;
  uxRecipes: string[];
}

export interface PlatformCapabilityDescriptor {
  capabilityKey: ClientCapabilityKey;
  status: CapabilityStatus;
  fallbackStrategy: string;
  notes?: string;
}

export type PlatformCapabilityRegistry = Record<
  ClientCapabilityKey,
  PlatformCapabilityDescriptor
>;

export interface AppAssemblyDefinition {
  platformId: ClientPlatform;
  surfaceMode: SurfaceMode;
  businessTypeId: BusinessTypeId;
  routeIds: string[];
  degradedRouteIds: string[];
  unavailableRouteIds: string[];
}

export interface ClientBootstrapRequest {
  platformProfile: ClientPlatform;
  launchContext: {
    appInstanceId?: string; // Zalo App ID
    botId?: string;         // Telegram Bot ID
    initData?: string;      // Raw Telegram WebApp.initData; server-verified only
    [key: string]: unknown;
  };
}

export const SUPPORT_CHANNEL_TYPES = {
  zaloOa: 'zalo_oa',
  phone: 'phone',
  email: 'email',
  chat: 'chat',
} as const;

export type SupportChannelType =
  (typeof SUPPORT_CHANNEL_TYPES)[keyof typeof SUPPORT_CHANNEL_TYPES];

export const SUPPORT_CHANNEL_PROVIDER_SUBTYPES = {
  zaloOa: 'zalo_oa',
  telegramBot: 'telegram_bot',
  telegramChat: 'telegram_chat',
} as const;

export type SupportChannelProviderSubtype =
  (typeof SUPPORT_CHANNEL_PROVIDER_SUBTYPES)[keyof typeof SUPPORT_CHANNEL_PROVIDER_SUBTYPES];

export type SupportChannelProviderMetadata = Record<string, string>;

export interface SupportChannel {
  type: SupportChannelType;
  value: string;
  label?: string;
  platformProfile?: ClientPlatform;
  providerSubtype?: SupportChannelProviderSubtype;
  providerMetadata?: SupportChannelProviderMetadata;
}

export interface ClientBootstrapPayload {
  tenantId: string | null;
  guestToken: string | null;
  /** Canonical public identity for composition. */
  businessTypeKey?: BusinessTypeId | null;
  /** @deprecated Use businessTypeKey; kept as transition-safe alias. */
  businessTypeId: BusinessTypeId | null;
  /** Server-projected tenant-effective features. Optional - miniapp omits this. */
  effectiveFeatures?: FeatureKey[];
  /** Optional presentation-only appearance payload (must not impact gating). */
  appearance?: {
    presetKey?: string;
    layoutRecipe?: string;
    tokens?: {
      primary: string;
      secondary?: string;
      accent?: string;
      background: string;
      surface: string;
      text: string;
      border: string;
      radius?: string;
    };
    assets?: {
      logoUrl?: string;
      faviconUrl?: string;
    };
    catalogRecipes?: {
      list?: string;
      detail?: string;
    };
  };
  supportChannels?: SupportChannel[];
}

export interface PublicContractExportMetadata {
  exportName: string;
  owner: string;
  compatibility: CompatibilityLabel;
  reviewGate: string;
}
