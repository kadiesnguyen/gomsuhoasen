import {
  isNotUndefined,
  readArrayInput as readCommonArrayInput,
  readFirstTrimmedString,
  readTextInputValue,
  readTrimmedString,
} from '@vt/common-utils';
import {
  formatVnd,
  PRODUCT_TAGS,
  slugifyVi,
  toAssetUrl,
  type ProductContract,
  type SiteCollectionContract,
  type SiteFilterOptionContract,
  type SiteFiltersContract,
  type SiteJournalItemContract,
  type SiteOccasionContract,
} from '@gomhoasen/contracts';

export type PublicProductApi = Omit<ProductContract, 'id'> & {
  id?: string;
  _id?: string;
  tags?: string[];
};

export type ShowroomProduct = {
  id: string;
  name: string;
  collection: string;
  collectionId: string;
  glaze: string;
  glazeId: string;
  type: string;
  typeId: string;
  size: string;
  price: number;
  priceLabel: string;
  image: string;
  modelUrl?: string;
  has360: boolean;
  isNew: boolean;
  isLimited: boolean;
  isBestSeller: boolean;
  swatches: string[];
  desc: string;
};

export type ShowroomCollection = {
  id: string;
  name: string;
  desc: string;
  image: string;
  count: number;
};

export type NormalizedShowroomFilters = {
  types: SiteFilterOptionContract[];
  glazes: SiteFilterOptionContract[];
  priceRanges: NonNullable<SiteFiltersContract['priceRanges']>;
};

type ShowroomPriceRangeContract = NormalizedShowroomFilters['priceRanges'][number];

export const DEFAULT_PRODUCT_COLLECTION = 'Khác';
export const DEFAULT_PRODUCT_TYPE = 'Sản phẩm';

export { isNotUndefined as isDefinedString };

export function readStringInput(value: unknown): string {
  return readTextInputValue(value);
}

export function readArrayInput<T>(value: unknown): T[] {
  return readCommonArrayInput<T>(value);
}

export function readStringArray(value: unknown): string[] {
  return readArrayInput<unknown>(value).map(readTrimmedString).filter(isNotUndefined);
}

export function readFirstString(...values: unknown[]): string | undefined {
  return readFirstTrimmedString(...values);
}

export function readDefaultString(value: unknown, fallback: string): string {
  return readTrimmedString(value) ?? fallback;
}

export function readFirstSectionArray<T>(
  sectionValue: unknown,
  firstSectionValue: unknown,
  index: number,
): T[] {
  if (Array.isArray(sectionValue)) return sectionValue as T[];
  return index === 0 ? readArrayInput<T>(firstSectionValue) : [];
}

export function readSiteCollections(value: unknown): SiteCollectionContract[] {
  return readArrayInput<SiteCollectionContract>(value);
}

function readCatalogPrice(value: unknown): number {
  return typeof value === 'number' ? value : 0;
}

function readCatalogPriceLabel(value: unknown, price: number): string {
  return readTrimmedString(value) ?? formatVnd(price);
}

function readCatalogImagePath(productId: string, ...values: unknown[]): string {
  const path = readFirstString(...values);
  if (!path) {
    throw new Error(`[Showroom Normalization] Missing product image for product ${productId}. Fallback images are not allowed for exhibition claims.`);
  }
  return path;
}

function readCatalogAssetUrl(productId: string, value: unknown, apiOrigin: string): string {
  return toAssetUrl(readCatalogImagePath(productId, value), apiOrigin) ?? '';
}

function readCatalogCollectionId(byCollectionName: Map<string, string>, collectionName: string): string {
  return byCollectionName.get(collectionName.toLowerCase()) ?? slugifyVi(collectionName);
}

function hasCatalog360(...values: unknown[]): boolean {
  return readFirstString(...values) !== undefined;
}

function readCount(counts: Map<string, number>, key: string): number {
  return counts.get(key) ?? 0;
}

function incrementCount(counts: Map<string, number>, key: string): void {
  counts.set(key, readCount(counts, key) + 1);
}

function incrementFilterOptionCount(option: SiteFilterOptionContract): void {
  option.count = (option.count ?? 0) + 1;
}

function readConfiguredCollection(value: SiteCollectionContract): { id: string; name: string; desc: string; image: string } | null {
  const id = readTrimmedString(value.id);
  const name = readTrimmedString(value.name);
  if (id === undefined || name === undefined) return null;
  return {
    id,
    name,
    desc: readStringInput(value.desc),
    image: readCatalogImagePath(id, value.image),
  };
}

function deriveFlags(tags: string[]): { isNew: boolean; isLimited: boolean; isBestSeller: boolean } {
  const normalized = new Set(tags.map((tag) => slugifyVi(tag)));
  return {
    isNew: normalized.has(PRODUCT_TAGS.NEW) || normalized.has('moi'),
    isLimited: normalized.has(PRODUCT_TAGS.LIMITED) || normalized.has('gioi-han') || normalized.has('gioi-han-500'),
    isBestSeller: normalized.has(slugifyVi(PRODUCT_TAGS.BEST_SELLER)) || normalized.has('best-seller') || normalized.has('ban-chay'),
  };
}

