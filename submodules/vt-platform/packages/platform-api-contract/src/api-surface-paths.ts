export type ApiSurfaceLane =
  | 'public'
  | 'client'
  | 'admin'
  | 'system'
  | 'platform'
  | 'webhooks'
  | 'internal';

export type GuardProfile =
  | 'public-readonly'
  | 'client-authenticated'
  | 'client-guest-session'
  | 'admin-permissioned'
  | 'system-operator'
  | 'platform-bridge'
  | 'webhook-signature'
  | 'internal-service';

export type TenantScope = 'none' | 'required' | 'bootstrap-input' | 'system-only';

export type ApiPathStability = 'stable' | 'experimental' | 'deprecated';

export interface ApiPathMetadata {
  lane: ApiSurfaceLane;
  guardProfile: GuardProfile;
  tenantScope: TenantScope;
  owner: string;
  stability: ApiPathStability;
  canonical: boolean;
  deprecatedAliasOf?: string;
  sourceDecision: 'DEC-110';
}

const SOURCE_DECISION: ApiPathMetadata['sourceDecision'] = 'DEC-110';

function metadataFor<T extends Record<string, string>>(
  paths: T,
  input: Omit<ApiPathMetadata, 'canonical' | 'deprecatedAliasOf' | 'sourceDecision'>,
): Record<keyof T, ApiPathMetadata> {
  const entries = Object.keys(paths).map((key) => [
    key,
    {
      ...input,
      canonical: true,
      sourceDecision: SOURCE_DECISION,
    } satisfies ApiPathMetadata,
  ]);
  return Object.fromEntries(entries) as Record<keyof T, ApiPathMetadata>;
}

export const PUBLIC_API_PATHS = {
  catalogCategories: '/v2/public/catalog/categories',
  catalogCategoryDetail: '/v2/public/catalog/categories/:id',
  catalogProducts: '/v2/public/catalog/products',
  catalogProductDetail: '/v2/public/catalog/products/:id',
  catalogProductReviews: '/v2/public/catalog/products/:id/reviews',
  catalogSearchSuggest: '/v2/public/catalog/search/suggest',
  catalogSearchTrending: '/v2/public/catalog/search/trending',
  loyaltyTiers: '/v2/public/loyalty/tiers',
  events: '/v2/public/events',
  eventDetail: '/v2/public/events/:id',
  staff: '/v2/public/staff',
  staffDetail: '/v2/public/staff/:id',
  newsArticles: '/v2/public/news',
  newsCategories: '/v2/public/news/categories',
  newsSearch: '/v2/public/news/search',
  newsDetail: '/v2/public/news/:slug',
  newsRelated: '/v2/public/news/:slug/related',
  publicUserVoucherDetail: '/v2/public/user-vouchers/:code',
} as const;

export const PUBLIC_API_PATH_METADATA = metadataFor(PUBLIC_API_PATHS, {
  lane: 'public',
  guardProfile: 'public-readonly',
  tenantScope: 'required',
  owner: 'architecture',
  stability: 'stable',
});

/**
 * Client-surface public read endpoints.
 *
 * These are tenant-scoped anonymous reads served under the `/v2/client/public/*`
 * family. Tenant identity is resolved by the ClientTenantResolverMiddleware
 * (Origin-based) — no `x-tenant-id` header required from web callers.
 *
 * The legacy `/v2/public/*` equivalents remain registered (dual-serve) for
 * portal and miniapp_v2 backward compatibility.
 *
 * @see PUBLIC_API_PATHS — legacy tokens (kept for portal + miniapp_v2)
 */
export const CLIENT_PUBLIC_API_PATHS = {
  // Bootstrap
  clientContext: '/v2/client/context',
  tenantInfo: '/v2/client/context/tenant-info',
  banners: '/v2/client/public/banners',
  // Catalog
  catalogCategories: '/v2/client/public/catalog/categories',
  catalogCategoryDetail: '/v2/client/public/catalog/categories/:id',
  catalogCategoriesTree: '/v2/client/public/catalog/categories/tree',
  catalogProducts: '/v2/client/public/catalog/products',
  catalogProductDetail: '/v2/client/public/catalog/products/:id',
  catalogProductReviews: '/v2/client/public/catalog/products/:id/reviews',
  catalogBrands: '/v2/client/public/catalog/brands',
  catalogSearchSuggest: '/v2/client/public/catalog/search/suggest',
  catalogSearchTrending: '/v2/client/public/catalog/search/trending',
  // Loyalty
  loyaltyTiers: '/v2/client/public/loyalty/tiers',
  membershipPackage: '/v2/client/public/membership-package',
  // Events
  events: '/v2/client/public/events',
  eventDetail: '/v2/client/public/events/:id',
  // Staff
  staff: '/v2/client/public/staff',
  staffDetail: '/v2/client/public/staff/:id',
  // News
  newsArticles: '/v2/client/public/news',
  newsCategories: '/v2/client/public/news/categories',
  newsSearch: '/v2/client/public/news/search',
  newsDetail: '/v2/client/public/news/:slug',
  newsRelated: '/v2/client/public/news/:slug/related',
  // Voucher
  publicUserVoucherDetail: '/v2/client/public/user-vouchers/:code',
} as const;

export const CLIENT_PUBLIC_API_PATH_METADATA = metadataFor(CLIENT_PUBLIC_API_PATHS, {
  lane: 'client',
  guardProfile: 'public-readonly',
  tenantScope: 'required',
  owner: 'client-platform',
  stability: 'stable',
});

