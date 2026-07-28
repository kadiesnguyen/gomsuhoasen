export const FEATURE_KEYS = {
  catalog: 'catalog',
  cart: 'cart',
  checkout: 'checkout',
  booking: 'booking',
  order: 'order',
  loyalty: 'loyalty',
  minigame: 'minigame',
  affiliate: 'affiliate',
  support: 'support',
  content: 'content',
  profile: 'profile',
} as const;

export type FeatureKey = (typeof FEATURE_KEYS)[keyof typeof FEATURE_KEYS];

/**
 * 6 Archetypes — grouping for manifest base selection.
 * Each business type maps to exactly one archetype.
 */
export const BUSINESS_TYPE_ARCHETYPES = {
  retailSku: 'retail-sku',
  retailVariant: 'retail-variant',
  fnbMenu: 'fnb-menu',
  serviceBooking: 'service-booking',
  hybridRetailBooking: 'hybrid-retail-booking',
  contentCommunity: 'content-community',
} as const;

export type BusinessTypeArchetype =
  (typeof BUSINESS_TYPE_ARCHETYPES)[keyof typeof BUSINESS_TYPE_ARCHETYPES];

/**
 * Canonical BusinessTypeId keys.
 *
 * Naming rule: kebab-case, singular noun, no abbreviation.
 * Backend seed key mapping: kebab-case id maps to UPPER_SNAKE_CASE artifact key
 *   e.g. 'fashion' -> 'FASHION', 'pet-shop' -> 'PET_SHOP'
 *
 * Decision note:
 *   - 'service-clinic' remains canonical per QA-20260427-001 and QA-20260515-001.
 *   - 'fashion' remains canonical (no rename).
 */
export const BUSINESS_TYPE_IDS = {
  // ── Retail SKU archetype ──
  fashion: 'fashion',
  grocery: 'grocery',
  convenience: 'convenience',
  electronics: 'electronics',
  cosmetics: 'cosmetics',
  pharmacy: 'pharmacy',
  bookstore: 'bookstore',
  petShop: 'pet-shop',
  homeDecor: 'home-decor',
  sportOutdoor: 'sport-outdoor',

  // ── Retail Variant archetype ──
  jewelry: 'jewelry',
  furniture: 'furniture',
  autoparts: 'autoparts',
  textile: 'textile',

  // ── F&B Menu archetype ──
  cafe: 'cafe',
  restaurant: 'restaurant',
  bakery: 'bakery',
  teahouse: 'teahouse',
  streetFood: 'street-food',

  // ── Service Booking archetype ──
  clinic: 'clinic',
  serviceClinic: 'service-clinic',
  salon: 'salon',
  spa: 'spa',
  gym: 'gym',
  trainingCenter: 'training-center',
  repairService: 'repair-service',

  // ── Hybrid Retail + Booking archetype ──
  optician: 'optician',
  dentalClinic: 'dental-clinic',
  vetClinic: 'vet-clinic',

  // ── Content / Community Commerce archetype ──
  eventTicketing: 'event-ticketing',
  digitalContent: 'digital-content',
} as const;

export type BusinessTypeId = (typeof BUSINESS_TYPE_IDS)[keyof typeof BUSINESS_TYPE_IDS];

/**
 * Maps each BusinessTypeId to its archetype.
 */
