// POC source: product-detail-360/data/product.json
// Zalo ref: ecommerce/schemas/product.schema.ts (drop: CatalogProfile, tenantId, dynamic fields)

export const PRODUCT_STATUSES = {
  ACTIVE: 'ACTIVE',
  SOLD_OUT: 'SOLD_OUT',
  IN_PRODUCTION: 'IN_PRODUCTION',
  DISPLAY_ONLY: 'DISPLAY_ONLY',
} as const;

export type ProductStatus = (typeof PRODUCT_STATUSES)[keyof typeof PRODUCT_STATUSES];

export const PRODUCT_STATUS_VALUES = Object.values(PRODUCT_STATUSES) as ProductStatus[];

export const PRODUCT_VARIANT_STATUSES = {
  ACTIVE: PRODUCT_STATUSES.ACTIVE,
  SOLD_OUT: PRODUCT_STATUSES.SOLD_OUT,
} as const;

export type ProductVariantStatus = (typeof PRODUCT_VARIANT_STATUSES)[keyof typeof PRODUCT_VARIANT_STATUSES];

export const PRODUCT_VARIANT_STATUS_VALUES = Object.values(PRODUCT_VARIANT_STATUSES) as ProductVariantStatus[];

export const PRODUCT_TAGS = {
  HAS_360: '360',
  NEW: 'new',
  LIMITED: 'limited',
  BEST_SELLER: 'bestSeller',
} as const;

export type ProductTag = (typeof PRODUCT_TAGS)[keyof typeof PRODUCT_TAGS];

export const PRODUCT_TAG_VALUES = Object.values(PRODUCT_TAGS) as ProductTag[];

/* ---- Hotspot sub-types (from POC viewSections[].hotspots[]) ---- */
export interface HotspotPanelContract {
  title: string;
  content: string;
  image?: string;
  cta?: string;
}

export interface HotspotContract {
  id: string;
  position: string;   // e.g. "0m 0.191m 0m"
  normal: string;      // e.g. "0 1 0"
  label: string;
  panel: HotspotPanelContract;
}

/* ---- View Section (from POC viewSections[]) ---- */
export interface ViewSectionContract {
  id: string;
  name: string;
  icon: string;
  camera: { orbit: string; target: string };
  description: string;
  hotspots: HotspotContract[];
}

/* ---- Variant ---- */
export interface ProductVariantContract {
  id: string;
  name: string;
  glaze?: string;
  size?: string;
  swatch: string;        // hex color
  swatchImage?: string;
  image?: string;         // variant preview image
  description?: string;
  modelUrl?: string;
  referencePrice?: number;
  status?: ProductVariantStatus;
  active?: boolean;
}

/* ---- Story (artisan) ---- */
export interface ProductStoryContract {
  title: string;
  subtitle: string;
  content: string;
  image?: string;
}

/* ---- CTA ---- */
export interface ProductCtaContract {
  label?: string;
  zalo?: string;
  hotline?: string;
  email?: string;
}

/* ---- SEO ---- */
export interface ProductSeoContract {
  metaTitle?: string;
  metaDescription?: string;
}

/* ---- Full Product ---- */
export interface ProductContract {
  id: string;
  name: string;
  slug: string;
  tagline?: string;
  description: string;
  collection?: string;
  collectionId?: string;
  type?: string;
  artisanId?: string;
  year?: string;
  glaze: string;
  size: string;
  weight?: number;
  referencePrice: number;
  priceLabel?: string;
  status: ProductStatus;
  images: string[];
  modelUrl?: string;
  video360Url?: string;
  poster?: string;
  viewSections: ViewSectionContract[];
  variants: ProductVariantContract[];
  specs: Record<string, string>;
  story?: ProductStoryContract;
  cta?: ProductCtaContract;
  tags?: string[];
  seo?: ProductSeoContract;
  createdAt?: string;
}
