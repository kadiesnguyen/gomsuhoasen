export interface StorefrontAdminLocationInput {
  code?: string | null;
  name?: string | null;
}

export interface StorefrontLocationInput {
  path: string;
  name?: string | null;
  publicAddress?: string | null;
  zone?: string | null;
  thumbnailUri?: string | null;
  hotline?: string | null;
  openingTime?: string | null;
  closingTime?: string | null;
  province?: StorefrontAdminLocationInput | null;
  district?: StorefrontAdminLocationInput | null;
  ward?: StorefrontAdminLocationInput | null;
}

export interface StorefrontAdminLocationView {
  code?: string;
  name?: string;
  title?: string;
}

export interface StorefrontLocationView {
  name: string;
  address: string;
  zone?: string;
  thumbnailUri: string | null;
  hotline?: string;
  openingTime?: string;
  closingTime?: string;
  province?: StorefrontAdminLocationView;
  district?: StorefrontAdminLocationView;
  ward?: StorefrontAdminLocationView;
}

function normalizeText(value?: string | null): string | undefined {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
}

function normalizeTime(value?: string | null): string | undefined {
  const normalized = normalizeText(value);
  if (!normalized) return undefined;
  if (/^\d{2}:\d{2}$/.test(normalized)) return normalized;
  if (/^\d{1,2}:\d{2}$/.test(normalized)) return normalized.padStart(5, '0');
  return normalized;
}

function toAdminLocationView(
  value?: StorefrontAdminLocationInput | null,
): StorefrontAdminLocationView | undefined {
  const code = normalizeText(value?.code);
  const name = normalizeText(value?.name);
  if (!code && !name) return undefined;
  return {
    ...(code ? { code } : {}),
    ...(name ? { name, title: name } : {}),
  };
}

export function buildStorefrontLocationView(input: StorefrontLocationInput): StorefrontLocationView {
  const name = normalizeText(input.name) ?? input.path;
  const address = normalizeText(input.publicAddress) ?? input.path;
  const zone = normalizeText(input.zone);
  const thumbnailUri = normalizeText(input.thumbnailUri) ?? null;
  const hotline = normalizeText(input.hotline);
  const openingTime = normalizeTime(input.openingTime);
  const closingTime = normalizeTime(input.closingTime);
  const province = toAdminLocationView(input.province);
  const district = toAdminLocationView(input.district);
  const ward = toAdminLocationView(input.ward);

  return {
    name,
    address,
    ...(zone ? { zone } : {}),
    thumbnailUri,
    ...(hotline ? { hotline } : {}),
    ...(openingTime ? { openingTime } : {}),
    ...(closingTime ? { closingTime } : {}),
    ...(province ? { province } : {}),
    ...(district ? { district } : {}),
    ...(ward ? { ward } : {}),
  };
}
