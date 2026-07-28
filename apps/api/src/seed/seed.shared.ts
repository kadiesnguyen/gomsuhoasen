import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import {
  isNotUndefined,
  isObjectRecord,
  readArrayInput,
  readFirstTrimmedString,
  readTextInputValue,
  readTrimmedString,
} from '@vt/common-utils';
import * as mongoose from 'mongoose';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  ARTISAN_STATUSES,
  createShowroomV2DefaultContent,
  PRODUCT_STATUSES,
  QUOTE_STATUSES,
  RFQ_SOURCE_VALUES,
  RFQ_STATUSES,
  USER_ROLES,
  USER_STATUSES,
} from '@gomhoasen/contracts';

export const SEED_MODEL_NAMES = {
  USER: 'User',
  PRODUCT: 'Product',
  ARTISAN: 'Artisan',
  SITE_CONFIG: 'SiteConfig',
  RFQ: 'Rfq',
  QUOTE: 'Quote',
  AUDIT_LOG: 'AuditLog',
} as const;

// ---- Schemas ----
export const UserSchema = new mongoose.Schema({
  fullName: String, email: { type: String, unique: true, lowercase: true },
  hashedPassword: { type: String, select: false }, role: { type: String, default: USER_ROLES.ADMIN },
  status: { type: String, default: USER_STATUSES.ACTIVE }, isDeleted: { type: Boolean, default: false },
  lastLoginAt: Date,
}, { timestamps: true, collection: 'users' });

export const ProductSchema = new mongoose.Schema({
  name: String, slug: { type: String, unique: true }, sku: String,
  status: { type: String, default: PRODUCT_STATUSES.ACTIVE }, collection: String, glaze: String,
  type: String, size: String, referencePrice: { type: Number, default: 0 },
  priceLabel: String, weight: Number, description: String, tags: [String],
  modelUrl: String, video360Url: String, poster: String, images: [String],
  viewSections: [Object], story: Object, variants: [Object],
  specs: Object, artisanId: String, seo: Object, sortOrder: { type: Number, default: 0 },
  isDeleted: { type: Boolean, default: false },
}, { timestamps: true, collection: 'products', suppressReservedKeysWarning: true });

export const ArtisanSchema = new mongoose.Schema({
  name: String, slug: { type: String, unique: true }, title: String, bio: String,
  avatar: String, coverImage: String, yearsExperience: Number,
  specialty: String, workshop: String, location: String,
  certifications: [String], phone: String, email: String,
  status: { type: String, default: ARTISAN_STATUSES.ACTIVE }, isDeleted: { type: Boolean, default: false },
}, { timestamps: true, collection: 'artisans' });

export const SiteConfigSchema = new mongoose.Schema({
  key: { type: String, unique: true, default: 'default' },
  brandName: String, tagline: String, subtitle: String, founded: String, location: String,
  contact: Object, social: Object, seo: Object,
  collections: [Object], occasions: [Object], journal: [Object], filters: Object,
}, { timestamps: true, collection: 'site_config' });

export const RfqSchema = new mongoose.Schema({
  customerName: String, customerEmail: String, customerPhone: String,
  customerCompany: String, message: String,
  lineItems: [Object], status: { type: String, default: RFQ_STATUSES.NEW },
  source: { type: String, enum: RFQ_SOURCE_VALUES, required: true },
  internalNote: String, assignedTo: String,
}, { timestamps: true, collection: 'rfqs' });

export const QuoteSchema = new mongoose.Schema({
  code: { type: String, unique: true }, rfqId: mongoose.Schema.Types.ObjectId,
  customerEmail: String, customerPhone: String, customerName: String,
  status: { type: String, default: QUOTE_STATUSES.DRAFT }, items: [Object],
  subtotal: { type: Number, default: 0 }, discount: { type: Number, default: 0 }, total: { type: Number, default: 0 },
  validUntil: Date, terms: String, pdfUrl: String, sentAt: Date, createdBy: mongoose.Schema.Types.ObjectId,
}, { timestamps: true, collection: 'quotes' });

export const AuditLogSchema = new mongoose.Schema({
  userId: String, action: String, entity: String, entityId: String,
  payload: Object, ip: String, userAgent: String,
}, { timestamps: true, collection: 'audit_logs' });

export interface PocBrandData {
  name: string;
  tagline: string;
  subtitle?: string;
  founded?: string;
  location?: string;
  phone?: string;
  email?: string;
  zalo?: string;
}

export interface PocSiteCollectionData {
  id: string;
  name: string;
  desc?: string;
  image?: string;
  count?: number;
}

export interface PocSiteOccasionData {
  id: string;
  name: string;
  icon?: string;
  desc?: string;
}

export interface PocSiteJournalData {
  id: string;
  title: string;
  excerpt?: string;
  image?: string;
}

export interface PocFilterOptionData {
  id: string;
  name: string;
  count?: number;
  swatch?: string;
  min?: number;
  max?: number;
}

export interface PocSiteProductData {
  id: string;
  name: string;
  collection?: string;
  collectionId?: string;
  glaze?: string;
  glazeId?: string;
  type?: string;
  typeId?: string;
  size?: string;
  price?: number;
  priceLabel?: string;
  image?: string;
  tags?: string[];
  has360?: boolean;
  isNew?: boolean;
  isLimited?: boolean;
  isBestSeller?: boolean;
  swatches?: string[];
  desc?: string;
}

