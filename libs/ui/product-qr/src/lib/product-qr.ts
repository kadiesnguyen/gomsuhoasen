import { toDataURL as qrToDataUrl } from 'qrcode';

export function normalizeProductSlug(slug: string | undefined | null): string {
  return String(slug ?? '')
    .trim()
    .replace(/^\/+|\/+$/g, '');
}

/** Showroom product path — always absolute path under site origin. */
export function productPublicPath(slug: string): string {
  const normalized = normalizeProductSlug(slug);
  if (!normalized) return '';
  return `/san-pham/${encodeURIComponent(normalized)}`;
}

/**
 * Resolve public site origin for QR links.
 * Portal runs on a different port locally — map 4311/4312 → showroom 4313 when env missing.
 */
export function resolveProductSiteOrigin(envOrigin?: string): string {
  const fromEnv = String(envOrigin ?? '')
    .trim()
    .replace(/\/+$/, '');
  if (fromEnv) return fromEnv;
  if (typeof window === 'undefined') return '';
  const { protocol, hostname, port } = window.location;
  if (port === '4311' || port === '4312') {
    return `${protocol}//${hostname}:4313`;
  }
  return window.location.origin.replace(/\/+$/, '');
}

export function productPublicUrl(slug: string, siteOrigin?: string): string {
  const path = productPublicPath(slug);
  if (!path) return '';
  const origin = resolveProductSiteOrigin(siteOrigin);
  if (!origin) return path;
  return `${origin}${path}`;
}

export async function generateProductQrDataUrl(
  slug: string,
  options?: { siteOrigin?: string; width?: number },
): Promise<string> {
  const url = productPublicUrl(slug, options?.siteOrigin);
  if (!url) return '';
  return qrToDataUrl(url, {
    width: options?.width ?? 280,
    margin: 2,
    errorCorrectionLevel: 'M',
    color: { dark: '#1a1510', light: '#ffffff' },
  });
}

export function downloadDataUrl(dataUrl: string, filename: string): void {
  const anchor = document.createElement('a');
  anchor.href = dataUrl;
  anchor.download = filename;
  anchor.rel = 'noopener';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
}

export async function copyTextToClipboard(text: string): Promise<boolean> {
  if (!text) return false;
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* fall through */
  }
  try {
    const input = document.createElement('textarea');
    input.value = text;
    input.setAttribute('readonly', '');
    input.style.position = 'fixed';
    input.style.left = '-9999px';
    document.body.appendChild(input);
    input.select();
    const ok = document.execCommand('copy');
    input.remove();
    return ok;
  } catch {
    return false;
  }
}

export function productQrFilename(slug: string): string {
  const normalized = normalizeProductSlug(slug) || 'san-pham';
  return `qr-${normalized}.png`;
}