export const CLIENT_API_PATHS = {
  authProviderLogin: '/v2/client/auth/zalo-login',
  authEmailLogin: '/v2/client/auth/email-login',
  authEmailRegister: '/v2/client/auth/email-register',
  authRefresh: '/v2/client/auth/refresh',
  me: '/v2/client/me',
  meProfile: '/v2/client/me/profile',
  cart: '/v2/client/cart',
  checkout: '/v2/client/orders/checkout',
  checkoutPlatformPayment: '/v2/client/orders/zalo-pay',
  reviews: '/v2/client/reviews',
  addresses: '/v2/client/addresses',
  addressDetail: '/v2/client/addresses/:id',
  addressDefault: '/v2/client/addresses/:id/default',
  ordersMy: '/v2/client/orders/my',
  orderDetail: '/v2/client/orders/:id',
  orderCancel: '/v2/client/orders/:id/cancel',
  orderConfirmReceived: '/v2/client/orders/:id/confirm-received',
  orderRequestRefund: '/v2/client/orders/:id/request-refund',
  vouchersAvailable: '/v2/client/vouchers/available',
  voucherRedemptions: '/v2/client/vouchers/redemptions',
  loyaltyMe: '/v2/client/loyalty/me',
  loyaltyConditions: '/v2/client/loyalty/conditions',
  loyaltyLedger: '/v2/client/loyalty/ledger',
  loyaltyMissions: '/v2/client/loyalty/missions',
  balanceWallet: '/v2/client/balance/my-wallet',
  balanceTransactions: '/v2/client/balance/transactions',
  pos: '/v2/client/pos',
  posPhone: '/v2/client/pos/phone',
  supportQuestionCategories: '/v2/client/support/question-categories',
  supportQuestions: '/v2/client/support/questions',
  supportQuestionDetail: '/v2/client/support/questions/:id',
  favourites: '/v2/client/favourites',
  favouriteDetail: '/v2/client/favourites/:targetType/:targetId',
  newsBookmarks: '/v2/client/news/bookmarks',
  newsBookmarkDetail: '/v2/client/news/bookmarks/:articleId',
  notificationsInApp: '/v2/client/notifications/in-app',
  notificationRead: '/v2/client/notifications/in-app/:id/read',
  notificationsReadAll: '/v2/client/notifications/in-app/read-all',
  notificationsUnreadCount: '/v2/client/notifications/in-app/unread-count',
  minigameRoot: '/v2/client/minigame',
  minigameSpin: '/v2/client/minigame/:id/spin',
  minigameHistory: '/v2/client/minigame/history',
  affiliateMe: '/v2/client/affiliate/me',
  affiliateBankAccounts: '/v2/client/affiliate/bank-accounts',
  affiliateBankAccountDetail: '/v2/client/affiliate/bank-accounts/:id',
  affiliateCommissions: '/v2/client/affiliate/commissions',
  affiliateWithdrawals: '/v2/client/affiliate/withdrawals',
  affiliateReferrals: '/v2/client/affiliate/referrals',
  affiliateReferences: '/v2/client/affiliate/references',
  voucherValidate: '/v2/client/vouchers/validate',
  userVoucherCreate: '/v2/client/user-vouchers',
  userVoucherMy: '/v2/client/user-vouchers/my',
  userVoucherCollect: '/v2/client/user-vouchers/:code/collect',
  customerVoucherCollectionMy: '/v2/client/customer-vouchers/my',
  appointmentMy: '/v2/client/appointments/my',
  appointmentEntry: '/v2/client/appointments',
  appointmentSlots: '/v2/client/appointments/slots',
  appointmentCheckin: '/v2/client/appointments/:id/checkin',
  appointmentReschedule: '/v2/client/appointments/:id/reschedule',
  servicePackages: '/v2/client/service-packages',
  fieldsLayout: '/v2/client/fields/layout',
  fieldsValues: '/v2/client/fields',
} as const;

export const CLIENT_API_PATH_METADATA = metadataFor(CLIENT_API_PATHS, {
  lane: 'client',
  guardProfile: 'client-authenticated',
  tenantScope: 'required',
  owner: 'client-platform',
  stability: 'stable',
});

export const ADMIN_API_PATHS = {
  catalogProducts: '/v2/admin/catalog/products',
  catalogCategories: '/v2/admin/catalog/categories',
  fieldsDefinitions: '/v2/admin/fields/definitions',
  fieldsValues: '/v2/admin/fields/values',
  supportQuestions: '/v2/admin/support/questions',
  notificationsInApp: '/v2/admin/content/notifications/in-app',
} as const;

export const ADMIN_API_PATH_METADATA = metadataFor(ADMIN_API_PATHS, {
  lane: 'admin',
  guardProfile: 'admin-permissioned',
  tenantScope: 'required',
  owner: 'backend-platform',
  stability: 'stable',
});

export const SYSTEM_API_PATHS = {
  pluginsInstalled: '/v2/system/plugins/installed',
  billingUsageSummary: '/v2/system/billing/usage/summary',
  integrationZaloTemplates: '/v2/system/integrations/zalo/zns/templates',
  authImpersonate: '/v2/system/auth/impersonate',
} as const;

