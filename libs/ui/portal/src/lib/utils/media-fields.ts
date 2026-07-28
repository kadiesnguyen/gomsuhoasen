import { isDefinedString } from './form-normalization';

export type MediaPreviewKind = 'image' | 'video' | 'document' | 'model' | 'html' | 'file';

function readComparablePath(value: string): string {
  const trimmed = value.trim();
  if (trimmed.length === 0) return '';

  try {
    if (/^https?:\/\//i.test(trimmed)) {
      return new URL(trimmed).pathname;
    }
  } catch {
    // Fall back to string normalization below.
  }

  return trimmed;
}

export function normalizeMediaPath(path: string): string {
  return readComparablePath(path)
    .replace(/\\/g, '/')
    .replace(/\/{2,}/g, '/')
    .replace(/^\.\/+/, '')
    .replace(/^\/+/, '')
    .toLowerCase();
}

export function mediaPathsEqual(left: string, right: string): boolean {
  return normalizeMediaPath(left) === normalizeMediaPath(right);
}

function normalizeAcceptTokens(accept?: string): string[] {
  return (accept ?? '')
    .split(',')
    .map((token) => token.trim().toLowerCase())
    .filter(isDefinedString);
}

function readLowercaseName(path: string): string {
  return path.trim().toLowerCase();
}

function matchesAcceptTokens(name: string, mimeType: string, accept?: string): boolean {
  const tokens = normalizeAcceptTokens(accept);
  if (tokens.length === 0) return true;

  return tokens.some((token) => {
    if (token.startsWith('.')) return name.endsWith(token);
    if (token.endsWith('/*')) return mimeType.startsWith(token.slice(0, -1));
    return mimeType === token;
  });
}

export function fileMatchesAccept(file: Pick<File, 'name' | 'type'>, accept?: string): boolean {
  return matchesAcceptTokens(readLowercaseName(file.name), file.type.toLowerCase(), accept);
}

export function assetMatchesAccept(
  asset: { storagePath: string; mimeType: string },
  accept?: string,
): boolean {
  return matchesAcceptTokens(
    readLowercaseName(asset.storagePath),
    asset.mimeType.toLowerCase(),
    accept,
  );
}

export function fileNameFromPath(path: string): string {
  const normalized = readComparablePath(path).replace(/\\/g, '/');
  const raw = normalized.split('/').pop() ?? normalized;
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

export function readMediaPreviewKind(
  path: string,
  options?: { accept?: string; mimeType?: string },
): MediaPreviewKind {
  const name = readLowercaseName(path);
  const mimeType = (options?.mimeType ?? '').trim().toLowerCase();
  const accept = normalizeAcceptTokens(options?.accept);

  if (
    mimeType.startsWith('image/') ||
    /\.(png|jpe?g|webp|gif|avif|svg)$/i.test(name)
  ) {
    return 'image';
  }

  if (
    mimeType.includes('html') || /\.(html|htm)$/i.test(name)
  ) {
    return 'html';
  }

  if (
    mimeType.includes('gltf') ||
    /\.(glb|gltf|usdz|obj|fbx|stl)$/i.test(name)
  ) {
    return 'model';
  }

  if (
    mimeType.includes('pdf') ||
    /\.(pdf|doc|docx|xls|xlsx|csv|ppt|pptx)$/i.test(name)
  ) {
    return 'document';
  }

  if (
    mimeType.startsWith('video/') ||
    /\.(mp4|webm|mov|m4v|ogg)$/i.test(name)
  ) {
    return 'video';
  }

  if (accept.some((token) => token.startsWith('image/'))) {
    return 'image';
  }

  if (accept.some((token) => token.startsWith('video/'))) {
    return 'video';
  }

  return 'file';
}
