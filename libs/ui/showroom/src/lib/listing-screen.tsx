'use client';

// POC source: listing.html + styles/listing.css + src/listing.js + data/site.json
// Parity: L-01..L-10

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { resolveApiOrigin, toAssetUrl } from '@gomhoasen/contracts';
import {
  readFirstShowroom360Product,
  readShowroomFilterLabel,
  readShowroomPhoneHref,
  readShowroomPriceRangeBounds,
  readShowroomProductDetailHref,
} from './showroom-display-normalization';
import css from './listing-screen.module.css';

/* ---- Types (from site.json shape) ---- */
interface SiteProduct {
  id: string; name: string; collection: string; collectionId: string;
  glaze: string; glazeId: string; type: string; typeId: string;
  size: string; price: number; priceLabel: string; image: string;
  has360: boolean; isNew: boolean; isLimited: boolean; isBestSeller: boolean;
  swatches: string[]; desc: string;
}
type StatusFilterKey = 'has360' | 'isNew' | 'isLimited' | 'isBestSeller';
interface FilterDef { id: string; name: string; count?: number; swatch?: string; min?: number; max?: number; }
interface SiteFilters { types: FilterDef[]; glazes: FilterDef[]; priceRanges: FilterDef[]; }
interface SiteCollection { id: string; name: string; desc: string; image: string; count: number; }
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

export interface ListingScreenProps { siteData: ListingSiteData; }

type Filters = { collection: string[]; type: string[]; glaze: string[]; price: string[]; status: string[] };
const emptyFilters = (): Filters => ({ collection: [], type: [], glaze: [], price: [], status: [] });
const SORT_VALUES = new Set(['featured', 'newest', 'price-asc', 'price-desc', 'has360']);

function readQueryValues(searchParams: URLSearchParams, key: string): string[] {
  return searchParams
    .getAll(key)
    .flatMap((value) => value.split(','))
    .map((value) => value.trim())
    .filter(Boolean);
}

function readFiltersFromUrl(
  searchParams: URLSearchParams,
  collections: SiteCollection[],
  filters: SiteFilters,
): Filters {
  const allowed: Record<keyof Filters, Set<string>> = {
    collection: new Set(collections.map((item) => item.id)),
    type: new Set(filters.types.map((item) => item.id)),
    glaze: new Set(filters.glazes.map((item) => item.id)),
    price: new Set(filters.priceRanges.map((item) => item.id)),
    status: new Set(['has360', 'isNew', 'isLimited', 'isBestSeller']),
  };
  const next = emptyFilters();
  (Object.keys(next) as (keyof Filters)[]).forEach((group) => {
    next[group] = readQueryValues(searchParams, group)
      .filter((value) => allowed[group].has(value));
  });
  return next;
}

const API_ORIGIN = resolveApiOrigin();

type ProductBadgeKind = '360' | 'limited' | 'new' | 'best';

function getPrimaryBadge(
  product: SiteProduct,
  labels: ListingSiteData['copy']['labels'],
): { label: string; kind: ProductBadgeKind } | null {
  if (product.has360) return { label: '360°', kind: '360' };
  if (product.isLimited) return { label: labels.badgeLimitedLabel, kind: 'limited' };
  if (product.isNew) return { label: labels.badgeNewLabel, kind: 'new' };
  if (product.isBestSeller) return { label: labels.badgeBestSellerLabel, kind: 'best' };
  return null;
}

function isFilterDef(value: FilterDef | undefined): value is FilterDef {
  return value !== undefined;
}

