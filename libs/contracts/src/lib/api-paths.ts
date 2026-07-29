import {
  applyApiRouteParams,
  buildApiPath,
} from '@vt/platform-api-contract/browser';

/**
 * GHS API Path Registry — Single source of truth for all API routes.
 *
 * Zalo ref: @v2/constants — API_CONTROLLER_PATHS, API_METHOD_PATHS
 * Adapted: GHS single-tenant, no dynamic module paths, no tenant resolution.
 *
 * Usage:
 *   Backend controller: @Controller(GHS_CONTROLLERS.CATALOG.PRODUCT)
 *   Portal API call:    http.get(\`/api/\${GHS_CONTROLLERS.CATALOG.PRODUCT}\`)
 *
 * Rule: NEVER hardcode a route string in controller decorators or portal API.
 *       Import from @gomhoasen/contracts instead.
 */

// ─── Controller base paths (used in @Controller() decorators) ─────────
// NOTE: These do NOT include the '/api' prefix — that is set by app.setGlobalPrefix('api').
export const GHS_CONTROLLERS = {
  IAM: {
    AUTH: 'iam/auth',
  },
  CATALOG: {
    PRODUCT: 'catalog/products',
    CATEGORY: 'catalog/categories',
    ADMIN_CATALOG: 'catalog',
    PUBLIC_CATALOG: 'public/catalog',
    PUBLIC_PRODUCT_PROVENANCE: 'public/catalog/products/:productId/provenance',
  },
  RFQ: {
    ADMIN: 'rfq',
    PUBLIC: 'public/rfq',
  },
  ORDER: {
    ADMIN: 'orders',
    PUBLIC: 'public/orders',
  },
  QUOTE: {
    ADMIN: 'quotes',
    PUBLIC: 'public/quotes',
  },
  ARTISAN: {
    PUBLIC: 'artisans',
    ADMIN: 'admin/artisans',
  },
  SITE: {
    ROOT: 'site',
    CONFIG: 'site-config',
    V2_CONTENT: 'site/v2-content',
  },
  FILE: {
    MAIN: 'files',
  },
  DASHBOARD: {
    MAIN: 'dashboard',
    AUDIT_LOGS: 'audit-logs',
  },
  HEALTH: {
    MAIN: 'health',
  },
  UPLOAD: {
    MAIN: 'upload',
  },
} as const;

// ─── Method sub-paths (used in @Get(), @Post(), etc.) ─────────────────
export const GHS_METHODS = {
  COMMON: {
    BY_ID: ':id',
    BY_SLUG: ':slug',
  },
  IAM: {
    LOGIN: 'login',
    ME: 'me',
    CREATE_USER: 'create-user',
    CHANGE_PASSWORD: 'change-password',
  },
  CATALOG: {
    BY_SLUG: ':slug',
    BULK_STATUS: 'bulk-status',
    IMAGES: ':id/images',
    IMAGE_BY_NAME: ':id/images/:filename',
    MODEL: ':id/model',
    VIDEO_360: ':id/video-360',
    PRODUCT_PROVENANCE: 'products/:productId/provenance',
    PROVENANCE_BY_ID: 'provenance/:id',
    PUBLIC_PRODUCTS: 'products',
    PUBLIC_PRODUCT_BY_SLUG: 'products/:slug',
    PUBLIC_CATEGORIES: 'categories',
  },
  ARTISAN: {
    ADMIN_LIST: 'admin',
    ADMIN_BY_ID: 'admin/:id',
    AVATAR: ':id/avatar',
  },
  RFQ: {
    STATUS: ':id/status',
  },
  ORDER: {
    STATUS: ':id/status',
  },
  QUOTE: {
    PDF: ':id/pdf',
    SEND: ':id/send',
  },
  DASHBOARD: {
    STATS: 'stats',
    OVERVIEW: 'overview',
  },
  FILE: {
    ASSETS: 'assets',
    COMMIT_REFS: 'assets/commit-refs',
    UNREF: 'assets/unref',
    ASSET_CONTENT: 'assets/:id/content',
  },
} as const;

// ─── Full API paths (for portal/showroom consumers, includes /api prefix) ──
// These resolve to the actual HTTP paths the client should call.
export const GHS_API_PREFIX = '/api';

function resolveGhsApiRoute(...parts: string[]): string {
  return buildApiPath(GHS_API_PREFIX, ...parts);
}

