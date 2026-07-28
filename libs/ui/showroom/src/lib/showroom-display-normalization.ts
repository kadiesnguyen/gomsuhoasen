import {
  readArrayInput,
  readFirstTextInputValue,
  readFirstTrimmedString,
  readJoinedTextParts,
  readTextInputValue,
  readTrimmedString,
  requireFirstTrimmedString,
} from '@vt/common-utils';

export const SHOWROOM_DEFAULT_CAMERA_ORBIT = '30deg 75deg 0.43m';
export const SHOWROOM_DEFAULT_CAMERA_TARGET = '0m 0.101m 0m';
export const SHOWROOM_DEFAULT_HOTSPOT_POSITION = '0m 0.1m 0m';
export const SHOWROOM_DEFAULT_HOTSPOT_NORMAL = '0 1 0';
export const SHOWROOM_DEFAULT_SECTION_ICON = 'section';
export const SHOWROOM_DEFAULT_VARIANT_SWATCH = '#9A7520';
export const SHOWROOM_DEFAULT_BRAND_NAME = 'Gốm Hoa Sen';
export const SHOWROOM_DEFAULT_PRODUCT_TAGLINE = 'Sản phẩm cao cấp';
export const SHOWROOM_DEFAULT_STORY_TITLE = 'Câu chuyện tác phẩm';
export const SHOWROOM_PRODUCTS_HREF = '/san-pham';

export function readShowroomText(value: unknown): string | undefined {
  return readTrimmedString(value);
}

export function readFirstShowroomText(...values: unknown[]): string | undefined {
  return readFirstTrimmedString(...values);
}

export function readFirstShowroomFormText(...values: unknown[]): string {
  return readFirstTextInputValue(...values);
}

export function requireFirstShowroomText(fieldName: string, ...values: unknown[]): string {
  return requireFirstTrimmedString(
    values,
    () => new Error(`Missing required showroom text: ${fieldName}`),
  );
}

export function joinShowroomTexts(values: unknown[], separator: string): string | undefined {
  return readJoinedTextParts(values, separator);
}

export function readShowroomDisplayText(value: unknown, fallback: string): string {
  return readTrimmedString(value) ?? fallback;
}

export function readShowroomFormText(value: unknown): string {
  return readTextInputValue(value);
}

export function hasShowroomText(value: unknown): boolean {
  return readShowroomText(value) !== undefined;
}

export function readShowroomPhoneHref(value: unknown): string | undefined {
  const phone = readShowroomText(value);
  return phone === undefined ? undefined : `tel:${phone.replace(/\s/g, '')}`;
}

export function readShowroomCameraOrbit(...values: unknown[]): string {
  return readFirstShowroomText(...values) ?? SHOWROOM_DEFAULT_CAMERA_ORBIT;
}

export function readShowroomCameraTarget(...values: unknown[]): string {
  return readFirstShowroomText(...values) ?? SHOWROOM_DEFAULT_CAMERA_TARGET;
}

export function readShowroomHotspotPosition(value: unknown): string {
  return readShowroomDisplayText(value, SHOWROOM_DEFAULT_HOTSPOT_POSITION);
}

export function readShowroomHotspotNormal(value: unknown): string {
  return readShowroomDisplayText(value, SHOWROOM_DEFAULT_HOTSPOT_NORMAL);
}

type ShowroomHotspotPanelInput = {
  title?: unknown;
  content?: unknown;
  image?: unknown;
  cta?: unknown;
};

type ShowroomHotspotPanelFallbackInput = {
  label?: unknown;
  description?: unknown;
  image?: unknown;
};

export function readShowroomHotspotPanel(
  panel: ShowroomHotspotPanelInput | undefined,
  fallback: ShowroomHotspotPanelFallbackInput,
): { title: string; content: string; image?: string; cta?: string } {
  return {
    title: readFirstShowroomFormText(panel?.title, fallback.label),
    content: readFirstShowroomFormText(panel?.content, fallback.description),
    image: readFirstShowroomText(panel?.image, fallback.image),
    cta: readShowroomText(panel?.cta),
  };
}

export function readShowroomHotspots<T>(section: { hotspots?: T[] } | undefined): T[] {
  return readArrayInput<T>(section?.hotspots);
}