export function ListingScreen({ siteData }: ListingScreenProps) {
  const { brand, navigation, collections, products, filters, copy } = siteData;
  const currentYear = new Date().getFullYear();
  const brandPhoneHref = readShowroomPhoneHref(brand.phone);
  const hasPhone = brandPhoneHref !== undefined;
  const first360Product = readFirstShowroom360Product(products);
  const searchParams = useSearchParams();

  const [activeFilters, setActiveFilters] = useState<Filters>(() =>
    readFiltersFromUrl(searchParams, collections, filters),
  );
  const [sortBy, setSortBy] = useState(() => {
    const requested = searchParams.get('sort');
    return requested && SORT_VALUES.has(requested) ? requested : 'featured';
  });
  const [quickView, setQuickView] = useState<SiteProduct | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileFilter, setMobileFilter] = useState(false);

  const openQuickView = useCallback((product: SiteProduct) => {
    setQuickView(product);
  }, []);

  const handleProductCardKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>, product: SiteProduct) => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault();
      openQuickView(product);
    },
    [openQuickView],
  );

  // L-04: Toggle filter value
  const toggleFilter = useCallback((group: keyof Filters, value: string) => {
    setActiveFilters((prev) => {
      const arr = prev[group];
      return { ...prev, [group]: arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value] };
    });
  }, []);

  const resetFilters = useCallback(() => setActiveFilters(emptyFilters()), []);

  useEffect(() => {
    const syncFromLocation = () => {
      const params = new URLSearchParams(window.location.search);
      setActiveFilters(readFiltersFromUrl(params, collections, filters));
      const requestedSort = params.get('sort');
      setSortBy(requestedSort && SORT_VALUES.has(requestedSort) ? requestedSort : 'featured');
    };
    window.addEventListener('popstate', syncFromLocation);
    return () => window.removeEventListener('popstate', syncFromLocation);
  }, [collections, filters]);

  useEffect(() => {
    const params = new URLSearchParams();
    (Object.keys(activeFilters) as (keyof Filters)[]).forEach((group) => {
      activeFilters[group].forEach((value) => params.append(group, value));
    });
    if (sortBy !== 'featured') params.set('sort', sortBy);
    const query = params.toString();
    const nextUrl = `${window.location.pathname}${query ? `?${query}` : ''}`;
    window.history.replaceState({}, '', nextUrl);
  }, [activeFilters, sortBy]);

  // L-05: Filtered + sorted products
  const filtered = useMemo(() => {
    let list = [...products];
    const f = activeFilters;
    if (f.collection.length) list = list.filter((p) => f.collection.includes(p.collectionId));
    if (f.type.length) list = list.filter((p) => f.type.includes(p.typeId));
    if (f.glaze.length) list = list.filter((p) => f.glaze.includes(p.glazeId));
    if (f.price.length) {
      const ranges = f.price
        .map((id) => filters.priceRanges.find((r) => r.id === id))
        .filter(isFilterDef)
        .map(readShowroomPriceRangeBounds);
      list = list.filter((p) => ranges.some((r) => p.price >= r.min && p.price < r.max));
    }
    if (f.status.length) {
      list = list.filter((p) => f.status.some((s) => {
        if (!isStatusFilterKey(s)) return false;
        return p[s];
      }));
    }

    switch (sortBy) {
      case 'newest': list.sort((a, b) => (b.isNew ? 1 : 0) - (a.isNew ? 1 : 0)); break;
      case 'price-asc': list.sort((a, b) => a.price - b.price); break;
      case 'price-desc': list.sort((a, b) => b.price - a.price); break;
      case 'has360': list.sort((a, b) => (b.has360 ? 1 : 0) - (a.has360 ? 1 : 0)); break;
      default: list.sort((a, b) => {
        const s = (p: SiteProduct) => (p.has360 ? 4 : 0) + (p.isBestSeller ? 2 : 0) + (p.isLimited ? 1 : 0);
        return s(b) - s(a);
      });
    }
    return list;
  }, [products, activeFilters, sortBy, filters.priceRanges]);

  // ESC close
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setQuickView(null);
        setMobileFilter(false);
        setMenuOpen(false);
      }
    };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, []);

  useEffect(() => {
    if (!quickView && !mobileFilter && !menuOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [menuOpen, mobileFilter, quickView]);

  // Active filter tags
  const filterTags = useMemo(() => {
    const tags: { group: keyof Filters; value: string; label: string }[] = [];
    const labelSources = {
      collections,
      glazes: filters.glazes,
      types: filters.types,
      priceRanges: filters.priceRanges,
      statusLabels: {
        has360: '360°',
        isNew: copy.labels.badgeNewLabel,
        isLimited: copy.labels.badgeLimitedLabel,
        isBestSeller: copy.labels.badgeBestSellerLabel,
      },
    };
    (Object.keys(activeFilters) as (keyof Filters)[]).forEach((g) => activeFilters[g].forEach((v) => tags.push({ group: g, value: v, label: readShowroomFilterLabel(g, v, labelSources) })));
    return tags;
  }, [activeFilters, collections, copy.labels, filters]);

  // Shared filter panel renderer
  function renderFilterPanel() {
    return (
      <>
        <FilterGroup label={copy.labels.collectionFilterLabel} group="collection" options={collections.map((c) => ({ id: c.id, name: c.name }))} active={activeFilters.collection} onToggle={toggleFilter} />
        <FilterGroup label={copy.labels.typeFilterLabel} group="type" options={filters.types} active={activeFilters.type} onToggle={toggleFilter} />
        <FilterGroup label={copy.labels.glazeFilterLabel} group="glaze" options={filters.glazes} active={activeFilters.glaze} onToggle={toggleFilter} />
        <FilterGroup label={copy.labels.priceFilterLabel} group="price" options={filters.priceRanges} active={activeFilters.price} onToggle={toggleFilter} />
        <div className={css.filterGroup}>
          <h4 className={css.filterGroupLabel}>{copy.labels.statusFilterLabel} <span className={css.filterArrow}>▾</span></h4>
          <div className={css.filterOptions}>
            {[
              { id: 'has360', name: copy.labels.status360Label },
              { id: 'isNew', name: copy.labels.statusNewLabel },
              { id: 'isLimited', name: copy.labels.statusLimitedLabel },
              { id: 'isBestSeller', name: copy.labels.statusBestSellerLabel },
            ].map((o) => (
              <label key={o.id} className={css.filterOption}>
                <input type="checkbox" checked={activeFilters.status.includes(o.id)} onChange={() => toggleFilter('status', o.id)} /> {o.name}
              </label>
            ))}
          </div>
        </div>
      </>
    );
  }

  return (
    <div className={css.listingPage}>
      {/* L-01: Nav */}
      <nav className={css.nav}>
        <Link href="/" className={css.navBrand}>
          <span>{brand.name}</span>
        </Link>
        <div className={css.navLinks}>
          {navigation.map((item) => (
            <Link
              key={`${item.href}-${item.label}`}
              href={item.href}
              className={`${css.navLink} ${item.href === '/san-pham' ? css.navLinkActive : ''}`}
            >
              {item.label}
            </Link>
          ))}
        </div>
        <Link href={readShowroomProductDetailHref(first360Product)} className={css.navCta}>
          {first360Product ? copy.labels.featured360Label : copy.labels.exploreLabel}
        </Link>
        <button className={css.navMenu} onClick={() => setMenuOpen(true)} aria-label="Mở menu" type="button">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 12h18M3 6h18M3 18h18" /></svg>
        </button>
      </nav>

      {/* Menu overlay (mobile) */}
      {menuOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1100, background: 'rgba(245,240,230,0.98)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 32 }}>
          <button onClick={() => setMenuOpen(false)} style={{ position: 'absolute', top: 20, right: 20, width: 44, height: 44, borderRadius: '50%', border: '1px solid rgba(0,0,0,0.1)', background: 'transparent', fontSize: '1.2rem', cursor: 'pointer' }} type="button" aria-label="Đóng menu">✕</button>
          {navigation.map((item) => (
            <Link
              key={`mobile-${item.href}-${item.label}`}
              href={item.href}
              onClick={() => setMenuOpen(false)}
              style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem', fontWeight: 600, color: item.href === '/san-pham' ? '#9A7520' : '#5F554C', textDecoration: 'none' }}
            >
              {item.label}
            </Link>
          ))}
        </div>
      )}

      {/* L-02: Listing Hero */}
      <section className={css.listingHero}>
        <div className="container">
          <span className={css.listingLabel}>{copy.eyebrow}</span>
          <h1 className={css.listingTitle}>{copy.title}</h1>
          <p className={css.listingSubtitle}>{copy.subtitle}</p>
          <div className={css.listingStats}>
            <span>{filtered.length} {copy.labels.productCountLabel}</span>
            <span className={css.statSep}>/</span>
            <span>{collections.length} {copy.labels.collectionCountLabel}</span>
            <span className={css.statSep}>/</span>
            <span>{filters.glazes.length} {copy.labels.glazeCountLabel}</span>
          </div>
        </div>
      </section>

      {/* L-03: Main layout */}
      <div className={css.listingMain}>
        {/* L-04: Filter Sidebar */}
        <aside className={css.filterSidebar}>
          <div className={css.filterHeader}>
            <h3 className={css.filterTitle}>{copy.labels.filterTitle}</h3>
            <button className={css.filterReset} onClick={resetFilters} type="button">{copy.labels.resetLabel}</button>
          </div>
          {renderFilterPanel()}
        </aside>

        {/* L-06: Product Grid Main */}
        <main>
          {/* L-05: Sort Bar */}
          <div className={css.sortBar}>
            <div className={css.activeFilters}>
              {filterTags.map((t) => (
                <span key={`${t.group}-${t.value}`} className={css.activeFilterTag}>
                  {t.label}
                  <button className={css.removeTag} onClick={() => toggleFilter(t.group, t.value)} type="button">✕</button>
                </span>
              ))}
            </div>
            <div className={css.sortControls}>
              <span className={css.sortLabel}>{copy.labels.sortLabel}</span>
              <select className={css.sortSelect} value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                <option value="featured">{copy.labels.sortFeaturedLabel}</option>
                <option value="newest">{copy.labels.sortNewestLabel}</option>
                <option value="price-asc">{copy.labels.sortPriceAscLabel}</option>
                <option value="price-desc">{copy.labels.sortPriceDescLabel}</option>
                <option value="has360">{copy.labels.sort360Label}</option>
              </select>
            </div>
          </div>

          {/* Grid */}
          {filtered.length > 0 ? (
            <div className={css.productGrid}>
              {filtered.map((p) => {
                const badge = getPrimaryBadge(p, copy.labels);
                const badgeClass = badge?.kind === '360'
                  ? css.badge360
                  : badge?.kind === 'limited'
                    ? css.badgeLimited
                    : badge?.kind === 'new'
                      ? css.badgeNew
                      : css.badgeBest;

                return (
                  <div
                    key={p.id}
                    className={css.productCard}
                    onClick={() => openQuickView(p)}
                    onKeyDown={(event) => handleProductCardKeyDown(event, p)}
                    role="button"
                    tabIndex={0}
                    aria-label={`${copy.labels.quickViewLabel}: ${p.name}`}
                    data-testid="listing-product-card"
                  >
                    <div className={css.cardImage}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={toAssetUrl(p.image, API_ORIGIN)} alt={p.name} loading="lazy" />
                      {badge && <span className={`${css.badge} ${badgeClass}`}>{badge.label}</span>}
                      <div className={css.cardOverlay}>
                        {p.has360 ? (
                          <Link href={`/san-pham/${p.id}`} className={css.cardOverlayBtn} onClick={(e) => e.stopPropagation()}>{copy.labels.experience360Label}</Link>
                        ) : (
                          <button className={css.cardOverlayBtn} onClick={(e) => { e.stopPropagation(); openQuickView(p); }} type="button">{copy.labels.detailLabel}</button>
                        )}
                      </div>
                    </div>
                    <div className={css.cardBody}>
                      <h3 className={css.cardName}>{p.name}</h3>
                      <div className={css.cardCollection}>{p.collection} • {p.glaze}</div>
                      <div className={css.cardFooter}>
                        <span className={css.cardPrice}>{p.priceLabel}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* L-07: Empty state */
            <div className={css.emptyState}>
              <div className={css.emptyIcon}><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2z" /><path d="M9 16l2 2 4-4" /></svg></div>
              <h3>{copy.labels.emptyTitle}</h3>
              <p>{copy.labels.emptyBody} <button className={css.emptyReset} onClick={resetFilters} type="button">{copy.labels.emptyResetLabel}</button></p>
            </div>
          )}

          {/* L-08: Collection assistant */}
          {filtered.length > 0 && (
            <div className={css.assistant}>
              <div className={css.assistantIcon}><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="10" /><path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg></div>
              <h3>{copy.advisorTitle}</h3>
              <p>{copy.advisorBody}</p>
              {hasPhone && <Link href={brandPhoneHref} className={css.btnOutline}>{copy.labels.advisorCtaLabel}</Link>}
            </div>
          )}
        </main>
      </div>

      {/* L-10: Mobile filter button */}
      <button className={css.mobileFilterBtn} onClick={() => setMobileFilter(true)} type="button">{copy.labels.filterTitle}</button>

      {/* Mobile filter overlay */}
      {mobileFilter && (
        <div className={css.filterOverlay} onClick={() => setMobileFilter(false)}>
          <div className={css.filterSheet} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="mobile-filter-title">
            <div className={css.filterSheetHeader}>
              <h3 id="mobile-filter-title">{copy.labels.filterTitle}</h3>
              <button className={css.filterSheetClose} onClick={() => setMobileFilter(false)} type="button" aria-label="Đóng bộ lọc">✕</button>
            </div>
            <div className={css.filterSheetBody}>{renderFilterPanel()}</div>
            <div className={css.filterSheetFooter}>
              <button className={css.btnPrimary} onClick={() => setMobileFilter(false)} type="button">{copy.labels.applyFilterLabel}</button>
            </div>
          </div>
        </div>
      )}

      {/* L-09: Quick View Drawer */}
      {quickView && (
        <>
          <div className={css.qvBackdrop} onClick={() => setQuickView(null)} />
          <div
            className={css.qvDrawer}
            role="dialog"
            aria-modal="true"
            aria-labelledby="quick-view-title"
            data-testid="listing-quick-view"
          >
            <button className={css.qvClose} onClick={() => setQuickView(null)} type="button" aria-label={`${copy.labels.resetLabel}: ${copy.labels.quickViewLabel}`}>✕</button>
            <div className={css.qvImage}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={toAssetUrl(quickView.image, API_ORIGIN)} alt={quickView.name} />
            </div>
            <div className={css.qvBody}>
              <span className={css.qvCollection}>{quickView.collection.toUpperCase()}</span>
              <h2 id="quick-view-title" className={css.qvName}>{quickView.name}</h2>
              <p className={css.qvDesc}>{quickView.desc}</p>
              <div className={css.qvMeta}>
                <span className={css.qvPrice}>{quickView.priceLabel}</span>
                <span className={css.qvGlaze}>{quickView.glaze} • {quickView.size}</span>
              </div>
              <div className={css.qvSwatches}>
                {quickView.swatches.map((s) => <span key={s} className={css.qvSwatch} style={{ background: s }} />)}
              </div>
              <div className={css.qvActions}>
                <Link
                  href={`/san-pham/${quickView.id}`}
                  className={css.btnPrimary}
                  data-testid="listing-quick-view-detail-link"
                >
                  {quickView.has360 ? `${copy.labels.experience360Label} →` : `${copy.labels.detailLabel} →`}
                </Link>
                {hasPhone && <a href={brandPhoneHref} className={css.btnOutline}>{copy.labels.consultationLabel}</a>}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Footer */}
      <footer className={css.footer}>
        <p>{copy.labels.footerTemplate.replace('{year}', String(currentYear)).replace('{brand}', brand.name)}</p>
      </footer>

      {/* Floating CTA 
          {hasPhone && <a href={brandPhoneHref} className={css.floatingCta} aria-label="Gọi tư vấn"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6A19.79 19.79 0 012.12 4.18 2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z" /></svg></a>}
      */}
    </div>
  );
}

function isStatusFilterKey(value: string): value is StatusFilterKey {
  return value === 'has360' || value === 'isNew' || value === 'isLimited' || value === 'isBestSeller';
}

/* ---- Filter Group sub-component ---- */
function FilterGroup({ label, group, options, active, onToggle }: {
  label: string; group: keyof Filters; options: FilterDef[]; active: string[];
  onToggle: (g: keyof Filters, v: string) => void;
}) {
  const [collapsed, setCollapsed] = useState(false);
  return (
    <div className={`${css.filterGroup} ${collapsed ? css.filterCollapsed : ''}`}>
      <button className={css.filterGroupLabel} onClick={() => setCollapsed((p) => !p)} type="button">
        {label} <span className={css.filterArrow}>▾</span>
      </button>
      {!collapsed && (
        <div className={css.filterOptions}>
          {options.map((o) => (
            <label key={o.id} className={css.filterOption}>
              <input type="checkbox" checked={active.includes(o.id)} onChange={() => onToggle(group, o.id)} />
              {o.swatch && <span className={css.filterSwatch} style={{ background: o.swatch }} />}
              {o.name} {o.count != null && <span style={{ color: 'var(--text-dim)', fontSize: '0.65rem' }}>({o.count})</span>}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