export const GHS_API = {
  AUTH: {
    LOGIN: resolveGhsApiRoute(GHS_CONTROLLERS.IAM.AUTH, GHS_METHODS.IAM.LOGIN),
    ME: resolveGhsApiRoute(GHS_CONTROLLERS.IAM.AUTH, GHS_METHODS.IAM.ME),
    CREATE_USER: resolveGhsApiRoute(
      GHS_CONTROLLERS.IAM.AUTH,
      GHS_METHODS.IAM.CREATE_USER,
    ),
    CHANGE_PASSWORD: resolveGhsApiRoute(
      GHS_CONTROLLERS.IAM.AUTH,
      GHS_METHODS.IAM.CHANGE_PASSWORD,
    ),
  },
  CATALOG: {
    PRODUCTS: resolveGhsApiRoute(GHS_CONTROLLERS.CATALOG.PRODUCT),
    PRODUCT_BY_ID: (id: string) =>
      resolveGhsApiRoute(GHS_CONTROLLERS.CATALOG.PRODUCT, id),
    PRODUCT_IMAGES: (id: string) =>
      resolveGhsApiRoute(
        GHS_CONTROLLERS.CATALOG.PRODUCT,
        applyApiRouteParams(GHS_METHODS.CATALOG.IMAGES, { id }),
      ),
    PRODUCT_MODEL: (id: string) =>
      resolveGhsApiRoute(
        GHS_CONTROLLERS.CATALOG.PRODUCT,
        applyApiRouteParams(GHS_METHODS.CATALOG.MODEL, { id }),
      ),
    PRODUCT_VIDEO_360: (id: string) =>
      resolveGhsApiRoute(
        GHS_CONTROLLERS.CATALOG.PRODUCT,
        applyApiRouteParams(GHS_METHODS.CATALOG.VIDEO_360, { id }),
      ),
    PRODUCT_PROVENANCE: (productId: string) =>
      resolveGhsApiRoute(
        GHS_CONTROLLERS.CATALOG.ADMIN_CATALOG,
        applyApiRouteParams(GHS_METHODS.CATALOG.PRODUCT_PROVENANCE, {
          productId,
        }),
      ),
    PROVENANCE_BY_ID: (id: string) =>
      resolveGhsApiRoute(
        GHS_CONTROLLERS.CATALOG.ADMIN_CATALOG,
        applyApiRouteParams(GHS_METHODS.CATALOG.PROVENANCE_BY_ID, { id }),
      ),
    PUBLIC_PRODUCT_PROVENANCE: (productId: string) =>
      resolveGhsApiRoute(
        applyApiRouteParams(GHS_CONTROLLERS.CATALOG.PUBLIC_PRODUCT_PROVENANCE, {
          productId,
        }),
      ),
    PUBLIC_PRODUCTS: resolveGhsApiRoute(
      GHS_CONTROLLERS.CATALOG.PUBLIC_CATALOG,
      GHS_METHODS.CATALOG.PUBLIC_PRODUCTS,
    ),
    PUBLIC_PRODUCT_BY_SLUG: (slug: string) =>
      resolveGhsApiRoute(
        GHS_CONTROLLERS.CATALOG.PUBLIC_CATALOG,
        applyApiRouteParams(GHS_METHODS.CATALOG.PUBLIC_PRODUCT_BY_SLUG, {
          slug,
        }),
      ),
    CATEGORIES: resolveGhsApiRoute(GHS_CONTROLLERS.CATALOG.CATEGORY),
    CATEGORY_BY_ID: (id: string) =>
      resolveGhsApiRoute(GHS_CONTROLLERS.CATALOG.CATEGORY, id),
    PUBLIC_CATEGORIES: resolveGhsApiRoute(
      GHS_CONTROLLERS.CATALOG.PUBLIC_CATALOG,
      GHS_METHODS.CATALOG.PUBLIC_CATEGORIES,
    ),
  },
  ARTISAN: {
    LIST: resolveGhsApiRoute(GHS_CONTROLLERS.ARTISAN.PUBLIC),
    ADMIN_LIST: resolveGhsApiRoute(GHS_CONTROLLERS.ARTISAN.ADMIN),
    ADMIN_BY_ID: (id: string) =>
      resolveGhsApiRoute(GHS_CONTROLLERS.ARTISAN.ADMIN, id),
    PUBLIC_BY_SLUG: (slug: string) =>
      resolveGhsApiRoute(GHS_CONTROLLERS.ARTISAN.PUBLIC, slug),
    CREATE: resolveGhsApiRoute(GHS_CONTROLLERS.ARTISAN.ADMIN),
    UPDATE: (id: string) =>
      resolveGhsApiRoute(GHS_CONTROLLERS.ARTISAN.ADMIN, id),
    AVATAR: (id: string) =>
      resolveGhsApiRoute(
        GHS_CONTROLLERS.ARTISAN.ADMIN,
        applyApiRouteParams(GHS_METHODS.ARTISAN.AVATAR, { id }),
      ),
    DELETE: (id: string) =>
      resolveGhsApiRoute(GHS_CONTROLLERS.ARTISAN.ADMIN, id),
  },
  RFQ: {
    LIST: resolveGhsApiRoute(GHS_CONTROLLERS.RFQ.ADMIN),
    BY_ID: (id: string) => resolveGhsApiRoute(GHS_CONTROLLERS.RFQ.ADMIN, id),
    STATUS: (id: string) =>
      resolveGhsApiRoute(
        GHS_CONTROLLERS.RFQ.ADMIN,
        applyApiRouteParams(GHS_METHODS.RFQ.STATUS, { id }),
      ),
    PUBLIC_SUBMIT: resolveGhsApiRoute(GHS_CONTROLLERS.RFQ.PUBLIC),
  },
  ORDER: {
    LIST: resolveGhsApiRoute(GHS_CONTROLLERS.ORDER.ADMIN),
    BY_ID: (id: string) => resolveGhsApiRoute(GHS_CONTROLLERS.ORDER.ADMIN, id),
    STATUS: (id: string) =>
      resolveGhsApiRoute(
        GHS_CONTROLLERS.ORDER.ADMIN,
        applyApiRouteParams(GHS_METHODS.ORDER.STATUS, { id }),
      ),
    PUBLIC_SUBMIT: resolveGhsApiRoute(GHS_CONTROLLERS.ORDER.PUBLIC),
  },
  QUOTE: {
    LIST: resolveGhsApiRoute(GHS_CONTROLLERS.QUOTE.ADMIN),
    BY_ID: (id: string) => resolveGhsApiRoute(GHS_CONTROLLERS.QUOTE.ADMIN, id),
    CREATE: resolveGhsApiRoute(GHS_CONTROLLERS.QUOTE.ADMIN),
    UPDATE: (id: string) => resolveGhsApiRoute(GHS_CONTROLLERS.QUOTE.ADMIN, id),
    PDF: (id: string) =>
      resolveGhsApiRoute(
        GHS_CONTROLLERS.QUOTE.ADMIN,
        applyApiRouteParams(GHS_METHODS.QUOTE.PDF, { id }),
      ),
    SEND: (id: string) =>
      resolveGhsApiRoute(
        GHS_CONTROLLERS.QUOTE.ADMIN,
        applyApiRouteParams(GHS_METHODS.QUOTE.SEND, { id }),
      ),
    PUBLIC_VIEW: (id: string) =>
      resolveGhsApiRoute(GHS_CONTROLLERS.QUOTE.PUBLIC, id),
  },
  SITE: {
    CONFIG: resolveGhsApiRoute(GHS_CONTROLLERS.SITE.CONFIG),
    V2_CONTENT: resolveGhsApiRoute(GHS_CONTROLLERS.SITE.V2_CONTENT),
  },
  FILES: {
    ASSETS: resolveGhsApiRoute(
      GHS_CONTROLLERS.FILE.MAIN,
      GHS_METHODS.FILE.ASSETS,
    ),
    COMMIT_REFS: resolveGhsApiRoute(
      GHS_CONTROLLERS.FILE.MAIN,
      GHS_METHODS.FILE.COMMIT_REFS,
    ),
    UNREF: resolveGhsApiRoute(
      GHS_CONTROLLERS.FILE.MAIN,
      GHS_METHODS.FILE.UNREF,
    ),
    ASSET_CONTENT: (id: string) =>
      resolveGhsApiRoute(
        GHS_CONTROLLERS.FILE.MAIN,
        applyApiRouteParams(GHS_METHODS.FILE.ASSET_CONTENT, { id }),
      ),
  },
  DASHBOARD: {
    STATS: resolveGhsApiRoute(
      GHS_CONTROLLERS.DASHBOARD.MAIN,
      GHS_METHODS.DASHBOARD.STATS,
    ),
    AUDIT_LOGS: resolveGhsApiRoute(GHS_CONTROLLERS.DASHBOARD.AUDIT_LOGS),
  },
  HEALTH: {
    CHECK: resolveGhsApiRoute(GHS_CONTROLLERS.HEALTH.MAIN),
  },
} as const;