export const BUSINESS_TYPE_ARCHETYPE_MAP: Record<BusinessTypeId, BusinessTypeArchetype> = {
  // Retail SKU
  [BUSINESS_TYPE_IDS.fashion]: BUSINESS_TYPE_ARCHETYPES.retailVariant,
  [BUSINESS_TYPE_IDS.grocery]: BUSINESS_TYPE_ARCHETYPES.retailSku,
  [BUSINESS_TYPE_IDS.convenience]: BUSINESS_TYPE_ARCHETYPES.retailSku,
  [BUSINESS_TYPE_IDS.electronics]: BUSINESS_TYPE_ARCHETYPES.retailVariant,
  [BUSINESS_TYPE_IDS.cosmetics]: BUSINESS_TYPE_ARCHETYPES.retailSku,
  [BUSINESS_TYPE_IDS.pharmacy]: BUSINESS_TYPE_ARCHETYPES.retailSku,
  [BUSINESS_TYPE_IDS.bookstore]: BUSINESS_TYPE_ARCHETYPES.retailSku,
  [BUSINESS_TYPE_IDS.petShop]: BUSINESS_TYPE_ARCHETYPES.retailSku,
  [BUSINESS_TYPE_IDS.homeDecor]: BUSINESS_TYPE_ARCHETYPES.retailSku,
  [BUSINESS_TYPE_IDS.sportOutdoor]: BUSINESS_TYPE_ARCHETYPES.retailVariant,
  // Retail Variant
  [BUSINESS_TYPE_IDS.jewelry]: BUSINESS_TYPE_ARCHETYPES.retailVariant,
  [BUSINESS_TYPE_IDS.furniture]: BUSINESS_TYPE_ARCHETYPES.retailVariant,
  [BUSINESS_TYPE_IDS.autoparts]: BUSINESS_TYPE_ARCHETYPES.retailVariant,
  [BUSINESS_TYPE_IDS.textile]: BUSINESS_TYPE_ARCHETYPES.retailVariant,
  // F&B Menu
  [BUSINESS_TYPE_IDS.cafe]: BUSINESS_TYPE_ARCHETYPES.fnbMenu,
  [BUSINESS_TYPE_IDS.restaurant]: BUSINESS_TYPE_ARCHETYPES.fnbMenu,
  [BUSINESS_TYPE_IDS.bakery]: BUSINESS_TYPE_ARCHETYPES.fnbMenu,
  [BUSINESS_TYPE_IDS.teahouse]: BUSINESS_TYPE_ARCHETYPES.fnbMenu,
  [BUSINESS_TYPE_IDS.streetFood]: BUSINESS_TYPE_ARCHETYPES.fnbMenu,
  // Service Booking
  [BUSINESS_TYPE_IDS.clinic]: BUSINESS_TYPE_ARCHETYPES.serviceBooking,
  [BUSINESS_TYPE_IDS.serviceClinic]: BUSINESS_TYPE_ARCHETYPES.serviceBooking,
  [BUSINESS_TYPE_IDS.salon]: BUSINESS_TYPE_ARCHETYPES.serviceBooking,
  [BUSINESS_TYPE_IDS.spa]: BUSINESS_TYPE_ARCHETYPES.serviceBooking,
  [BUSINESS_TYPE_IDS.gym]: BUSINESS_TYPE_ARCHETYPES.serviceBooking,
  [BUSINESS_TYPE_IDS.trainingCenter]: BUSINESS_TYPE_ARCHETYPES.serviceBooking,
  [BUSINESS_TYPE_IDS.repairService]: BUSINESS_TYPE_ARCHETYPES.serviceBooking,
  // Hybrid
  [BUSINESS_TYPE_IDS.optician]: BUSINESS_TYPE_ARCHETYPES.hybridRetailBooking,
  [BUSINESS_TYPE_IDS.dentalClinic]: BUSINESS_TYPE_ARCHETYPES.hybridRetailBooking,
  [BUSINESS_TYPE_IDS.vetClinic]: BUSINESS_TYPE_ARCHETYPES.hybridRetailBooking,
  // Content/Community
  [BUSINESS_TYPE_IDS.eventTicketing]: BUSINESS_TYPE_ARCHETYPES.contentCommunity,
  [BUSINESS_TYPE_IDS.digitalContent]: BUSINESS_TYPE_ARCHETYPES.contentCommunity,
};

/**
 * Legacy alias map for migration.
 * Keys are deprecated ids; values are canonical replacements.
 */
export const BUSINESS_TYPE_LEGACY_ALIASES: Record<string, BusinessTypeId> = {
  'retail-pro': BUSINESS_TYPE_IDS.fashion,
  standard: BUSINESS_TYPE_IDS.grocery,
  'fnb-standard': BUSINESS_TYPE_IDS.cafe,
  'services-basic': BUSINESS_TYPE_IDS.clinic,
};

const BUSINESS_TYPE_ID_SET = new Set<string>(Object.values(BUSINESS_TYPE_IDS));

export function normalizeBusinessTypeToken(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  return trimmed.toLowerCase().replace(/[_\s]+/g, '-');
}

export function resolveCanonicalBusinessTypeId(value: unknown): BusinessTypeId | null {
  const normalized = normalizeBusinessTypeToken(value);
  if (!normalized) {
    return null;
  }

  const aliased = BUSINESS_TYPE_LEGACY_ALIASES[normalized];
  if (aliased) {
    return aliased;
  }

  if (BUSINESS_TYPE_ID_SET.has(normalized)) {
    return normalized as BusinessTypeId;
  }

  return null;
}

export const CLIENT_PLATFORMS = {
  miniappZalo: 'miniapp-zalo',
  miniappTelegram: 'miniapp-telegram',
  web: 'web',
} as const;

export type ClientPlatform = (typeof CLIENT_PLATFORMS)[keyof typeof CLIENT_PLATFORMS];

export const SURFACE_MODES = {
  miniapp: 'miniapp',
  web: 'web',
} as const;

export type SurfaceMode = (typeof SURFACE_MODES)[keyof typeof SURFACE_MODES];

export const PLATFORM_SURFACE_MODES: Record<ClientPlatform, SurfaceMode> = {
  [CLIENT_PLATFORMS.miniappZalo]: SURFACE_MODES.miniapp,
  [CLIENT_PLATFORMS.miniappTelegram]: SURFACE_MODES.miniapp,
  [CLIENT_PLATFORMS.web]: SURFACE_MODES.web,
} as const;

export const CLIENT_CAPABILITY_KEYS = {
  authSession: 'auth-session',
  storage: 'storage',
  payment: 'payment',
  share: 'share',
  contactChat: 'contact-chat',
  staffDirectory: 'staff-directory',
  phoneNumber: 'phone-number',
  location: 'location',
  devicePermissions: 'device-permissions',
  analytics: 'analytics',
  navigation: 'navigation',
} as const;

export type ClientCapabilityKey =
  (typeof CLIENT_CAPABILITY_KEYS)[keyof typeof CLIENT_CAPABILITY_KEYS];
