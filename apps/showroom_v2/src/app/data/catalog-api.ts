import { buildJsonApiUrl, parseJsonApiResponse } from '@vt/platform-api-client';
import { expectApiArray, expectApiObject, resolveApiOrigin } from '@gomhoasen/contracts';

export async function fetchOptionalApiData<T>(
  requestPath: string,
  source: string,
  init?: RequestInit,
): Promise<T | null> {
  try {
    const apiBase = resolveApiOrigin();
    const response = await fetch(buildJsonApiUrl(apiBase, requestPath), init);
    if (!response.ok) return null;
    return await parseJsonApiResponse<T>(response, source);
  } catch {
    return null;
  }
}

async function fetchRequiredApiData<T>(
  requestPath: string,
  source: string,
  init?: RequestInit,
): Promise<T> {
  const apiBase = resolveApiOrigin();
  const response = await fetch(buildJsonApiUrl(apiBase, requestPath), init);
  if (!response.ok) {
    throw new Error(`${source} failed with HTTP ${response.status}`);
  }
  return parseJsonApiResponse<T>(response, source);
}

export async function fetchRequiredApiArray<T>(
  requestPath: string,
  source: string,
  init?: RequestInit,
): Promise<T[]> {
  const payload = await fetchRequiredApiData<unknown>(requestPath, source, init);
  return expectApiArray<T>(payload, source);
}

export async function fetchRequiredApiObjectOrNull<T>(
  requestPath: string,
  source: string,
  init?: RequestInit,
): Promise<T | null> {
  const apiBase = resolveApiOrigin();
  const response = await fetch(buildJsonApiUrl(apiBase, requestPath), init);
  if (response.status === 404) return null;
  if (!response.ok) {
    throw new Error(`${source} failed with HTTP ${response.status}`);
  }
  const payload = await parseJsonApiResponse<unknown>(response, source);
  return expectApiObject<T>(payload, source);
}

export async function fetchOptionalApiObject<T>(
  requestPath: string,
  source: string,
  init?: RequestInit,
): Promise<T | null> {
  const payload = await fetchOptionalApiData<unknown>(requestPath, source, init);
  return payload === null ? null : expectApiObject<T>(payload, source);
}

export async function fetchOptionalApiArray<T>(
  requestPath: string,
  source: string,
  init?: RequestInit,
): Promise<T[]> {
  const payload = await fetchOptionalApiData<unknown>(requestPath, source, init);
  return payload === null ? [] : expectApiArray<T>(payload, source);
}

// ----------------------------------------------------------------------------
// Catalog Flow Data Fetchers (Ported from legacy apps/showroom)
// ----------------------------------------------------------------------------
import {
  createShowroomV2DefaultContent,
  GHS_API,
  type SiteConfigContract,
  type ProductContract,
  type ProductVariantContract,
  type ViewSectionContract,
  type HotspotContract,
  type ProductStoryContract,
  type ShowroomV2ContentContract,
} from '@gomhoasen/contracts';
import {
  deriveShowroomCollections,
  deriveShowroomFilters,
  mapShowroomProducts,
  readSiteCollections,
  readShowroomFilters,
  type PublicProductApi,
  readFirstSectionArray,
} from './catalog-normalization';
import {
  readShowroomBrandName,
  readFirstShowroomFormText,
  joinShowroomTexts,
  readShowroomProductTagline,
  readShowroomGeneratedId,
  readShowroomSectionIcon,
  readShowroomCameraOrbit,
  readShowroomCameraTarget,
  readShowroomHotspotPosition,
  readShowroomHotspotNormal,
  readShowroomHotspotPanel,
  readShowroomVariantSwatch,
  readFirstShowroomText,
  requireFirstShowroomText,
  readShowroomSpecs,
  readShowroomStoryTitle,
} from '@gomhoasen/ui-showroom-server';
import { readTrimmedString } from '@vt/common-utils';

const DEFAULT_SHOWROOM_V2_BRAND = createShowroomV2DefaultContent().brand;

export async function getShowroomV2Content(): Promise<ShowroomV2ContentContract | null> {
  return fetchOptionalApiObject<ShowroomV2ContentContract>(
    GHS_API.SITE.V2_CONTENT,
    'showroom_v2.content'
  );
}

