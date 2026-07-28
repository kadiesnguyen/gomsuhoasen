/**
 * Portal API Surface
 *
 * Zalo ref:
 * - /Users/bonbon177tb/Documents/zalominiapp/v2/apps/v2-portal/src/services/api/catalog.api.ts
 * - /Users/bonbon177tb/Documents/zalominiapp/v2/apps/v2-portal/src/services/api/shared.ts
 *
 * Kept: module-based API surface, registry paths, strict response extraction.
 * Dropped: tenant resolution and SaaS module fan-out.
 * Adapted: GHS single-tenant routes and Vietnamese domain contracts.
 */
import axios, { type AxiosResponse } from 'axios';
import { readStorageText } from '@vt/common-utils';
import { unwrapJsonApiPayload } from '@vt/platform-api-client';
import {
  GHS_API,
  type ArtisanStatus,
  type ProductStatus,
  type ProductVariantStatus,
  type QuoteStatus,
  type RfqSource,
  type RfqStatus,
  type FileAssetContract,
  type FileAssetStatusContract,
  type FileCommitRefsInput,
  type FileCommitRefsResult,
  type FileUnrefInput,
  type FileUnrefResult,
  type PaginatedPayload,
  type ProvenanceType,
  type SiteConfigContract,
  type ShowroomV2ContentContract,
  type SiteContactContract,
  type SiteSeoContract,
  type UserRole,
  expectApiArray,
  expectApiObject,
  expectApiPaginated,
  resolveApiOrigin,
  toApiUrl,
  toAssetUrl,
  withApiCanonicalId,
  withApiPaginatedCanonicalIds,
} from '@gomhoasen/contracts';

type WindowWithApiUrl = Window & { __API_URL__?: string };
type QueryParams = { [key: string]: string | number | undefined };
type FileAssetListParams = QueryParams & {
  status?: FileAssetStatusContract;
  moduleRef?: string;
};
type MutationPayload = { [key: string]: unknown };
type ApiObject = { [key: string]: unknown };
type MaybeIdentifiedApi = { id?: string; _id?: string };
export type IdentifiedApi = { id: string; _id?: string };

export interface UserApi extends ApiObject {
  id: string;
  _id?: string;
  email: string;
  fullName: string;
  role: UserRole;
}

export interface LoginResponseApi {
  user: UserApi;
  accessToken: string;
}

export interface ProductApi extends ApiObject {
  id: string;
  _id?: string;
  name: string;
  slug: string;
  sku?: string;
  status: ProductStatus;
  collection?: string;
  artisanId?: string;
  glaze?: string;
  type?: string;
  size?: string;
  referencePrice: number;
  priceLabel?: string;
  weight?: number;
  description?: string;
  tags?: string[];
  modelUrl?: string;
  video360Url?: string;
  poster?: string;
  images?: string[];
  specs?: ProductSpecsApi;
  story?: ProductStoryApi | ProductStoryApi[];
  variants?: ProductVariantApi[];
  viewSections?: ProductViewSectionApi[];
  hotspots?: ProductHotspotApi[];
  seo?: ProductSeoApi;
}

export interface ProductSpecsApi {
  temperature?: number;
  firingTime?: number;
  technique?: string;
  [key: string]: string | number | undefined;
}

export interface ProductStoryApi {
  title?: string;
  subtitle?: string;
  content?: string;
  body?: string;
  image?: string;
}

export interface ProductVariantApi {
  id?: string;
  name?: string;
  glaze?: string;
  size?: string;
  swatchColor?: string;
  colorHex?: string;
  swatchImage?: string;
  image?: string;
  thumbnail?: string;
  modelUrl?: string;
  referencePrice?: number;
  status?: ProductVariantStatus;
}

export interface ProductHotspotPanelApi {
  title?: string;
  content?: string;
  image?: string;
  cta?: string;
}

export interface ProductHotspotApi {
  id?: string;
  position?: string;
  normal?: string;
  label?: string;
  description?: string;
  image?: string;
  panel?: ProductHotspotPanelApi;
}

