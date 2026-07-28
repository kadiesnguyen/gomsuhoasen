export const CATALOG_PRODUCT_EXTERNAL_ID_FIELDS = [
  'externalSourceId',
  'sProductId',
  'misaProductId',
  'id',
] as const;

export const CATALOG_VARIANT_EXTERNAL_ID_FIELDS = [
  'externalVariantId',
  'sVariationId',
  'misaVariationId',
  'variantId',
  'id',
] as const;

export interface CatalogVariantIngressProjection {
  externalVariantId?: string;
  sku?: string;
  name?: string;
  optionValues?: Record<string, string>;
  price?: number;
  stockQuantity?: number;
  weight?: number;
  isActive?: boolean;
}

export interface CatalogProductIngressProjection {
  externalSource?: string;
  externalSourceId?: string;
  channelAccountId?: string;
  sourceVersion?: string;
  sourceUpdatedAt?: string;
  sourceCursor?: string;
  name?: string;
  sku?: string;
  description?: string;
  price?: number;
  currency?: string;
  stockQuantity?: number;
  status?: string;
  images: string[];
  tags: string[];
  searchAliases: string[];
  categoryNames: string[];
}

export interface CatalogProductIngressDefaults {
  externalSource?: string;
  currency?: string;
  status?: string;
}

type CatalogRecord = Record<string, unknown>;

function isRecord(value: unknown): value is CatalogRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function firstDefined(record: CatalogRecord, fields: readonly string[]): unknown {
  for (const field of fields) {
    const value = record[field];
    if (value !== undefined && value !== null && value !== '') return value;
  }
  return undefined;
}

export function readCatalogOptionalText(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const normalized = value.trim();
  return normalized || undefined;
}

export function readCatalogOptionalNumber(value: unknown): number | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value === 'number') return Number.isFinite(value) ? value : undefined;
  const normalized = readCatalogOptionalText(value);
  if (!normalized || !/^-?\d+(?:\.\d+)?$/u.test(normalized)) return undefined;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function readCatalogExpectedVersion(value: unknown): number | undefined {
  if (typeof value === 'number') {
    return Number.isSafeInteger(value) && value > 0 ? value : undefined;
  }
  const normalized = readCatalogOptionalText(value);
  if (!normalized || !/^\d+$/u.test(normalized)) return undefined;
  const parsed = Number(normalized);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : undefined;
}

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const values: string[] = [];
  const seen = new Set<string>();
  for (const entry of value) {
    const normalized = readCatalogOptionalText(entry);
    if (!normalized) continue;
    const identity = normalized.toLowerCase();
    if (seen.has(identity)) continue;
    seen.add(identity);
    values.push(normalized);
  }
  return values;
}

function normalizeTextRecord(value: unknown): Record<string, string> | undefined {
  if (!isRecord(value)) return undefined;
  const entries = Object.entries(value)
    .map(([key, entry]) => [key.trim(), readCatalogOptionalText(entry)] as const)
    .filter((entry): entry is readonly [string, string] => Boolean(entry[0] && entry[1]));
  return entries.length > 0 ? Object.fromEntries(entries) : undefined;
}

export function readCatalogExternalProductId(input: unknown): string | undefined {
  if (!isRecord(input)) return undefined;
  return readCatalogOptionalText(firstDefined(input, CATALOG_PRODUCT_EXTERNAL_ID_FIELDS));
}

export function readCatalogExternalVariantId(input: unknown): string | undefined {
  if (!isRecord(input)) return undefined;
  return readCatalogOptionalText(firstDefined(input, CATALOG_VARIANT_EXTERNAL_ID_FIELDS));
}

export function projectCatalogVariantIngress(
  input: unknown,
): CatalogVariantIngressProjection {
  if (!isRecord(input)) return {};
  return {
    externalVariantId: readCatalogExternalVariantId(input),
    sku: readCatalogOptionalText(input['sku']),
    name: readCatalogOptionalText(input['name']),
    optionValues: normalizeTextRecord(input['optionValues'] ?? input['options']),
    price: readCatalogOptionalNumber(input['price'] ?? input['salePrice']),
    stockQuantity: readCatalogOptionalNumber(input['stockQuantity'] ?? input['stock']),
    weight: readCatalogOptionalNumber(input['weight']),
    isActive: typeof input['isActive'] === 'boolean' ? input['isActive'] : undefined,
  };
}

export function projectCatalogProductIngress(
  input: unknown,
  defaults: CatalogProductIngressDefaults = {},
): CatalogProductIngressProjection {
  const record = isRecord(input) ? input : {};
  const externalSource = readCatalogOptionalText(record['externalSource'])
    ?? readCatalogOptionalText(defaults.externalSource);
  const currency = readCatalogOptionalText(record['currency'])
    ?? readCatalogOptionalText(defaults.currency);
  const status = readCatalogOptionalText(record['status'])
    ?? readCatalogOptionalText(defaults.status);
  return {
    externalSource: externalSource?.toUpperCase(),
    externalSourceId: readCatalogExternalProductId(record),
    channelAccountId: readCatalogOptionalText(record['channelAccountId']),
    sourceVersion: readCatalogOptionalText(record['sourceVersion']),
    sourceUpdatedAt: readCatalogOptionalText(firstDefined(record, [
      'sourceUpdatedAt',
      'externalUpdatedAt',
      'modifiedOn',
      'updated_on',
    ])),
    sourceCursor: readCatalogOptionalText(record['sourceCursor'] ?? record['cursor']),
    name: readCatalogOptionalText(record['name']),
    sku: readCatalogOptionalText(record['sku'] ?? record['code']),
    description: readCatalogOptionalText(record['description']),
    price: readCatalogOptionalNumber(record['price'] ?? record['salePrice']),
    currency: currency?.toUpperCase(),
    stockQuantity: readCatalogOptionalNumber(record['stockQuantity'] ?? record['stock']),
    status: status?.toUpperCase(),
    images: normalizeStringArray(record['images'] ?? record['attachments']),
    tags: normalizeStringArray(record['tags']),
    searchAliases: normalizeStringArray(record['searchAliases'] ?? record['aliases']),
    categoryNames: normalizeStringArray(record['categoryNames'] ?? record['categories']),
  };
}
