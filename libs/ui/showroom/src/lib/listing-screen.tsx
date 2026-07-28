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
  // Long category names: accent the last two words (e.g. "Men Hoàng Thổ").
  if (parts.length >= 4) {
    return {
      lead: parts.slice(0, -2).join(' '),
      accent: parts.slice(-2).join(' '),
    };
  }
  return {
    lead: parts.slice(0, -1).join(' '),
    accent: parts[parts.length - 1] ?? '',
  };
}

function normalizeKey(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/** Curated intros — preferred over short CMS taglines. */
function inventCollectionIntro(name: string): string | null {
  const key = normalizeKey(name);
  if (key.includes('hoa thach')) {
    return 'Men hóa thạch lưu vân đá tự nhiên trên thân gốm — từng lớp men chảy chậm trong lò, tạo bề mặt sâu như đá cổ. Bộ đồ thờ trong dòng này dành cho không gian trang nghiêm, muốn giữ hồn Việt mà vẫn hiện đại.';
  }
  if (key.includes('hoang tho')) {
    return 'Men hoàng thổ mang sắc đất nung ấm — vàng mật, nâu trầm, ánh đồng khi nghiêng sáng. Phù hợp bàn thờ gia tiên và phòng khách truyền thống, nơi muốn cảm giác vững chãi, gần gũi.';
  }
  if (key.includes('doc ban')) {
    return 'Những tác phẩm độc bản được chuốt tay từng chiếc, không nhân bản khuôn hàng loạt. Mỗi dáng, mỗi vân men là một lần gặp duy nhất — dành cho người sưu tầm và không gian muốn điểm nhấn riêng.';
  }
  if (key.includes('men lam') || key.includes('di san')) {
    return 'Men lam di sản gợi nhớ sắc xanh cổ của gốm Việt — lớp men trong, hoa văn tiết chế, ánh kim vừa đủ. Hợp không gian thờ tự và phòng khách muốn giữ hơi thở nghi lễ mà không nặng nề.';
  }
  if (key.includes('thien moc')) {
    return 'Thiền Mộc nghiêng về dáng tối giản, men trầm và cảm giác gỗ–đất hòa cùng nhau. Tác phẩm trong dòng này dành cho phòng trà, góc đọc sách hoặc không gian thiền cần sự tĩnh.';
  }
  if (key.includes('phu quy')) {
    return 'Phú Quý tập hợp những dáng và men mang biểu tượng sung túc — đường nét đĩnh đạc, sắc ấm, chi tiết chạm chọn lọc. Phù hợp làm quà mừng nhà mới, kỷ niệm hoặc điểm nhấn phòng khách.';
  }
  if (key.includes('tra dao') || (key.includes('tra') && !key.includes('tho'))) {
    return 'Trà Đạo gom ấm, chén và phụ kiện đồng bộ men — giữ nhiệt vừa phải, cầm chắc tay. Dành cho bàn trà hàng ngày lẫn tiếp khách trong không gian chậm rãi.';
  }
  if (key === 'hoa sen' || (key.includes('hoa sen') && !key.includes('gom') && !key.includes('tho'))) {
    return 'Dòng Hoa Sen lấy cảm hứng từ đài sen Việt — thanh, nhẹ và giàu biểu tượng. Bình, tượng và vật trang trí hợp phòng trà, phòng khách tối giản hoặc góc thiền.';
  }
  if (key.includes('sen viet')) {
    return 'Sen Việt kể chuyện gốm dân gian đương đại: dáng quen thuộc của làng nghề, men và hoa văn được tinh giản để sống cùng nhà phố và biệt thự ngày nay.';
  }
  if (key.includes('do tho') || key.includes('ban tho')) {
    return 'Bộ đồ thờ Gốm Hoa Sen giữ tỷ lệ trang nghiêm, men sâu và chi tiết chạm tinh — đủ cho bàn thờ gia đình lẫn không gian tâm linh cần sự tĩnh tại.';
  }
  return null;
}

function resolveCollectionSubtitle(name: string, apiDesc: string): string {
  const curated = inventCollectionIntro(name);
  if (curated) return curated;
  if (apiDesc.length >= 80) return apiDesc;
  return `Khám phá ${name}: tuyển chọn theo dáng, men và công năng — từ không gian thờ tự đến góc sống đương đại, mỗi tác phẩm mang dấu tay làng nghề Gốm Hoa Sen.`;
}

function resolveActiveIntro(
  activeCollections: string[],
  collections: SiteCollection[],
  fallback: { title: string; subtitle: string },
): { title: string; subtitle: string } {
  const activeId = activeCollections[0];
  if (!activeId) return fallback;
  const collection = collections.find((item) => item.id === activeId);
  if (!collection) return fallback;
  return {
    title: collection.name,
    subtitle: resolveCollectionSubtitle(collection.name, collection.desc.trim()),
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

  const activeIntro = useMemo(
    () =>
      resolveActiveIntro(activeCollections, collections, {
        title: copy.title || 'Bộ sưu tập gốm sứ',
        subtitle:
          copy.subtitle ||
          'Những tác phẩm gốm được tuyển chọn theo chất men, hoa văn, công năng và không gian sống.',
      }),
    [activeCollections, collections, copy.subtitle, copy.title],
  );
  const titleParts = useMemo(() => splitTitle(activeIntro.title), [activeIntro.title]);

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

  // Desktop: drag-to-scroll + map vertical wheel → horizontal (touch keeps native pan).
  useEffect(() => {
    const el = galleryRef.current;
    if (!el) return;

    const DRAG_THRESHOLD = 8;
    let pointerId: number | null = null;
    let startX = 0;
    let startScroll = 0;
    let dragging = false;
    let suppressClick = false;
    let moveListener: ((event: PointerEvent) => void) | null = null;
    let upListener: ((event: PointerEvent) => void) | null = null;

    const canScroll = () => el.scrollWidth > el.clientWidth + 2;

    const cleanupWindowListeners = () => {
      if (moveListener) {
        window.removeEventListener('pointermove', moveListener);
        moveListener = null;
      }
      if (upListener) {
        window.removeEventListener('pointerup', upListener);
        window.removeEventListener('pointercancel', upListener);
        upListener = null;
      }
    };

    const finishDrag = () => {
      pointerId = null;
      cleanupWindowListeners();
      if (dragging) {
        el.classList.remove(css.galleryDragging);
        el.style.scrollSnapType = '';
        el.style.scrollBehavior = '';
      }
      dragging = false;
    };

    const onWheel = (event: WheelEvent) => {
      if (!canScroll()) return;
      // Trackpads already send deltaX — leave native horizontal alone.
      if (Math.abs(event.deltaX) > Math.abs(event.deltaY)) return;
      if (event.deltaY === 0) return;
      event.preventDefault();
      // CSS scroll-behavior:smooth swallows immediate scrollLeft writes — force instant.
      el.style.scrollBehavior = 'auto';
      el.scrollBy({ left: event.deltaY, behavior: 'auto' });
    };

    // Links/images steal native HTML drag — kill it so gallery pan can start on the card.
    const onDragStart = (event: DragEvent) => {
      event.preventDefault();
    };

    const onPointerDown = (event: PointerEvent) => {
      if (event.pointerType === 'touch') return;
      if (event.button !== 0) return;
      if (!canScroll()) return;

      pointerId = event.pointerId;
      startX = event.clientX;
      startScroll = el.scrollLeft;
      dragging = false;
      suppressClick = false;
      cleanupWindowListeners();

      moveListener = (moveEvent: PointerEvent) => {
        if (moveEvent.pointerId !== pointerId) return;
        const dx = moveEvent.clientX - startX;
        if (!dragging) {
          if (Math.abs(dx) < DRAG_THRESHOLD) return;
          dragging = true;
          suppressClick = true;
          el.classList.add(css.galleryDragging);
          el.style.scrollSnapType = 'none';
          el.style.scrollBehavior = 'auto';
          try {
            el.setPointerCapture(moveEvent.pointerId);
          } catch {
            /* capture optional — window listeners already track the gesture */
          }
        }
        el.scrollLeft = startScroll - dx;
        moveEvent.preventDefault();
      };

      upListener = (upEvent: PointerEvent) => {
        if (upEvent.pointerId !== pointerId) return;
        try {
          el.releasePointerCapture(upEvent.pointerId);
        } catch {
          /* already released */
        }
        finishDrag();
      };

      // Window listeners: pointermove on <a>/<img> is lost once native drag starts.
      window.addEventListener('pointermove', moveListener, { passive: false });
      window.addEventListener('pointerup', upListener);
      window.addEventListener('pointercancel', upListener);
    };

    const onClickCapture = (event: MouseEvent) => {
      if (!suppressClick) return;
      event.preventDefault();
      event.stopPropagation();
      suppressClick = false;
    };

    el.addEventListener('wheel', onWheel, { passive: false });
    el.addEventListener('dragstart', onDragStart, true);
    el.addEventListener('pointerdown', onPointerDown);
    el.addEventListener('click', onClickCapture, true);

    return () => {
      cleanupWindowListeners();
      el.removeEventListener('wheel', onWheel);
      el.removeEventListener('dragstart', onDragStart, true);
      el.removeEventListener('pointerdown', onPointerDown);
      el.removeEventListener('click', onClickCapture, true);
      el.classList.remove(css.galleryDragging);
      el.style.scrollSnapType = '';
      el.style.scrollBehavior = '';
    };
  }, [filtered.length]);

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
            <p>{activeIntro.subtitle}</p>
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
                    draggable={false}
                    onDragStart={(event) => event.preventDefault()}
                  >
                    <div className={css.productMedia}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={imageSrc}
                        alt={cardTitle}
                        loading="lazy"
                        draggable={false}
                        onDragStart={(event) => event.preventDefault()}
                      />
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