export interface ProductViewSectionApi {
  id?: string;
  name?: string;
  label?: string;
  icon?: string;
  camera?: { orbit?: string; target?: string };
  cameraOrbit?: string;
  cameraTarget?: string;
  description?: string;
  hotspots?: ProductHotspotApi[];
}

export interface ProductSeoApi {
  metaTitle?: string;
  metaDescription?: string;
}

export interface ArtisanApi extends ApiObject {
  id: string;
  _id?: string;
  name: string;
  slug: string;
  status: ArtisanStatus;
  avatar?: string;
  coverImage?: string;
  title?: string;
  bio?: string;
  specialty?: string;
  workshop?: string;
  location?: string;
  lineage?: string;
  certifications?: string[];
  phone?: string;
  email?: string;
  yearsExperience?: number;
}

export interface RfqApi extends ApiObject {
  id: string;
  _id?: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  message?: string;
  status: RfqStatus;
  source: RfqSource;
  createdAt: string;
  lineItems: Array<{ productId: string; productName: string; quantity: number; variant?: string }>;
}

export interface QuoteItemApi extends ApiObject {
  productName: string;
  productId?: string;
  glaze?: string;
  size?: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  customization?: string;
}

export interface QuoteApi extends ApiObject {
  id: string;
  _id?: string;
  code: string;
  rfqId?: string;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  items: QuoteItemApi[];
  subtotal: number;
  discount: number;
  total: number;
  totalAmount?: number;
  terms?: string;
  status: QuoteStatus;
  pdfUrl?: string;
  sentAt?: string;
  publicShareToken?: string;
  publicShareExpiresAt?: string;
  validUntil?: string;
  createdAt: string;
}

export interface ProvenanceApi extends ApiObject {
  id: string;
  _id?: string;
  type: ProvenanceType;
  title: string;
  fileUrl: string;
  issuedDate?: string;
  issuedBy?: string;
  isActive?: boolean;
}

export interface FileAssetApi extends FileAssetContract {
  _id?: string;
}

export interface DashboardLatestRfqApi extends IdentifiedApi {
  customerName?: string;
  customerPhone?: string;
  status?: RfqStatus;
  createdAt?: string;
}

export interface DashboardLatestQuoteApi extends IdentifiedApi {
  code?: string;
  customerName?: string;
  status?: QuoteStatus;
  total?: number;
  createdAt?: string;
}

export interface DashboardStatsApi {
  productsActive: number;
  productsTotal: number;
  rfqNew: number;
  rfqTotal: number;
  quotesTotal: number;
  quotesSent: number;
  acceptedValue: number;
  artisansActive: number;
  latestRfqs: DashboardLatestRfqApi[];
  latestQuotes: DashboardLatestQuoteApi[];
  chartData: Array<{ name: string; rfqs: number; quotes: number }>;
}

type DashboardStatsRawApi = Omit<DashboardStatsApi, 'latestRfqs' | 'latestQuotes'> & {
  latestRfqs: Array<Omit<DashboardLatestRfqApi, 'id'> & MaybeIdentifiedApi>;
  latestQuotes: Array<Omit<DashboardLatestQuoteApi, 'id'> & MaybeIdentifiedApi>;
};

export type SiteContactApi = SiteContactContract;
export type SiteSeoApi = SiteSeoContract;

export interface SiteConfigApi extends ApiObject {
  brandName?: SiteConfigContract['brandName'];
  tagline?: SiteConfigContract['tagline'];
  subtitle?: SiteConfigContract['subtitle'];
  location?: SiteConfigContract['location'];
  contact?: SiteContactContract;
  seo?: SiteSeoContract;
}

export interface AuditLogContract {
  id: string;
  _id?: string;
  userId?: string;
  action?: string;
  entity?: string;
  entityId?: string;
  changes?: { [key: string]: unknown };
  ip?: string;
  createdAt?: string;
}