export const SYSTEM_API_PATH_METADATA = metadataFor(SYSTEM_API_PATHS, {
  lane: 'system',
  guardProfile: 'system-operator',
  tenantScope: 'system-only',
  owner: 'architecture',
  stability: 'stable',
});

export const PLATFORM_MINIAPP_API_PATHS = {
  bootstrap: '/v2/platform/miniapp/bootstrap',
  phoneTokenExchange: '/v2/platform/miniapp/auth/zalo-phone',
  paymentHandoff: '/v2/platform/miniapp/payment/handoff',
} as const;

export const PLATFORM_MINIAPP_API_PATH_METADATA = metadataFor(
  PLATFORM_MINIAPP_API_PATHS,
  {
    lane: 'platform',
    guardProfile: 'platform-bridge',
    tenantScope: 'bootstrap-input',
    owner: 'platform-adapters',
    stability: 'stable',
  },
);

export const WEBHOOK_API_PATHS = {
  shippingInbound: '/v2/webhooks/shipping',
  paymentInbound: '/v2/webhooks/payment',
} as const;

export const WEBHOOK_API_PATH_METADATA = metadataFor(WEBHOOK_API_PATHS, {
  lane: 'webhooks',
  guardProfile: 'webhook-signature',
  tenantScope: 'none',
  owner: 'backend-platform',
  stability: 'stable',
});

export const INTERNAL_API_PATHS = {
  outboxReplay: '/v2/internal/core/outbox/replay',
  jobsTick: '/v2/internal/admin/jobs/tick',
} as const;

export const INTERNAL_API_PATH_METADATA = metadataFor(INTERNAL_API_PATHS, {
  lane: 'internal',
  guardProfile: 'internal-service',
  tenantScope: 'none',
  owner: 'backend-platform',
  stability: 'stable',
});

export interface LegacyApiAlias {
  legacyPath: string;
  canonicalLane: ApiSurfaceLane;
  canonicalToken: string;
  deprecatedAliasOf: string;
  sunsetAfter: 'wave+1';
  sourceDecision: 'DEC-110';
}