export function mapShowroomProducts(
  rawProducts: PublicProductApi[],
  collections: SiteCollectionContract[],
  apiOrigin: string,
): ShowroomProduct[] {
  const byCollectionName = new Map(
    collections
      .map(readConfiguredCollection)
      .filter((collection): collection is NonNullable<typeof collection> => collection !== null)
      .map((collection) => [collection.name.toLowerCase(), collection.id]),
  );

  return rawProducts
    .map((product): ShowroomProduct | null => {
      const id = readFirstString(product.slug, product.id, product._id);
      if (id === undefined) return null;

      const collectionName = readDefaultString(product.collection, DEFAULT_PRODUCT_COLLECTION);
      const collectionId = readCatalogCollectionId(byCollectionName, collectionName);
      const glaze = readDefaultString(product.glaze, DEFAULT_PRODUCT_COLLECTION);
      const type = readDefaultString(product.type, DEFAULT_PRODUCT_TYPE);
      const price = readCatalogPrice(product.referencePrice);
      const flags = deriveFlags(readStringArray(product.tags));
      const imagePath = readCatalogImagePath(id, ...readStringArray(product.images), product.poster);
      const swatches = Array.isArray(product.variants)
        ? product.variants.map((variant) => readTrimmedString(variant.swatch)).filter(isNotUndefined)
        : [];

      return {
        id,
        name: readDefaultString(product.name, id),
        collection: collectionName,
        collectionId,
        glaze,
        glazeId: slugifyVi(glaze),
        type,
        typeId: slugifyVi(type),
        size: readStringInput(product.size),
        price,
        priceLabel: readCatalogPriceLabel(product.priceLabel, price),
        image: readCatalogAssetUrl(id, imagePath, apiOrigin),
        modelUrl: toAssetUrl(readTrimmedString(product.modelUrl), apiOrigin),
        has360: hasCatalog360(product.video360Url, product.modelUrl),
        isNew: flags.isNew,
        isLimited: flags.isLimited,
        isBestSeller: flags.isBestSeller,
        swatches,
        desc: readStringInput(product.description),
      };
    })
    .filter((product): product is ShowroomProduct => product !== null);
}

export function deriveShowroomCollections(
  configuredCollections: SiteCollectionContract[],
  products: ShowroomProduct[],
): ShowroomCollection[] {
  if (configuredCollections.length === 0) {
    const grouped = new Map<string, ShowroomCollection>();
    for (const product of products) {
      const existing = grouped.get(product.collectionId);
      if (existing) {
        existing.count += 1;
      } else {
        grouped.set(product.collectionId, {
          id: product.collectionId,
          name: product.collection,
          desc: '',
          image: product.image,
          count: 1,
        });
      }
    }
    return Array.from(grouped.values());
  }

  const counts = new Map<string, number>();
  for (const product of products) {
    incrementCount(counts, product.collectionId);
  }

  return configuredCollections
    .map(readConfiguredCollection)
    .filter((collection): collection is NonNullable<typeof collection> => collection !== null)
    .map((collection) => ({
      ...collection,
      count: readCount(counts, collection.id),
    }));
}

export function deriveShowroomFilters(products: ShowroomProduct[]): SiteFiltersContract {
  const typeMap = new Map<string, SiteFilterOptionContract>();
  const glazeMap = new Map<string, SiteFilterOptionContract>();

  for (const product of products) {
    const type = typeMap.get(product.typeId);
    if (type) incrementFilterOptionCount(type);
    else typeMap.set(product.typeId, { id: product.typeId, name: product.type, count: 1 });

    const glaze = glazeMap.get(product.glazeId);
    if (glaze) incrementFilterOptionCount(glaze);
    else glazeMap.set(product.glazeId, { id: product.glazeId, name: product.glaze, count: 1 });
  }

  return {
    types: Array.from(typeMap.values()),
    glazes: Array.from(glazeMap.values()),
    priceRanges: [
      { id: 'under-1m', name: 'Dưới 1 triệu', min: 0, max: 1000000 },
      { id: '1m-3m', name: '1-3 triệu', min: 1000000, max: 3000000 },
      { id: '3m-10m', name: '3-10 triệu', min: 3000000, max: 10000000 },
      { id: 'over-10m', name: 'Trên 10 triệu', min: 10000000, max: 9999999999 },
    ],
  };
}

export function readShowroomFilters(value: SiteFiltersContract): NormalizedShowroomFilters {
  return {
    types: readArrayInput<SiteFilterOptionContract>(value.types),
    glazes: readArrayInput<SiteFilterOptionContract>(value.glazes),
    priceRanges: readArrayInput<ShowroomPriceRangeContract>(value.priceRanges),
  };
}

export function readShowroomOccasions(value: SiteOccasionContract[] | undefined) {
  if (!Array.isArray(value)) return [];
  return value
    .map((occasion) => {
      const id = readTrimmedString(occasion.id);
      const name = readTrimmedString(occasion.name);
      const icon = readTrimmedString(occasion.icon);
      const desc = readTrimmedString(occasion.desc);
      if (id === undefined || name === undefined || icon === undefined || desc === undefined) return null;
      return { id, name, icon, desc };
    })
    .filter((occasion): occasion is { id: string; name: string; icon: string; desc: string } => occasion !== null);
}

export function readShowroomJournal(value: SiteJournalItemContract[] | undefined) {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => {
      const id = readTrimmedString(entry.id);
      const title = readTrimmedString(entry.title);
      const excerpt = readTrimmedString(entry.excerpt);
      const image = readTrimmedString(entry.image);
      const category = readTrimmedString(entry.category);
      const date = readTrimmedString(entry.date);
      if (id === undefined || title === undefined || excerpt === undefined || image === undefined) return null;
      return { id, title, excerpt, image, category, date };
    })
    .filter(
      (
        entry,
      ): entry is {
        id: string;
        title: string;
        excerpt: string;
        image: string;
        category: string | undefined;
        date: string | undefined;
      } => entry !== null,
    );
}