export async function getListingSiteData() {
  const [site, rawProducts, v2Content] = await Promise.all([
    fetchOptionalApiObject<SiteConfigContract>(
      GHS_API.SITE.CONFIG,
      'showroom.listing.siteConfig',
    ),
    fetchRequiredApiArray<PublicProductApi>(
      GHS_API.CATALOG.PUBLIC_PRODUCTS,
      'showroom.listing.products',
    ),
    getShowroomV2Content(),
  ]);

  const configuredCollections = readSiteCollections(site?.collections);
  const mappedProducts = mapShowroomProducts(rawProducts, configuredCollections, resolveApiOrigin());
  const collections = deriveShowroomCollections(configuredCollections, mappedProducts);
  const filters = deriveShowroomFilters(mappedProducts);
  const catalogCopy = {
    ...createShowroomV2DefaultContent().catalog,
    ...v2Content?.catalog,
  };
  const listingLabels = {
    ...createShowroomV2DefaultContent().catalog.listingLabels,
    ...v2Content?.catalog?.listingLabels,
  };
  const navigation = v2Content?.navigation?.items?.length
    ? v2Content.navigation.items
    : createShowroomV2DefaultContent().navigation.items;

  return {
    brand: {
      name:
        readTrimmedString(v2Content?.brand?.name) ||
        readTrimmedString(DEFAULT_SHOWROOM_V2_BRAND.name) ||
        readShowroomBrandName(site?.brandName),
      phone:
        readTrimmedString(v2Content?.brand?.phone) ||
        readTrimmedString(DEFAULT_SHOWROOM_V2_BRAND.phone) ||
        readFirstShowroomFormText(site?.contact?.phone),
      zalo: readFirstShowroomFormText(site?.contact?.zaloOA),
    },
    collections,
    products: mappedProducts,
    filters: readShowroomFilters(filters),
    navigation: navigation.map((item) => ({ label: item.label, href: item.href })),
    copy: {
      eyebrow: readTrimmedString(catalogCopy.listingEyebrow) || '',
      title: readTrimmedString(catalogCopy.listingTitle) || '',
      subtitle: readTrimmedString(catalogCopy.listingSubtitle) || '',
      advisorTitle: readTrimmedString(catalogCopy.listingAdvisorTitle) || '',
      advisorBody: readTrimmedString(catalogCopy.listingAdvisorBody) || '',
      labels: Object.fromEntries(
        Object.entries(listingLabels).map(([key, value]) => [key, readTrimmedString(value) || '']),
      ) as { [K in keyof NonNullable<ShowroomV2ContentContract['catalog']['listingLabels']>]-?: string },
    },
  };
}

// ----------------------------------------------------------------------------
// Product Details Helpers
// ----------------------------------------------------------------------------
import { readStringInput, readArrayInput, readStringArray } from './catalog-normalization';
import { PRODUCT_VARIANT_STATUSES } from '@gomhoasen/contracts';

type ApiProductPayload = Omit<ProductContract, 'specs' | 'story'> & {
  _id?: string;
  hotspots?: HotspotContract[];
  specs?: ProductContract['specs'] & {
    temperature?: string | number;
    firingTime?: string | number;
    technique?: string;
  };
  story?: ProductStoryContract | ProductStoryContract[];
};

type LegacyViewSection = Partial<ViewSectionContract> & {
  label?: string;
  cameraOrbit?: string;
  cameraTarget?: string;
};

type LegacyHotspot = Partial<HotspotContract> & {
  description?: string;
  image?: string;
};

type LegacyVariant = Partial<ProductVariantContract> & {
  swatchColor?: string;
  colorHex?: string;
  thumbnail?: string;
};

function normalizeViewSections(rawSections: ViewSectionContract[] | undefined, rawHotspots: HotspotContract[] | undefined) {
  const sections = readArrayInput<ViewSectionContract>(rawSections);
  return sections.map((raw, index) => {
    const section = raw as LegacyViewSection;
    const camera = section.camera;
    const hotspots = readFirstSectionArray<HotspotContract>(section.hotspots, rawHotspots, index);
    return {
      id: readShowroomGeneratedId(section.id, 'section', index),
      name: readFirstShowroomFormText(section.name, section.label),
      icon: readShowroomSectionIcon(section.icon),
      camera: {
        orbit: readShowroomCameraOrbit(camera?.orbit, section.cameraOrbit),
        target: readShowroomCameraTarget(camera?.target, section.cameraTarget),
      },
      description: readStringInput(section.description),
      hotspots: hotspots.map((h, i) => {
        const hotspot = h as LegacyHotspot;
        return {
          id: readShowroomGeneratedId(hotspot.id, 'hotspot', i),
          position: readShowroomHotspotPosition(hotspot.position),
          normal: readShowroomHotspotNormal(hotspot.normal),
          label: readStringInput(hotspot.label),
          panel: readShowroomHotspotPanel(hotspot.panel, hotspot),
        };
      }),
    };
  });
}