export const LEGACY_API_ALIASES = {
  miniappBootstrap: {
    legacyPath: '/v2/miniapp/bootstrap',
    canonicalLane: 'platform',
    canonicalToken: 'PLATFORM_MINIAPP_API_PATHS.bootstrap',
    deprecatedAliasOf: PLATFORM_MINIAPP_API_PATHS.bootstrap,
    sunsetAfter: 'wave+1',
    sourceDecision: SOURCE_DECISION,
  },
  miniappZaloLogin: {
    legacyPath: '/v2/client/auth/zalo-login',
    canonicalLane: 'client',
    canonicalToken: 'CLIENT_API_PATHS.authProviderLogin',
    deprecatedAliasOf: CLIENT_API_PATHS.authProviderLogin,
    sunsetAfter: 'wave+1',
    sourceDecision: SOURCE_DECISION,
  },
  iamZaloPhone: {
    legacyPath: '/v2/iam/auth/zalo-phone',
    canonicalLane: 'platform',
    canonicalToken: 'PLATFORM_MINIAPP_API_PATHS.phoneTokenExchange',
    deprecatedAliasOf: PLATFORM_MINIAPP_API_PATHS.phoneTokenExchange,
    sunsetAfter: 'wave+1',
    sourceDecision: SOURCE_DECISION,
  },
  publicCatalogCategories: {
    legacyPath: '/v2/public/catalog/categories',
    canonicalLane: 'public',
    canonicalToken: 'PUBLIC_API_PATHS.catalogCategories',
    deprecatedAliasOf: PUBLIC_API_PATHS.catalogCategories,
    sunsetAfter: 'wave+1',
    sourceDecision: SOURCE_DECISION,
  },
  publicCatalogCategoryDetail: {
    legacyPath: '/v2/public/catalog/categories/:id',
    canonicalLane: 'public',
    canonicalToken: 'PUBLIC_API_PATHS.catalogCategoryDetail',
    deprecatedAliasOf: PUBLIC_API_PATHS.catalogCategoryDetail,
    sunsetAfter: 'wave+1',
    sourceDecision: SOURCE_DECISION,
  },
  publicCatalogProducts: {
    legacyPath: '/v2/public/catalog/products',
    canonicalLane: 'public',
    canonicalToken: 'PUBLIC_API_PATHS.catalogProducts',
    deprecatedAliasOf: PUBLIC_API_PATHS.catalogProducts,
    sunsetAfter: 'wave+1',
    sourceDecision: SOURCE_DECISION,
  },
  publicCatalogProductDetail: {
    legacyPath: '/v2/public/catalog/products/:id',
    canonicalLane: 'public',
    canonicalToken: 'PUBLIC_API_PATHS.catalogProductDetail',
    deprecatedAliasOf: PUBLIC_API_PATHS.catalogProductDetail,
    sunsetAfter: 'wave+1',
    sourceDecision: SOURCE_DECISION,
  },
  publicCatalogProductReviews: {
    legacyPath: '/v2/public/catalog/products/:id/reviews',
    canonicalLane: 'public',
    canonicalToken: 'PUBLIC_API_PATHS.catalogProductReviews',
    deprecatedAliasOf: PUBLIC_API_PATHS.catalogProductReviews,
    sunsetAfter: 'wave+1',
    sourceDecision: SOURCE_DECISION,
  },
  publicCatalogSearchSuggest: {
    legacyPath: '/v2/public/catalog/search/suggest',
    canonicalLane: 'public',
    canonicalToken: 'PUBLIC_API_PATHS.catalogSearchSuggest',
    deprecatedAliasOf: PUBLIC_API_PATHS.catalogSearchSuggest,
    sunsetAfter: 'wave+1',
    sourceDecision: SOURCE_DECISION,
  },
  publicCatalogSearchTrending: {
    legacyPath: '/v2/public/catalog/search/trending',
    canonicalLane: 'public',
    canonicalToken: 'PUBLIC_API_PATHS.catalogSearchTrending',
    deprecatedAliasOf: PUBLIC_API_PATHS.catalogSearchTrending,
    sunsetAfter: 'wave+1',
    sourceDecision: SOURCE_DECISION,
  },
  fieldsLayout: {
    legacyPath: '/v2/fields/layout',
    canonicalLane: 'client',
    canonicalToken: 'CLIENT_API_PATHS.fieldsLayout',
    deprecatedAliasOf: CLIENT_API_PATHS.fieldsLayout,
    sunsetAfter: 'wave+1',
    sourceDecision: SOURCE_DECISION,
  },
  fieldsValues: {
    legacyPath: '/v2/fields',
    canonicalLane: 'client',
    canonicalToken: 'CLIENT_API_PATHS.fieldsValues',
    deprecatedAliasOf: CLIENT_API_PATHS.fieldsValues,
    sunsetAfter: 'wave+1',
    sourceDecision: SOURCE_DECISION,
  },
  clientCart: {
    legacyPath: '/v2/client/cart',
    canonicalLane: 'client',
    canonicalToken: 'CLIENT_API_PATHS.cart',
    deprecatedAliasOf: CLIENT_API_PATHS.cart,
    sunsetAfter: 'wave+1',
    sourceDecision: SOURCE_DECISION,
  },
  clientCheckout: {
    legacyPath: '/v2/client/orders/checkout',
    canonicalLane: 'client',
    canonicalToken: 'CLIENT_API_PATHS.checkout',
    deprecatedAliasOf: CLIENT_API_PATHS.checkout,
    sunsetAfter: 'wave+1',
    sourceDecision: SOURCE_DECISION,
  },
  clientZaloPay: {
    legacyPath: '/v2/client/orders/zalo-pay',
    canonicalLane: 'client',
    canonicalToken: 'CLIENT_API_PATHS.checkoutPlatformPayment',
    deprecatedAliasOf: CLIENT_API_PATHS.checkoutPlatformPayment,
    sunsetAfter: 'wave+1',
    sourceDecision: SOURCE_DECISION,
  },
  clientReviews: {
    legacyPath: '/v2/client/reviews',
    canonicalLane: 'client',
    canonicalToken: 'CLIENT_API_PATHS.reviews',
    deprecatedAliasOf: CLIENT_API_PATHS.reviews,
    sunsetAfter: 'wave+1',
    sourceDecision: SOURCE_DECISION,
  },
  customerMe: {
    legacyPath: '/v2/client/me',
    canonicalLane: 'client',
    canonicalToken: 'CLIENT_API_PATHS.me',
    deprecatedAliasOf: CLIENT_API_PATHS.me,
    sunsetAfter: 'wave+1',
    sourceDecision: SOURCE_DECISION,
  },
  customerMeProfile: {
    legacyPath: '/v2/client/me/profile',
    canonicalLane: 'client',
    canonicalToken: 'CLIENT_API_PATHS.meProfile',
    deprecatedAliasOf: CLIENT_API_PATHS.meProfile,
    sunsetAfter: 'wave+1',
    sourceDecision: SOURCE_DECISION,
  },
  customerAddresses: {
    legacyPath: '/v2/client/addresses',
    canonicalLane: 'client',
    canonicalToken: 'CLIENT_API_PATHS.addresses',
    deprecatedAliasOf: CLIENT_API_PATHS.addresses,
    sunsetAfter: 'wave+1',
    sourceDecision: SOURCE_DECISION,
  },
  customerAddressDetail: {
    legacyPath: '/v2/client/addresses/:id',
    canonicalLane: 'client',
    canonicalToken: 'CLIENT_API_PATHS.addressDetail',
    deprecatedAliasOf: CLIENT_API_PATHS.addressDetail,
    sunsetAfter: 'wave+1',
    sourceDecision: SOURCE_DECISION,
  },
  customerAddressDefault: {
    legacyPath: '/v2/client/addresses/:id/default',
    canonicalLane: 'client',
    canonicalToken: 'CLIENT_API_PATHS.addressDefault',
    deprecatedAliasOf: CLIENT_API_PATHS.addressDefault,
    sunsetAfter: 'wave+1',
    sourceDecision: SOURCE_DECISION,
  },
  customerOrdersMy: {
    legacyPath: '/v2/client/orders/my',
    canonicalLane: 'client',
    canonicalToken: 'CLIENT_API_PATHS.ordersMy',
    deprecatedAliasOf: CLIENT_API_PATHS.ordersMy,
    sunsetAfter: 'wave+1',
    sourceDecision: SOURCE_DECISION,
  },
  customerOrderDetail: {
    legacyPath: '/v2/client/orders/:id',
    canonicalLane: 'client',
    canonicalToken: 'CLIENT_API_PATHS.orderDetail',
    deprecatedAliasOf: CLIENT_API_PATHS.orderDetail,
    sunsetAfter: 'wave+1',
    sourceDecision: SOURCE_DECISION,
  },
  customerOrderCancel: {
    legacyPath: '/v2/client/orders/:id/cancel',
    canonicalLane: 'client',
    canonicalToken: 'CLIENT_API_PATHS.orderCancel',
    deprecatedAliasOf: CLIENT_API_PATHS.orderCancel,
    sunsetAfter: 'wave+1',
    sourceDecision: SOURCE_DECISION,
  },
  customerOrderConfirmReceived: {
    legacyPath: '/v2/client/orders/:id/confirm-received',
    canonicalLane: 'client',
    canonicalToken: 'CLIENT_API_PATHS.orderConfirmReceived',
    deprecatedAliasOf: CLIENT_API_PATHS.orderConfirmReceived,
    sunsetAfter: 'wave+1',
    sourceDecision: SOURCE_DECISION,
  },
  customerOrderRequestRefund: {
    legacyPath: '/v2/client/orders/:id/request-refund',
    canonicalLane: 'client',
    canonicalToken: 'CLIENT_API_PATHS.orderRequestRefund',
    deprecatedAliasOf: CLIENT_API_PATHS.orderRequestRefund,
    sunsetAfter: 'wave+1',
    sourceDecision: SOURCE_DECISION,
  },
  miniappVouchersAvailable: {
    legacyPath: '/v2/miniapp/vouchers/available',
    canonicalLane: 'client',
    canonicalToken: 'CLIENT_API_PATHS.vouchersAvailable',
    deprecatedAliasOf: CLIENT_API_PATHS.vouchersAvailable,
    sunsetAfter: 'wave+1',
    sourceDecision: SOURCE_DECISION,
  },
  miniappVoucherRedemptions: {
    legacyPath: '/v2/miniapp/vouchers/redemptions',
    canonicalLane: 'client',
    canonicalToken: 'CLIENT_API_PATHS.voucherRedemptions',
    deprecatedAliasOf: CLIENT_API_PATHS.voucherRedemptions,
    sunsetAfter: 'wave+1',
    sourceDecision: SOURCE_DECISION,
  },
  miniappLoyaltyMe: {
    legacyPath: '/v2/miniapp/loyalty/me',
    canonicalLane: 'client',
    canonicalToken: 'CLIENT_API_PATHS.loyaltyMe',
    deprecatedAliasOf: CLIENT_API_PATHS.loyaltyMe,
    sunsetAfter: 'wave+1',
    sourceDecision: SOURCE_DECISION,
  },
  miniappLoyaltyLedger: {
    legacyPath: '/v2/miniapp/loyalty/ledger',
    canonicalLane: 'client',
    canonicalToken: 'CLIENT_API_PATHS.loyaltyLedger',
    deprecatedAliasOf: CLIENT_API_PATHS.loyaltyLedger,
    sunsetAfter: 'wave+1',
    sourceDecision: SOURCE_DECISION,
  },
  miniappLoyaltyMissions: {
    legacyPath: '/v2/miniapp/loyalty/missions',
    canonicalLane: 'client',
    canonicalToken: 'CLIENT_API_PATHS.loyaltyMissions',
    deprecatedAliasOf: CLIENT_API_PATHS.loyaltyMissions,
    sunsetAfter: 'wave+1',
    sourceDecision: SOURCE_DECISION,
  },
  publicLoyaltyTiers: {
    legacyPath: '/v2/public/loyalty/tiers',
    canonicalLane: 'public',
    canonicalToken: 'PUBLIC_API_PATHS.loyaltyTiers',
    deprecatedAliasOf: PUBLIC_API_PATHS.loyaltyTiers,
    sunsetAfter: 'wave+1',
    sourceDecision: SOURCE_DECISION,
  },
  supportQuestionCategories: {
    legacyPath: '/v2/support/question-categories',
    canonicalLane: 'client',
    canonicalToken: 'CLIENT_API_PATHS.supportQuestionCategories',
    deprecatedAliasOf: CLIENT_API_PATHS.supportQuestionCategories,
    sunsetAfter: 'wave+1',
    sourceDecision: SOURCE_DECISION,
  },
  supportQuestions: {
    legacyPath: '/v2/support/questions',
    canonicalLane: 'client',
    canonicalToken: 'CLIENT_API_PATHS.supportQuestions',
    deprecatedAliasOf: CLIENT_API_PATHS.supportQuestions,
    sunsetAfter: 'wave+1',
    sourceDecision: SOURCE_DECISION,
  },
  supportQuestionDetail: {
    legacyPath: '/v2/support/questions/:id',
    canonicalLane: 'client',
    canonicalToken: 'CLIENT_API_PATHS.supportQuestionDetail',
    deprecatedAliasOf: CLIENT_API_PATHS.supportQuestionDetail,
    sunsetAfter: 'wave+1',
    sourceDecision: SOURCE_DECISION,
  },
  publicNewsArticles: {
    legacyPath: '/v2/public/cms/articles',
    canonicalLane: 'public',
    canonicalToken: 'PUBLIC_API_PATHS.newsArticles',
    deprecatedAliasOf: PUBLIC_API_PATHS.newsArticles,
    sunsetAfter: 'wave+1',
    sourceDecision: SOURCE_DECISION,
  },
  publicNewsCategories: {
    legacyPath: '/v2/public/cms/categories',
    canonicalLane: 'public',
    canonicalToken: 'PUBLIC_API_PATHS.newsCategories',
    deprecatedAliasOf: PUBLIC_API_PATHS.newsCategories,
    sunsetAfter: 'wave+1',
    sourceDecision: SOURCE_DECISION,
  },
  publicNewsSearch: {
    legacyPath: '/v2/public/cms/articles/search',
    canonicalLane: 'public',
    canonicalToken: 'PUBLIC_API_PATHS.newsSearch',
    deprecatedAliasOf: PUBLIC_API_PATHS.newsSearch,
    sunsetAfter: 'wave+1',
    sourceDecision: SOURCE_DECISION,
  },
  publicNewsDetail: {
    legacyPath: '/v2/public/cms/articles/:slug',
    canonicalLane: 'public',
    canonicalToken: 'PUBLIC_API_PATHS.newsDetail',
    deprecatedAliasOf: PUBLIC_API_PATHS.newsDetail,
    sunsetAfter: 'wave+1',
    sourceDecision: SOURCE_DECISION,
  },
  publicNewsRelated: {
    legacyPath: '/v2/public/cms/articles/:slug/related',
    canonicalLane: 'public',
    canonicalToken: 'PUBLIC_API_PATHS.newsRelated',
    deprecatedAliasOf: PUBLIC_API_PATHS.newsRelated,
    sunsetAfter: 'wave+1',
    sourceDecision: SOURCE_DECISION,
  },
  newsBookmarks: {
    legacyPath: '/v2/miniapp/news/bookmarks',
    canonicalLane: 'client',
    canonicalToken: 'CLIENT_API_PATHS.newsBookmarks',
    deprecatedAliasOf: CLIENT_API_PATHS.newsBookmarks,
    sunsetAfter: 'wave+1',
    sourceDecision: SOURCE_DECISION,
  },
  newsBookmarkDetail: {
    legacyPath: '/v2/miniapp/news/bookmarks/:articleId',
    canonicalLane: 'client',
    canonicalToken: 'CLIENT_API_PATHS.newsBookmarkDetail',
    deprecatedAliasOf: CLIENT_API_PATHS.newsBookmarkDetail,
    sunsetAfter: 'wave+1',
    sourceDecision: SOURCE_DECISION,
  },
  contentNotificationsInApp: {
    legacyPath: '/v2/content/notifications/in-app',
    canonicalLane: 'client',
    canonicalToken: 'CLIENT_API_PATHS.notificationsInApp',
    deprecatedAliasOf: CLIENT_API_PATHS.notificationsInApp,
    sunsetAfter: 'wave+1',
    sourceDecision: SOURCE_DECISION,
  },
  contentNotificationRead: {
    legacyPath: '/v2/content/notifications/in-app/:id/read',
    canonicalLane: 'client',
    canonicalToken: 'CLIENT_API_PATHS.notificationRead',
    deprecatedAliasOf: CLIENT_API_PATHS.notificationRead,
    sunsetAfter: 'wave+1',
    sourceDecision: SOURCE_DECISION,
  },
  contentNotificationsReadAll: {
    legacyPath: '/v2/content/notifications/in-app/read-all',
    canonicalLane: 'client',
    canonicalToken: 'CLIENT_API_PATHS.notificationsReadAll',
    deprecatedAliasOf: CLIENT_API_PATHS.notificationsReadAll,
    sunsetAfter: 'wave+1',
    sourceDecision: SOURCE_DECISION,
  },
  contentNotificationsUnreadCount: {
    legacyPath: '/v2/content/notifications/in-app/unread-count',
    canonicalLane: 'client',
    canonicalToken: 'CLIENT_API_PATHS.notificationsUnreadCount',
    deprecatedAliasOf: CLIENT_API_PATHS.notificationsUnreadCount,
    sunsetAfter: 'wave+1',
    sourceDecision: SOURCE_DECISION,
  },
  miniappMiniGameRoot: {
    legacyPath: '/v2/miniapp/minigame',
    canonicalLane: 'client',
    canonicalToken: 'CLIENT_API_PATHS.minigameRoot',
    deprecatedAliasOf: CLIENT_API_PATHS.minigameRoot,
    sunsetAfter: 'wave+1',
    sourceDecision: SOURCE_DECISION,
  },
  miniappMiniGameSpin: {
    legacyPath: '/v2/miniapp/minigame/:id/spin',
    canonicalLane: 'client',
    canonicalToken: 'CLIENT_API_PATHS.minigameSpin',
    deprecatedAliasOf: CLIENT_API_PATHS.minigameSpin,
    sunsetAfter: 'wave+1',
    sourceDecision: SOURCE_DECISION,
  },
  miniappMiniGameHistory: {
    legacyPath: '/v2/miniapp/minigame/history',
    canonicalLane: 'client',
    canonicalToken: 'CLIENT_API_PATHS.minigameHistory',
    deprecatedAliasOf: CLIENT_API_PATHS.minigameHistory,
    sunsetAfter: 'wave+1',
    sourceDecision: SOURCE_DECISION,
  },
  miniappAffiliateMe: {
    legacyPath: '/v2/miniapp/affiliate/me',
    canonicalLane: 'client',
    canonicalToken: 'CLIENT_API_PATHS.affiliateMe',
    deprecatedAliasOf: CLIENT_API_PATHS.affiliateMe,
    sunsetAfter: 'wave+1',
    sourceDecision: SOURCE_DECISION,
  },
  miniappAffiliateCommissions: {
    legacyPath: '/v2/miniapp/affiliate/commissions',
    canonicalLane: 'client',
    canonicalToken: 'CLIENT_API_PATHS.affiliateCommissions',
    deprecatedAliasOf: CLIENT_API_PATHS.affiliateCommissions,
    sunsetAfter: 'wave+1',
    sourceDecision: SOURCE_DECISION,
  },
  miniappAffiliateWithdrawals: {
    legacyPath: '/v2/miniapp/affiliate/withdrawals',
    canonicalLane: 'client',
    canonicalToken: 'CLIENT_API_PATHS.affiliateWithdrawals',
    deprecatedAliasOf: CLIENT_API_PATHS.affiliateWithdrawals,
    sunsetAfter: 'wave+1',
    sourceDecision: SOURCE_DECISION,
  },
  miniappAffiliateReferrals: {
    legacyPath: '/v2/miniapp/affiliate/referrals',
    canonicalLane: 'client',
    canonicalToken: 'CLIENT_API_PATHS.affiliateReferrals',
    deprecatedAliasOf: CLIENT_API_PATHS.affiliateReferrals,
    sunsetAfter: 'wave+1',
    sourceDecision: SOURCE_DECISION,
  },
  miniappAffiliateReferences: {
    legacyPath: '/v2/miniapp/affiliate/references',
    canonicalLane: 'client',
    canonicalToken: 'CLIENT_API_PATHS.affiliateReferences',
    deprecatedAliasOf: CLIENT_API_PATHS.affiliateReferences,
    sunsetAfter: 'wave+1',
    sourceDecision: SOURCE_DECISION,
  },
  voucherValidate: {
    legacyPath: '/v2/marketing/vouchers/validate',
    canonicalLane: 'client',
    canonicalToken: 'CLIENT_API_PATHS.voucherValidate',
    deprecatedAliasOf: CLIENT_API_PATHS.voucherValidate,
    sunsetAfter: 'wave+1',
    sourceDecision: SOURCE_DECISION,
  },
  miniappAppointmentEntry: {
    legacyPath: '/v2/miniapp/appointments',
    canonicalLane: 'client',
    canonicalToken: 'CLIENT_API_PATHS.appointmentEntry',
    deprecatedAliasOf: CLIENT_API_PATHS.appointmentEntry,
    sunsetAfter: 'wave+1',
    sourceDecision: SOURCE_DECISION,
  },
  miniappAppointmentMy: {
    legacyPath: '/v2/miniapp/appointments/my',
    canonicalLane: 'client',
    canonicalToken: 'CLIENT_API_PATHS.appointmentMy',
    deprecatedAliasOf: CLIENT_API_PATHS.appointmentMy,
    sunsetAfter: 'wave+1',
    sourceDecision: SOURCE_DECISION,
  },
  miniappAppointmentSlots: {
    legacyPath: '/v2/miniapp/appointments/slots',
    canonicalLane: 'client',
    canonicalToken: 'CLIENT_API_PATHS.appointmentSlots',
    deprecatedAliasOf: CLIENT_API_PATHS.appointmentSlots,
    sunsetAfter: 'wave+1',
    sourceDecision: SOURCE_DECISION,
  },
  miniappServicePackages: {
    legacyPath: '/v2/miniapp/service-packages',
    canonicalLane: 'client',
    canonicalToken: 'CLIENT_API_PATHS.servicePackages',
    deprecatedAliasOf: CLIENT_API_PATHS.servicePackages,
    sunsetAfter: 'wave+1',
    sourceDecision: SOURCE_DECISION,
  },
} as const satisfies Record<string, LegacyApiAlias>;