function hasShowroomSpecValue(value: unknown): boolean {
  return value !== null && value !== undefined && value !== '';
}

export function readShowroomSpecs(rawSpecs: object | null | undefined): Record<string, string> {
  const result: Record<string, string> = {};
  if (rawSpecs === null || rawSpecs === undefined) return result;

  for (const [key, value] of Object.entries(rawSpecs)) {
    if (!hasShowroomSpecValue(value)) continue;
    if (key === 'temperature') result['Nhiệt độ nung'] = `${value}°C`;
    else if (key === 'firingTime') result['Thời gian nung'] = `${value} giờ`;
    else if (key === 'technique') result['Kỹ thuật'] = String(value);
    else result[key] = String(value);
  }

  return result;
}

export function readShowroomGeneratedId(value: unknown, prefix: string, index: number): string {
  return readShowroomText(value) ?? `${prefix}-${index + 1}`;
}

export function readShowroomSectionIcon(value: unknown): string {
  return readShowroomDisplayText(value, SHOWROOM_DEFAULT_SECTION_ICON);
}

export function readShowroomVariantSwatch(...values: unknown[]): string {
  return readFirstShowroomText(...values) ?? SHOWROOM_DEFAULT_VARIANT_SWATCH;
}

export function readShowroomBrandName(value: unknown): string {
  return readShowroomDisplayText(value, SHOWROOM_DEFAULT_BRAND_NAME);
}

export function readShowroomPriceRangeBounds(range: { min?: unknown; max?: unknown }): { min: number; max: number } {
  return {
    min: typeof range.min === 'number' && Number.isFinite(range.min) ? range.min : 0,
    max: typeof range.max === 'number' && Number.isFinite(range.max) ? range.max : Number.POSITIVE_INFINITY,
  };
}

export function readShowroomOptionLabel(value: string, options: { id: unknown; name?: unknown }[]): string {
  const option = options.find((item) => readShowroomText(item.id) === value);
  return readFirstShowroomText(option?.name, value) as string;
}

export function readShowroomMappedLabel(value: string, labels: Record<string, string | undefined>): string {
  return readFirstShowroomText(labels[value], value) as string;
}

export type ShowroomFilterLabelGroup = 'collection' | 'glaze' | 'type' | 'price' | 'status';

export type ShowroomFilterLabelSources = {
  collections: { id: unknown; name?: unknown }[];
  glazes: { id: unknown; name?: unknown }[];
  types: { id: unknown; name?: unknown }[];
  priceRanges: { id: unknown; name?: unknown }[];
  statusLabels: Record<string, string | undefined>;
};

function failUnsupportedShowroomFilterGroup(group: never): never {
  throw new Error(`Unsupported showroom filter group: ${String(group)}`);
}

export function readShowroomFilterLabel(
  group: ShowroomFilterLabelGroup,
  value: string,
  sources: ShowroomFilterLabelSources,
): string {
  switch (group) {
    case 'collection':
      return readShowroomOptionLabel(value, sources.collections);
    case 'glaze':
      return readShowroomOptionLabel(value, sources.glazes);
    case 'type':
      return readShowroomOptionLabel(value, sources.types);
    case 'price':
      return readShowroomOptionLabel(value, sources.priceRanges);
    case 'status':
      return readShowroomMappedLabel(value, sources.statusLabels);
    default:
      return failUnsupportedShowroomFilterGroup(group);
  }
}

export function readShowroomProductTagline(...values: unknown[]): string {
  return readFirstShowroomText(...values) ?? SHOWROOM_DEFAULT_PRODUCT_TAGLINE;
}

export function readShowroomStoryTitle(value: unknown): string {
  return readShowroomDisplayText(value, SHOWROOM_DEFAULT_STORY_TITLE);
}

export function readFirstShowroom360Product<T extends { has360: boolean }>(products: readonly T[]): T | undefined {
  return products.find((product) => product.has360);
}

export function readShowroomProductDetailHref(product: { id: string } | undefined): string {
  return product === undefined ? SHOWROOM_PRODUCTS_HREF : `${SHOWROOM_PRODUCTS_HREF}/${product.id}`;
}
