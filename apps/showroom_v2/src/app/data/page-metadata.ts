const SITE_ORIGIN = 'https://gomhoasen.vn';

interface PageMetadata {
  title: string;
  description: string;
  path: string;
  image?: string;
}

function upsertMeta(selector: string, attribute: 'name' | 'property', key: string) {
  let element = document.querySelector<HTMLMetaElement>(selector);
  if (!element) {
    element = document.createElement('meta');
    element.setAttribute(attribute, key);
    document.head.appendChild(element);
  }
  return element;
}

function absoluteUrl(path: string) {
  if (/^https?:\/\//i.test(path)) return path;
  return new URL(path.startsWith('/') ? path : `/${path}`, SITE_ORIGIN).toString();
}

export function updatePageMetadata({ title, description, path, image }: PageMetadata) {
  const canonicalUrl = absoluteUrl(path);
  document.title = title;

  upsertMeta('meta[name="description"]', 'name', 'description').content = description;
  upsertMeta('meta[property="og:title"]', 'property', 'og:title').content = title;
  upsertMeta('meta[property="og:description"]', 'property', 'og:description').content = description;
  upsertMeta('meta[property="og:url"]', 'property', 'og:url').content = canonicalUrl;
  if (image) {
    upsertMeta('meta[property="og:image"]', 'property', 'og:image').content = absoluteUrl(image);
  }

  let canonical = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!canonical) {
    canonical = document.createElement('link');
    canonical.rel = 'canonical';
    document.head.appendChild(canonical);
  }
  canonical.href = canonicalUrl;
}