const apiRuntimeEnv = {
  VITE_API_URL: import.meta.env.VITE_API_URL,
  NEXT_PUBLIC_API_URL: typeof window !== 'undefined' ? (window as WindowWithApiUrl).__API_URL__ : undefined,
};

const resolvedApiBase = resolveApiOrigin(apiRuntimeEnv);
const configuredSiteOrigin =
  typeof import.meta.env.VITE_SITE_URL === 'string'
    ? import.meta.env.VITE_SITE_URL.trim().replace(/\/+$/, '')
    : '';

export const API_BASE = resolvedApiBase;

export function apiAssetUrl(path: string) {
  const assetUrl = toAssetUrl(path, API_BASE) ?? '';
  if (
    !assetUrl ||
    /^(https?:)?\/\//.test(assetUrl) ||
    !configuredSiteOrigin ||
    configuredSiteOrigin === '/'
  ) {
    return assetUrl;
  }
  return `${configuredSiteOrigin}/${assetUrl.replace(/^\/+/, '')}`;
}

export const http = axios.create({ baseURL: API_BASE });

http.interceptors.request.use((config) => {
  const token = readStorageText(localStorage, 'ghs_token', '');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

function payload<T>(source: string) {
  return (response: AxiosResponse<unknown>): T =>
    unwrapJsonApiPayload<T>(response.data, source, response.status);
}

function objectPayload<T>(source: string) {
  return (response: AxiosResponse<unknown>): T => expectApiObject<T>(response.data, source);
}

function listPayload<T>(source: string) {
  return (response: AxiosResponse<unknown>): T[] => expectApiArray<T>(response.data, source);
}

function paginatedPayload<T>(source: string) {
  return (response: AxiosResponse<unknown>): PaginatedPayload<T> =>
    expectApiPaginated<T>(response.data, source);
}

function withCanonicalId<T extends MaybeIdentifiedApi>(item: T, source: string): T & IdentifiedApi {
  return withApiCanonicalId(item, source, { allowMongoIdAlias: true });
}

function objectPayloadWithId<T extends MaybeIdentifiedApi>(source: string) {
  return (response: AxiosResponse<unknown>): T & IdentifiedApi =>
    withCanonicalId(expectApiObject<T>(response.data, source), source);
}

function listPayloadWithId<T extends MaybeIdentifiedApi>(source: string) {
  return (response: AxiosResponse<unknown>): Array<T & IdentifiedApi> =>
    expectApiArray<T>(response.data, source).map((item) => withCanonicalId(item, source));
}

function paginatedPayloadWithId<T extends MaybeIdentifiedApi>(source: string) {
  return (response: AxiosResponse<unknown>): PaginatedPayload<T & IdentifiedApi> => {
    const page = expectApiPaginated<T>(response.data, source);
    return withApiPaginatedCanonicalIds(page, source, { allowMongoIdAlias: true });
  };
}

function dashboardStatsPayload(source: string) {
  return (response: AxiosResponse<unknown>): DashboardStatsApi => {
    const stats = unwrapJsonApiPayload<DashboardStatsRawApi>(response.data, source, response.status);
    return {
      ...stats,
      latestRfqs: stats.latestRfqs.map((item) => withCanonicalId(item, source)),
      latestQuotes: stats.latestQuotes.map((item) => withCanonicalId(item, source)),
    };
  };
}

export const api = {
  auth: {
    login: (email: string, password: string) =>
      http.post(GHS_API.AUTH.LOGIN, { email, password }).then(payload<LoginResponseApi>('auth.login')),
    me: () => http.get(GHS_API.AUTH.ME).then(payload<UserApi | null>('auth.me')),
    createUser: (data: { fullName: string; email: string; password: string }) =>
      http.post(GHS_API.AUTH.CREATE_USER, data).then(payload('auth.createUser')),
  },

  catalog: {
    list: (params?: QueryParams) =>
      http.get(GHS_API.CATALOG.PRODUCTS, { params }).then(listPayloadWithId<ProductApi>('catalog.list')),
    get: (id: string) =>
      http.get(GHS_API.CATALOG.PRODUCT_BY_ID(id)).then(objectPayloadWithId<ProductApi>('catalog.get')),
    create: (data: MutationPayload) =>
      http.post(GHS_API.CATALOG.PRODUCTS, data).then(objectPayloadWithId<ProductApi>('catalog.create')),
    update: (id: string, data: MutationPayload) =>
      http.patch(GHS_API.CATALOG.PRODUCT_BY_ID(id), data).then(objectPayloadWithId<ProductApi>('catalog.update')),
    delete: (id: string) =>
      http.delete(GHS_API.CATALOG.PRODUCT_BY_ID(id)).then(payload('catalog.delete')),
    uploadImage: (id: string, file: File) => {
      const body = new FormData();
      body.append('file', file);
      return http.post(GHS_API.CATALOG.PRODUCT_IMAGES(id), body).then(objectPayloadWithId<ProductApi>('catalog.uploadImage'));
    },
    uploadModel: (id: string, file: File) => {
      const body = new FormData();
      body.append('file', file);
      return http.post(GHS_API.CATALOG.PRODUCT_MODEL(id), body).then(objectPayloadWithId<ProductApi>('catalog.uploadModel'));
    },
    uploadVideo360: (id: string, file: File) => {
      const body = new FormData();
      body.append('file', file);
      return http.post(GHS_API.CATALOG.PRODUCT_VIDEO_360(id), body).then(objectPayloadWithId<ProductApi>('catalog.uploadVideo360'));
    },
    provenance: {
      list: (productId: string) =>
        http.get(GHS_API.CATALOG.PRODUCT_PROVENANCE(productId)).then(listPayloadWithId<ProvenanceApi>('catalog.provenance.list')),
      upload: (
        productId: string,
        file: File,
        data: { type: ProvenanceType; title: string; issuedDate?: string; issuedBy?: string },
      ) => {
        const body = new FormData();
        body.append('file', file);
        body.append('type', data.type);
        body.append('title', data.title);
        if (data.issuedDate) body.append('issuedDate', data.issuedDate);
        if (data.issuedBy) body.append('issuedBy', data.issuedBy);
        return http
          .post(GHS_API.CATALOG.PRODUCT_PROVENANCE(productId), body)
          .then(payload('catalog.provenance.upload'));
      },
      update: (id: string, data: MutationPayload) =>
        http.patch(GHS_API.CATALOG.PROVENANCE_BY_ID(id), data).then(payload('catalog.provenance.update')),
      delete: (id: string) =>
        http.delete(GHS_API.CATALOG.PROVENANCE_BY_ID(id)).then(payload('catalog.provenance.delete')),
    },
  },

  rfq: {
    list: (params?: QueryParams) =>
      http.get(GHS_API.RFQ.LIST, { params }).then(listPayloadWithId<RfqApi>('rfq.list')),
    get: (id: string) =>
      http.get(GHS_API.RFQ.BY_ID(id)).then(objectPayloadWithId<RfqApi>('rfq.get')),
    updateStatus: (id: string, status: RfqStatus, note?: string) =>
      http.patch(GHS_API.RFQ.STATUS(id), { status, internalNote: note }).then(objectPayloadWithId<RfqApi>('rfq.updateStatus')),
  },

  quote: {
    list: (params?: QueryParams) =>
      http.get(GHS_API.QUOTE.LIST, { params }).then(listPayloadWithId<QuoteApi>('quote.list')),
    get: (id: string) =>
      http.get(GHS_API.QUOTE.BY_ID(id)).then(objectPayloadWithId<QuoteApi>('quote.get')),
    create: (data: MutationPayload) =>
      http.post(GHS_API.QUOTE.CREATE, data).then(objectPayloadWithId<QuoteApi>('quote.create')),
    update: (id: string, data: MutationPayload) =>
      http.patch(GHS_API.QUOTE.UPDATE(id), data).then(objectPayloadWithId<QuoteApi>('quote.update')),
    generatePdf: (id: string) =>
      http.post(GHS_API.QUOTE.PDF(id)).then(objectPayloadWithId<QuoteApi>('quote.generatePdf')),
    send: (id: string) =>
      http.post(GHS_API.QUOTE.SEND(id)).then(objectPayloadWithId<QuoteApi>('quote.send')),
  },

  dashboard: {
    stats: () => http.get(GHS_API.DASHBOARD.STATS).then(dashboardStatsPayload('dashboard.stats')),
  },

  audit: {
    list: (params?: QueryParams) =>
      http.get(GHS_API.DASHBOARD.AUDIT_LOGS, { params }).then(paginatedPayloadWithId<AuditLogContract>('audit.list')),
  },

  artisan: {
    list: (params?: QueryParams) =>
      http.get(GHS_API.ARTISAN.ADMIN_LIST, { params }).then(listPayloadWithId<ArtisanApi>('artisan.list')),
    get: (id: string) =>
      http.get(GHS_API.ARTISAN.ADMIN_BY_ID(id)).then(objectPayloadWithId<ArtisanApi>('artisan.get')),
    create: (data: MutationPayload) =>
      http.post(GHS_API.ARTISAN.CREATE, data).then(objectPayloadWithId<ArtisanApi>('artisan.create')),
    update: (id: string, data: MutationPayload) =>
      http.patch(GHS_API.ARTISAN.UPDATE(id), data).then(objectPayloadWithId<ArtisanApi>('artisan.update')),
    delete: (id: string) =>
      http.delete(GHS_API.ARTISAN.DELETE(id)).then(payload('artisan.delete')),
    uploadAvatar: (id: string, file: File) => {
      const body = new FormData();
      body.append('file', file);
      return http.post(GHS_API.ARTISAN.AVATAR(id), body).then(objectPayloadWithId<ArtisanApi>('artisan.uploadAvatar'));
    },
  },

  files: {
    uploadAsset: (
      file: File,
      refs?: { moduleRef?: string; entityRef?: string; fieldRef?: string },
    ) => {
      const body = new FormData();
      body.append('file', file);
      if (refs?.moduleRef) body.append('moduleRef', refs.moduleRef);
      if (refs?.entityRef) body.append('entityRef', refs.entityRef);
      if (refs?.fieldRef) body.append('fieldRef', refs.fieldRef);
      return http.post(GHS_API.FILES.ASSETS, body).then(objectPayload<FileAssetApi>('files.uploadAsset'));
    },
    listAssets: (params?: FileAssetListParams) =>
      http.get(GHS_API.FILES.ASSETS, { params }).then(paginatedPayload<FileAssetApi>('files.listAssets')),
    commitRefs: (payloadInput: FileCommitRefsInput) =>
      http.post(GHS_API.FILES.COMMIT_REFS, payloadInput).then(objectPayload<FileCommitRefsResult>('files.commitRefs')),
    unref: (payloadInput: FileUnrefInput) =>
      http.post(GHS_API.FILES.UNREF, payloadInput).then(objectPayload<FileUnrefResult>('files.unref')),
    contentUrl: (id: string) => toApiUrl(GHS_API.FILES.ASSET_CONTENT(id), apiRuntimeEnv),
  },

  site: {
    getConfig: () => http.get(GHS_API.SITE.CONFIG).then(payload<SiteConfigApi>('site.getConfig')),
    updateConfig: (data: MutationPayload) =>
      http.put(GHS_API.SITE.CONFIG, data).then(payload('site.updateConfig')),
    getV2Content: () => http.get(GHS_API.SITE.V2_CONTENT).then(payload<ShowroomV2ContentContract>('site.getV2Content')),
    updateV2Content: (data: ShowroomV2ContentContract) =>
      http.put(GHS_API.SITE.V2_CONTENT, data).then(payload<ShowroomV2ContentContract>('site.updateV2Content')),
  },
};
