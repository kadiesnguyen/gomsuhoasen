'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { resolveApiOrigin, toAssetUrl } from '@gomhoasen/contracts';
import css from './listing-screen.module.css';

interface SiteProduct {
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
  has360: boolean;
  isNew: boolean;
  isLimited: boolean;
  isBestSeller: boolean;
  swatches: string[];
  desc: string;
}

interface FilterDef {
  id: string;
  name: string;
  count?: number;
  swatch?: string;
  min?: number;
  max?: number;
}

interface SiteFilters {
  types: FilterDef[];
  glazes: FilterDef[];
  priceRanges: FilterDef[];
}

interface SiteCollection {
  id: string;
  name: string;
  desc: string;
  image: string;
  count: number;
}

interface ListingSiteData {
  brand: { name: string; phone: string; zalo: string };
  navigation: Array<{ label: string; href: string }>;
  collections: SiteCollection[];
  products: SiteProduct[];
  filters: SiteFilters;
  copy: {
    eyebrow: string;
    title: string;
    subtitle: string;
    advisorTitle: string;
    advisorBody: string;
    labels: {
      featured360Label: string;
      exploreLabel: string;
      productCountLabel: string;
      collectionCountLabel: string;
      glazeCountLabel: string;
      filterTitle: string;
      resetLabel: string;
      collectionFilterLabel: string;
      typeFilterLabel: string;
      glazeFilterLabel: string;
      priceFilterLabel: string;
      statusFilterLabel: string;
      status360Label: string;
      statusNewLabel: string;
      statusLimitedLabel: string;
      statusBestSellerLabel: string;
      sortLabel: string;
      sortFeaturedLabel: string;
      sortNewestLabel: string;
      sortPriceAscLabel: string;
      sortPriceDescLabel: string;
      sort360Label: string;
      badgeNewLabel: string;
      badgeLimitedLabel: string;
      badgeBestSellerLabel: string;
      quickViewLabel: string;
      experience360Label: string;
      detailLabel: string;
      emptyTitle: string;
      emptyBody: string;
      emptyResetLabel: string;
      advisorCtaLabel: string;
      applyFilterLabel: string;
      consultationLabel: string;
      footerTemplate: string;
    };
  };
}

export interface ListingScreenProps {
  siteData: ListingSiteData;
}

const API_ORIGIN = resolveApiOrigin();

function resolveCollectionIds(
  rawValues: string[],
  collections: SiteCollection[],
): string[] {
  if (!rawValues.length) return [];
  const byId = new Map(collections.map((item) => [item.id, item.id]));
  const byName = new Map(
    collections.map((item) => [item.name.trim().toLowerCase(), item.id]),
  );
  const resolved = new Set<string>();
  for (const value of rawValues) {
    const trimmed = value.trim();
    if (!trimmed) continue;
    const byExact = byId.get(trimmed);
    if (byExact) {
      resolved.add(byExact);
      continue;
    }
    const byLowerName = byName.get(trimmed.toLowerCase());
    if (byLowerName) {
      resolved.add(byLowerName);
      continue;
    }
    resolved.add(trimmed);
  }
  return Array.from(resolved);
}

function readCollectionFilter(
  searchParams: URLSearchParams,
  collections: SiteCollection[],
): string[] {
  const raw = searchParams
    .getAll('collection')
    .flatMap((value) => value.split(','))
    .map((value) => value.trim())
    .filter(Boolean);
  return resolveCollectionIds(raw, collections);
}

function splitTitle(title: string): { lead: string; accent: string } {
  const parts = title.trim().split(/\s+/);
  if (parts.length <= 1) return { lead: title, accent: '' };
  return {
    lead: parts.slice(0, -1).join(' '),
    accent: parts[parts.length - 1] ?? '',
  };
}

