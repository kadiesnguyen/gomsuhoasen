import type { ShowroomV2ContentContract } from '@gomhoasen/contracts';

const SITE_ORIGIN = 'https://gomhoasen.vn';
const STATIC_PATHS = [
  '/',
  '/gioi-thieu',
  '/bo-suu-tap',
  '/san-pham',
  '/danh-muc-san-pham',
  '/tin-tuc',
  '/nghe-nhan',
  '/lien-he',
];

type SitemapRecord = {
  path: string;
  lastModified?: Date | string;
};

type SitemapEntity = {
  slug?: unknown;
  updatedAt?: unknown;
};

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function readSlug(value: SitemapEntity): string | null {
  return typeof value.slug === 'string' && value.slug.trim()
    ? value.slug.trim()
    : null;
}

function readUpdatedAt(value: SitemapEntity): Date | string | undefined {
  return value.updatedAt instanceof Date || typeof value.updatedAt === 'string'
    ? value.updatedAt
    : undefined;
}

function formatLastModified(value: Date | string | undefined): string | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function newsRecords(content: ShowroomV2ContentContract): SitemapRecord[] {
  return (content.newsLanding.newsCards ?? []).flatMap((article) =>
    article.slug?.trim()
      ? [{ path: `/tin-tuc/${encodeURIComponent(article.slug.trim())}` }]
      : [],
  );
}

function entityRecords(
  entities: readonly SitemapEntity[],
  routePrefix: string,
): SitemapRecord[] {
  return entities.flatMap((entity) => {
    const slug = readSlug(entity);
    return slug
      ? [{
          path: `${routePrefix}/${encodeURIComponent(slug)}`,
          lastModified: readUpdatedAt(entity),
        }]
      : [];
  });
}

export function createShowroomV2SitemapXml(
  content: ShowroomV2ContentContract,
  products: readonly SitemapEntity[],
  artisans: readonly SitemapEntity[],
): string {
  const records: SitemapRecord[] = [
    ...STATIC_PATHS.map((path) => ({ path })),
    ...newsRecords(content),
    ...entityRecords(products, '/san-pham'),
    ...entityRecords(artisans, '/nghe-nhan'),
  ];
  const uniqueRecords = Array.from(
    new Map(records.map((record) => [record.path, record])).values(),
  );
  const urls = uniqueRecords.map((record) => {
    const lastModified = formatLastModified(record.lastModified);
    const location = escapeXml(`${SITE_ORIGIN}${record.path}`);
    return lastModified
      ? `  <url><loc>${location}</loc><lastmod>${lastModified}</lastmod></url>`
      : `  <url><loc>${location}</loc></url>`;
  });

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...urls,
    '</urlset>',
    '',
  ].join('\n');
}