export const DEPRECATED_CLIENT_API_PATHS = {
  miniappBootstrap: LEGACY_API_ALIASES.miniappBootstrap.legacyPath,
  miniappZaloLogin: LEGACY_API_ALIASES.miniappZaloLogin.legacyPath,
  iamZaloPhone: LEGACY_API_ALIASES.iamZaloPhone.legacyPath,
  publicCatalogCategories: LEGACY_API_ALIASES.publicCatalogCategories.legacyPath,
  publicCatalogCategoryDetail: LEGACY_API_ALIASES.publicCatalogCategoryDetail.legacyPath,
  publicCatalogProducts: LEGACY_API_ALIASES.publicCatalogProducts.legacyPath,
  publicCatalogProductDetail: LEGACY_API_ALIASES.publicCatalogProductDetail.legacyPath,
  publicCatalogProductReviews: LEGACY_API_ALIASES.publicCatalogProductReviews.legacyPath,
  publicCatalogSearchSuggest: LEGACY_API_ALIASES.publicCatalogSearchSuggest.legacyPath,
  publicCatalogSearchTrending: LEGACY_API_ALIASES.publicCatalogSearchTrending.legacyPath,
  fieldsLayout: LEGACY_API_ALIASES.fieldsLayout.legacyPath,
  fieldsValues: LEGACY_API_ALIASES.fieldsValues.legacyPath,
  clientCart: LEGACY_API_ALIASES.clientCart.legacyPath,
  clientCheckout: LEGACY_API_ALIASES.clientCheckout.legacyPath,
  clientZaloPay: LEGACY_API_ALIASES.clientZaloPay.legacyPath,
  clientReviews: LEGACY_API_ALIASES.clientReviews.legacyPath,
  customerMe: LEGACY_API_ALIASES.customerMe.legacyPath,
  customerMeProfile: LEGACY_API_ALIASES.customerMeProfile.legacyPath,
  customerAddresses: LEGACY_API_ALIASES.customerAddresses.legacyPath,
  customerAddressDetail: LEGACY_API_ALIASES.customerAddressDetail.legacyPath,
  customerAddressDefault: LEGACY_API_ALIASES.customerAddressDefault.legacyPath,
  customerOrdersMy: LEGACY_API_ALIASES.customerOrdersMy.legacyPath,
  customerOrderDetail: LEGACY_API_ALIASES.customerOrderDetail.legacyPath,
  customerOrderCancel: LEGACY_API_ALIASES.customerOrderCancel.legacyPath,
  customerOrderConfirmReceived: LEGACY_API_ALIASES.customerOrderConfirmReceived.legacyPath,
  customerOrderRequestRefund: LEGACY_API_ALIASES.customerOrderRequestRefund.legacyPath,
  miniappVouchersAvailable: LEGACY_API_ALIASES.miniappVouchersAvailable.legacyPath,
  miniappVoucherRedemptions: LEGACY_API_ALIASES.miniappVoucherRedemptions.legacyPath,
  miniappLoyaltyMe: LEGACY_API_ALIASES.miniappLoyaltyMe.legacyPath,
  miniappLoyaltyLedger: LEGACY_API_ALIASES.miniappLoyaltyLedger.legacyPath,
  publicLoyaltyTiers: LEGACY_API_ALIASES.publicLoyaltyTiers.legacyPath,
  supportQuestionCategories: LEGACY_API_ALIASES.supportQuestionCategories.legacyPath,
  supportQuestions: LEGACY_API_ALIASES.supportQuestions.legacyPath,
  supportQuestionDetail: LEGACY_API_ALIASES.supportQuestionDetail.legacyPath,
  publicNewsArticles: LEGACY_API_ALIASES.publicNewsArticles.legacyPath,
  publicNewsCategories: LEGACY_API_ALIASES.publicNewsCategories.legacyPath,
  publicNewsSearch: LEGACY_API_ALIASES.publicNewsSearch.legacyPath,
  publicNewsDetail: LEGACY_API_ALIASES.publicNewsDetail.legacyPath,
  publicNewsRelated: LEGACY_API_ALIASES.publicNewsRelated.legacyPath,
  newsBookmarks: LEGACY_API_ALIASES.newsBookmarks.legacyPath,
  newsBookmarkDetail: LEGACY_API_ALIASES.newsBookmarkDetail.legacyPath,
  contentNotificationsInApp: LEGACY_API_ALIASES.contentNotificationsInApp.legacyPath,
  contentNotificationRead: LEGACY_API_ALIASES.contentNotificationRead.legacyPath,
  contentNotificationsReadAll: LEGACY_API_ALIASES.contentNotificationsReadAll.legacyPath,
  contentNotificationsUnreadCount: LEGACY_API_ALIASES.contentNotificationsUnreadCount.legacyPath,
  miniappMiniGameRoot: LEGACY_API_ALIASES.miniappMiniGameRoot.legacyPath,
  miniappMiniGameSpin: LEGACY_API_ALIASES.miniappMiniGameSpin.legacyPath,
  miniappMiniGameHistory: LEGACY_API_ALIASES.miniappMiniGameHistory.legacyPath,
  miniappAffiliateMe: LEGACY_API_ALIASES.miniappAffiliateMe.legacyPath,
  miniappAffiliateCommissions: LEGACY_API_ALIASES.miniappAffiliateCommissions.legacyPath,
  miniappAffiliateWithdrawals: LEGACY_API_ALIASES.miniappAffiliateWithdrawals.legacyPath,
  miniappAffiliateReferrals: LEGACY_API_ALIASES.miniappAffiliateReferrals.legacyPath,
  voucherValidate: LEGACY_API_ALIASES.voucherValidate.legacyPath,
  miniappAppointmentEntry: LEGACY_API_ALIASES.miniappAppointmentEntry.legacyPath,
  miniappAppointmentMy: LEGACY_API_ALIASES.miniappAppointmentMy.legacyPath,
  miniappAppointmentSlots: LEGACY_API_ALIASES.miniappAppointmentSlots.legacyPath,
  miniappServicePackages: LEGACY_API_ALIASES.miniappServicePackages.legacyPath,
} as const;

export const DEPRECATED_CLIENT_API_PATH_METADATA = Object.fromEntries(
  Object.entries(LEGACY_API_ALIASES).map(([aliasKey, alias]) => [
    aliasKey,
    {
      lane: alias.canonicalLane,
      guardProfile:
        alias.canonicalLane === 'public'
          ? 'public-readonly'
          : alias.canonicalLane === 'platform'
            ? 'platform-bridge'
            : 'client-authenticated',
      tenantScope:
        alias.canonicalLane === 'platform'
          ? 'bootstrap-input'
          : alias.canonicalLane === 'public'
            ? 'required'
            : 'required',
      owner: 'contract-governance',
      stability: 'deprecated',
      canonical: false,
      deprecatedAliasOf: alias.deprecatedAliasOf,
      sourceDecision: SOURCE_DECISION,
    } satisfies ApiPathMetadata,
  ]),
) as Record<keyof typeof DEPRECATED_CLIENT_API_PATHS, ApiPathMetadata>;