export function ListingScreen({ siteData }: ListingScreenProps) {
  const { collections, products, copy } = siteData;
  const searchParams = useSearchParams();
  const galleryRef = useRef<HTMLDivElement | null>(null);
  const filtersRef = useRef<HTMLDivElement | null>(null);
  const [activeCollections, setActiveCollections] = useState<string[]>(() =>
    readCollectionFilter(searchParams, collections),
  );
  const [progress, setProgress] = useState(8);

  useEffect(() => {
    const sync = () => {
      const params = new URLSearchParams(window.location.search);
      setActiveCollections(readCollectionFilter(params, collections));
    };
    window.addEventListener('popstate', sync);
    return () => window.removeEventListener('popstate', sync);
  }, [collections]);

  useEffect(() => {
    try {
      sessionStorage.setItem(
        'ghs:lastCatalogUrl',
        `${window.location.pathname}${window.location.search}`,
      );
    } catch {
      /* ignore quota / private mode */
    }
  }, [activeCollections]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    params.delete('collection');
    activeCollections.forEach((value) => params.append('collection', value));
    const query = params.toString();
    const nextUrl = `${window.location.pathname}${query ? `?${query}` : ''}`;
    const current = `${window.location.pathname}${window.location.search}`;
    if (nextUrl !== current) {
      window.history.replaceState({}, '', nextUrl);
    }
  }, [activeCollections]);

  const filtered = useMemo(() => {
    if (!activeCollections.length) return products;
    const selectedNames = new Set(
      collections
        .filter((collection) => activeCollections.includes(collection.id))
        .map((collection) => collection.name.trim().toLowerCase()),
    );
    return products.filter(
      (product) =>
        activeCollections.includes(product.collectionId) ||
        selectedNames.has(product.collection.trim().toLowerCase()),
    );
  }, [activeCollections, collections, products]);

  const titleParts = useMemo(() => splitTitle(copy.title || 'Bộ sưu tập'), [copy.title]);

  // Stable order — never unshift active chip (that reflowed the whole strip).
  const filterChips = collections;

  const setCollectionFilter = useCallback((collectionId: string | null) => {
    if (!collectionId) {
      setActiveCollections([]);
      return;
    }
    setActiveCollections([collectionId]);
  }, []);

  const updateProgress = useCallback(() => {
    const el = galleryRef.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    if (max <= 0) {
      setProgress(100);
      return;
    }
    setProgress(Math.max(8, Math.min(100, (el.scrollLeft / max) * 100)));
  }, []);

  useEffect(() => {
    const gallery = galleryRef.current;
    if (gallery) {
      gallery.scrollLeft = 0;
    }
    updateProgress();

    // Wait for active class paint — otherwise we center the previous chip.
    const frame = window.requestAnimationFrame(() => {
      const filters = filtersRef.current;
      if (!filters) return;
      const activeId = activeCollections[0] ?? '';
      const activeBtn = filters.querySelector<HTMLElement>(
        `[data-collection-id="${activeId}"]`,
      );
      if (!activeBtn) return;
      // Manual center scroll — scrollIntoView can yank the whole page on mobile.
      const cRect = filters.getBoundingClientRect();
      const bRect = activeBtn.getBoundingClientRect();
      const delta = bRect.left + bRect.width / 2 - (cRect.left + cRect.width / 2);
      if (Math.abs(delta) > 8) {
        filters.scrollBy({ left: delta, behavior: 'smooth' });
      }
    });
    return () => window.cancelAnimationFrame(frame);
  }, [activeCollections, filtered.length, updateProgress]);

  const scrollGallery = useCallback((direction: 1 | -1) => {
    const el = galleryRef.current;
    if (!el) return;
    el.scrollBy({ left: direction * el.clientWidth * 0.72, behavior: 'smooth' });
  }, []);

  return (
    <div className={css.page}>
      <div className={css.content}>
        <aside className={css.intro}>
          <div>
            <div className={css.eyebrow}>{copy.eyebrow || 'Danh mục sản phẩm'}</div>
            <h1>
              {titleParts.lead}
              {titleParts.accent ? (
                <>
                  {' '}
                  <span>{titleParts.accent}</span>
                </>
              ) : null}
            </h1>
            <p>{copy.subtitle}</p>
          </div>
          <div className={css.introBottom}>
            <div className={css.counter}>
              <b>{filtered.length}</b>
              {copy.labels.productCountLabel || 'tác phẩm'}
            </div>
            <div className={css.scrollHint}>Vuốt ngang để khám phá</div>
          </div>
        </aside>

        <section className={css.galleryWrap}>
          <div className={css.galleryTop}>
            <div
              ref={filtersRef}
              className={css.filters}
              role="toolbar"
              aria-label={copy.labels.filterTitle}
            >
              <button
                type="button"
                data-collection-id=""
                className={`${css.filter}${activeCollections.length === 0 ? ` ${css.active}` : ''}`}
                onClick={() => setCollectionFilter(null)}
              >
                Tất cả
              </button>
              {filterChips.map((collection) => {
                const active = activeCollections.includes(collection.id);
                return (
                  <button
                    key={collection.id}
                    type="button"
                    data-collection-id={collection.id}
                    className={`${css.filter}${active ? ` ${css.active}` : ''}`}
                    onClick={() => setCollectionFilter(collection.id)}
                  >
                    {collection.name}
                  </button>
                );
              })}
            </div>
            <div className={css.galleryActions}>
              <button
                type="button"
                className={css.navArrow}
                aria-label="Tác phẩm trước"
                onClick={() => scrollGallery(-1)}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
                  <path d="M15 5L8 12l7 7" />
                </svg>
              </button>
              <button
                type="button"
                className={css.navArrow}
                aria-label="Tác phẩm tiếp theo"
                onClick={() => scrollGallery(1)}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
                  <path d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>

          {filtered.length > 0 ? (
            <div
              className={css.gallery}
              id="gallery"
              ref={galleryRef}
              onScroll={updateProgress}
            >
              {filtered.map((product, index) => {
                const featured = index === 0 || product.isBestSeller || product.has360;
                const imageSrc = toAssetUrl(product.image, API_ORIGIN) || product.image;
                const cardTitle =
                  product.name.trim().length > 2
                    ? product.name
                    : product.desc.split(/[.—–-]/)[0]?.trim() ||
                      product.collection ||
                      product.name;
                return (
                  <Link
                    key={product.id}
                    href={`/san-pham/${product.id}`}
                    className={`${css.productCard}${featured ? ` ${css.featured}` : ''}`}
                    data-testid="listing-product-card"
                    aria-label={`${copy.labels.detailLabel}: ${cardTitle}`}
                  >
                    <div className={css.productMedia}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={imageSrc} alt={cardTitle} loading="lazy" />
                    </div>
                    <div className={css.productIndex}>
                      {String(index + 1).padStart(2, '0')}
                    </div>
                    <div className={css.productType}>{product.type || product.collection}</div>
                    <div className={css.productInfo}>
                      <h2>{cardTitle}</h2>
                      <p>{product.desc || `${product.collection} · ${product.glaze}`}</p>
                      <span className={css.productLink}>
                        {product.has360
                          ? copy.labels.experience360Label
                          : copy.labels.detailLabel}
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className={css.emptyState}>
              <h3>{copy.labels.emptyTitle}</h3>
              <p>{copy.labels.emptyBody}</p>
              <button type="button" onClick={() => setCollectionFilter(null)}>
                {copy.labels.emptyResetLabel || copy.labels.resetLabel}
              </button>
            </div>
          )}

          <div className={css.progress} aria-hidden="true">
            <span className={css.progressBar} style={{ width: `${progress}%` }} />
          </div>
        </section>
      </div>
    </div>
  );
}