function normalizeVariants(rawVariants: ProductVariantContract[] | undefined) {
  const variants = readArrayInput<ProductVariantContract>(rawVariants);
  return variants.map((raw, index) => {
    const variant = raw as LegacyVariant;
    const status: ProductVariantContract['status'] = variant.status === PRODUCT_VARIANT_STATUSES.SOLD_OUT
      ? PRODUCT_VARIANT_STATUSES.SOLD_OUT
      : PRODUCT_VARIANT_STATUSES.ACTIVE;
    return {
      id: readShowroomGeneratedId(variant.id, 'variant', index),
      name: readStringInput(variant.name),
      glaze: readTrimmedString(variant.glaze),
      size: readTrimmedString(variant.size),
      swatch: readShowroomVariantSwatch(variant.swatch, variant.swatchColor, variant.colorHex),
      swatchImage: readTrimmedString(variant.swatchImage),
      image: readFirstShowroomText(variant.image, variant.thumbnail),
      description: readTrimmedString(variant.description),
      modelUrl: readTrimmedString(variant.modelUrl),
      referencePrice: typeof variant.referencePrice === 'number' ? variant.referencePrice : undefined,
      status,
    };
  });
}

function normalizeStory(rawStory: ApiProductPayload['story']) {
  const story = Array.isArray(rawStory) ? rawStory[0] : rawStory;
  if (!story || typeof story !== 'object') return null;
  const data = story as ProductStoryContract & { body?: string };
  const title = readTrimmedString(data.title);
  const content = readTrimmedString(data.content);
  const body = readTrimmedString(data.body);
  if (!title && !content && !body) return null;
  return {
    title: readShowroomStoryTitle(title),
    subtitle: readFirstShowroomFormText(data.subtitle),
    content: readFirstShowroomFormText(content, body),
    image: readTrimmedString(data.image),
  };
}

export async function getProduct(slug: string) {
  const [p, site, v2Content] = await Promise.all([
    fetchRequiredApiObjectOrNull<ApiProductPayload>(
      GHS_API.CATALOG.PUBLIC_PRODUCT_BY_SLUG(slug),
      'showroom.productDetail',
    ),
    fetchOptionalApiObject<SiteConfigContract>(
      GHS_API.SITE.CONFIG,
      'showroom.productDetail.siteConfig',
    ),
    getShowroomV2Content(),
  ]);
  if (!p) {
    return null;
  }

  const contact = site?.contact;
  const fallbackEmail = readStringInput(contact?.email);
  const preferredEmail = readTrimmedString(v2Content?.brand?.email);
  const defaultEmail = readTrimmedString(DEFAULT_SHOWROOM_V2_BRAND.email);
  const resolvedEmail = preferredEmail || fallbackEmail || defaultEmail;
  const joinedTagline = joinShowroomTexts([p.collection, p.glaze], ' • ');
  const defaultContent = createShowroomV2DefaultContent();
  const detailLabels = {
    ...defaultContent.catalog.detailLabels,
    ...v2Content?.catalog?.detailLabels,
  };
  return {
    id: requireFirstShowroomText('product.id', p.id, p._id, p.slug, slug),
    name: p.name,
    tagline: readShowroomProductTagline(joinedTagline, p.description),
    description: readShowroomProductTagline(p.description, joinedTagline),
    modelUrl: readTrimmedString(p.modelUrl),
    video360Url: readTrimmedString(p.video360Url),
    poster: readTrimmedString(p.poster),
    images: readStringArray(p.images),
    viewSections: normalizeViewSections(p.viewSections, p.hotspots),
    variants: normalizeVariants(p.variants),
    specs: readShowroomSpecs(p.specs),
    story: normalizeStory(p.story),
    brandName:
      readTrimmedString(v2Content?.brand?.name) ||
      readTrimmedString(DEFAULT_SHOWROOM_V2_BRAND.name) ||
      readShowroomBrandName(site?.brandName),
    copy: {
      backLabel:
        readTrimmedString(v2Content?.catalog?.detailBackLabel) ||
        readTrimmedString(defaultContent.catalog.detailBackLabel) ||
        '',
      ...Object.fromEntries(
        Object.entries(detailLabels).map(([key, value]) => [key, readTrimmedString(value) || '']),
      ) as { [K in keyof NonNullable<ShowroomV2ContentContract['catalog']['detailLabels']>]-?: string },
    },
    cta: {
      label: readTrimmedString(p.cta?.label) || '',
      zalo: readStringInput(contact?.zaloOA),
      hotline:
        readTrimmedString(v2Content?.brand?.phone) ||
        readTrimmedString(DEFAULT_SHOWROOM_V2_BRAND.phone) ||
        readStringInput(contact?.phone),
      email: resolvedEmail,
    },
  };
}