export interface PocSiteData {
  brand: PocBrandData;
  collections: PocSiteCollectionData[];
  products: PocSiteProductData[];
  occasions?: PocSiteOccasionData[];
  journal?: PocSiteJournalData[];
  filters?: {
    types?: PocFilterOptionData[];
    glazes?: PocFilterOptionData[];
    priceRanges?: PocFilterOptionData[];
  };
}

export interface PocVariantData {
  id: string;
  name: string;
  swatch?: string;
  image?: string;
  description?: string;
  active?: boolean;
}

export interface PocHotspotPanelData {
  title?: string;
  content?: string;
  image?: string;
  cta?: {
    label?: string;
    href?: string;
  };
}

export interface PocHotspotData {
  id: string;
  position: string;
  normal: string;
  label: string;
  panel?: PocHotspotPanelData;
}

export interface PocViewSectionData {
  id: string;
  name: string;
  icon: string;
  camera?: { orbit: string; target: string };
  description?: string;
  hotspots?: PocHotspotData[];
}

export interface PocStoryData {
  title: string;
  subtitle?: string;
  content: string;
  image?: string;
}

export interface PocProductDetailData {
  product: {
    id: string;
    name: string;
    tagline?: string;
    collection?: string;
    year?: string;
    model?: string;
    heroImage?: string;
    poster?: string;
  };
  viewSections?: PocViewSectionData[];
  variants?: PocVariantData[];
  specs?: Record<string, string>;
  story?: PocStoryData;
}

const DEFAULT_SITE_BRAND = {
  name: 'GỐM HOA SEN',
  displayName: 'Gốm Hoa Sen',
  tagline: 'Gốm sứ nghệ thuật Việt Nam',
  defaultTagline: 'Gốm sứ nghệ thuật cho không gian sống hiện đại',
  location: 'Số 41 Giang Cao, Bát Tràng, Hà Nội',
  phone: '0961 189 292',
  email: 'Đang cập nhật',
} as const;

export function readSeedArray<T>(value: unknown): T[] {
  return readArrayInput<T>(value);
}

export function readSeedStringArray(value: unknown): string[] {
  return readSeedArray<unknown>(value)
    .map((item) => readTrimmedString(item))
    .filter(isNotUndefined);
}

export function readFirstSeedString(...values: unknown[]): string | undefined {
  return readFirstTrimmedString(...values);
}

export function readSeedObject<T extends object>(value: T | null | undefined): T | Record<string, never> {
  return isObjectRecord(value) ? value as T : {};
}

function readPocJsonFile<T>(relativePath: string, label: string): T | null {
  const filePath = resolve(process.cwd(), relativePath);
  try {
    return JSON.parse(readFileSync(filePath, 'utf8')) as T;
  } catch (error) {
    Logger.warn(`Cannot load ${label} from ${filePath}`, 'SeedRunner');
    return null;
  }
}

export function loadPocSiteData() {
  return readPocJsonFile<PocSiteData>('product-detail-360/data/site.json', 'site.json');
}

export function loadPocProductDetailData() {
  return readPocJsonFile<PocProductDetailData>('product-detail-360/data/product.json', 'product.json');
}

export function loadPocSiteConfig() {
  const site = loadPocSiteData();
  const showroomDefaults = createShowroomV2DefaultContent();
  const brand = site?.brand;
  const brandName = readFirstSeedString(showroomDefaults.brand.name, DEFAULT_SITE_BRAND.name) ?? DEFAULT_SITE_BRAND.name;
  const brandDisplayName =
    readFirstSeedString(showroomDefaults.brand.name, DEFAULT_SITE_BRAND.displayName) ?? DEFAULT_SITE_BRAND.displayName;
  const tagline = readFirstSeedString(showroomDefaults.brand.tagline, DEFAULT_SITE_BRAND.defaultTagline);
  const defaultDescription = readFirstSeedString(
    showroomDefaults.brand.subtitle,
    showroomDefaults.brand.tagline,
    DEFAULT_SITE_BRAND.tagline,
  );
  const location = readFirstSeedString(showroomDefaults.brand.location, DEFAULT_SITE_BRAND.location) ?? DEFAULT_SITE_BRAND.location;
  return {
    key: 'default',
    brandName,
    tagline,
    subtitle: readFirstSeedString(showroomDefaults.brand.subtitle),
    founded: readTrimmedString(brand?.founded),
    location,
    contact: {
      phone: readFirstSeedString(showroomDefaults.brand.phone, DEFAULT_SITE_BRAND.phone) ?? DEFAULT_SITE_BRAND.phone,
      email: readFirstSeedString(showroomDefaults.brand.email, DEFAULT_SITE_BRAND.email) ?? DEFAULT_SITE_BRAND.email,
      zaloOA: readTextInputValue(brand?.zalo),
      address: location,
    },
    social: {
      facebook: readFirstSeedString(showroomDefaults.brand.facebookHref),
    },
    seo: {
      defaultTitle: brandDisplayName,
      defaultDescription,
      ogImage: 'assets/editorial/hero.png',
    },
    collections: readSeedArray<PocSiteCollectionData>(site?.collections),
    occasions: readSeedArray<PocSiteOccasionData>(site?.occasions),
    journal: readSeedArray<PocSiteJournalData>(site?.journal),
    filters: readSeedObject(site?.filters),
  };
}
