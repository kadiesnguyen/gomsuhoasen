import { toCanvas as qrToCanvas, toDataURL as qrToDataUrl } from 'qrcode';
import bundledLotusQrLogo from '../assets/lotus-qr.png';

const PUBLIC_LOTUS_QR_LOGO = '/assets/brand/lotus-qr.png';
const PUBLIC_LOTUS_MARK = '/assets/brand/lotus-mark.png';

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

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load QR logo'));
    img.src = src;
  });
}

function fillRoundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  radius: number,
): void {
  const r = Math.min(radius, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
  ctx.fill();
}

async function compositeQrWithLogo(
  qrDataUrl: string,
  logoSrc: string,
  width: number,
): Promise<string> {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = width;
  const ctx = canvas.getContext('2d');
  if (!ctx) return qrDataUrl;

  const [qrImage, logo] = await Promise.all([loadImage(qrDataUrl), loadImage(logoSrc)]);
  ctx.drawImage(qrImage, 0, 0, width, width);

  // ~22% logo + white pad keeps scanners happy at errorCorrectionLevel H
  const logoSize = Math.round(width * 0.22);
  const pad = Math.max(4, Math.round(logoSize * 0.14));
  const box = logoSize + pad * 2;
  const x = (width - box) / 2;
  const y = (width - box) / 2;

  ctx.fillStyle = '#ffffff';
  fillRoundRect(ctx, x, y, box, box, Math.round(pad * 1.2));
  ctx.drawImage(logo, x + pad, y + pad, logoSize, logoSize);

  return canvas.toDataURL('image/png');
}

export async function generateProductQrDataUrl(
  slug: string,
  options?: {
    siteOrigin?: string;
    width?: number;
    /** Override logo URL; pass `false` to skip lotus mark. */
    logoUrl?: string | false;
  },
): Promise<string> {
  const url = productPublicUrl(slug, options?.siteOrigin);
  if (!url) return '';
  const width = options?.width ?? 280;
  const qrOptions = {
    width,
    margin: 2,
    errorCorrectionLevel: 'H' as const,
    color: { dark: '#1a1510', light: '#ffffff' },
  };

  // Browser: canvas + lotus center. Node/tests: plain data URL.
  if (typeof document !== 'undefined' && options?.logoUrl !== false) {
    try {
      const canvas = document.createElement('canvas');
      await qrToCanvas(canvas, url, qrOptions);
      const base = canvas.toDataURL('image/png');
      const logoCandidates =
        typeof options?.logoUrl === 'string' && options.logoUrl
          ? [options.logoUrl]
          : [bundledLotusQrLogo, PUBLIC_LOTUS_QR_LOGO, PUBLIC_LOTUS_MARK];
      for (const logoSrc of logoCandidates) {
        try {
          return await compositeQrWithLogo(base, logoSrc, width);
        } catch {
          /* try next logo source */
        }
      }
      return base;
    } catch {
      /* fall through to plain QR */
    }
  }

  return qrToDataUrl(url, qrOptions);
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
