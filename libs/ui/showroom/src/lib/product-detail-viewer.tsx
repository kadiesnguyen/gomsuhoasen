'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import type {
  ViewSectionContract,
  ProductVariantContract,
  ProductStoryContract,
  ProductCtaContract,
  HotspotContract,
} from '@gomhoasen/contracts';
import { resolveApiOrigin, toAssetUrl } from '@gomhoasen/contracts';
import { ProductQrPanel } from '@gomhoasen/ui-product-qr';
import { CheckoutOrderModal } from './checkout-order-modal';
import css from './product-detail-viewer.module.css';
import { toRenderableRichHtml } from './rich-html';
import { readShowroomText } from './showroom-display-normalization';


const LAST_CATALOG_URL_KEY = 'ghs:lastCatalogUrl';

function readLastCatalogHref(): string {
  try {
    const stored = sessionStorage.getItem(LAST_CATALOG_URL_KEY);
    if (stored?.startsWith('/danh-muc')) return stored;
  } catch {
    /* ignore */
  }
  return '/danh-muc';
}

const API_ORIGIN = resolveApiOrigin();

export interface ProductDetailViewerProps {
  productId: string;
  /** Public slug used for `/san-pham/{slug}` QR link. */
  productSlug?: string;
  productName: string;
  brandName: string;
  productSubtitle?: string;
  modelUrl?: string;
  video360Url?: string;
  posterUrl?: string;
  images?: string[];
  viewSections?: ViewSectionContract[];
  variants?: ProductVariantContract[];
  specs?: Record<string, string>;
  story?: ProductStoryContract;
  referencePrice?: number;
  priceLabel?: string;
  cta?: ProductCtaContract;
  copy: {
    backLabel: string;
    loadingSubtitle: string;
    specsTitle: string;
    contactTitle: string;
    directChatLabel: string;
    namePlaceholder: string;
    phonePlaceholder: string;
    emailPlaceholder: string;
    notePlaceholder: string;
    submitLabel: string;
    submittingLabel: string;
    successTemplate: string;
    errorMessage: string;
    view360Title: string;
    view360Note: string;
    exit3dLabel: string;
    fullscreen3dLabel: string;
    productInfoLabel: string;
    imageUpdatingLabel: string;
    imageLabel: string;
    viewLabel: string;
    interact3dLabel: string;
    video360Label: string;
    variantsTitle: string;
    storyTitle: string;
    zaloLabel: string;
    hotlineLabel: string;
    emailLabel: string;
    rfqTitle: string;
    shortcutVariantLabel: string;
    shortcutStoryLabel: string;
    shortcutSpecsLabel: string;
    shortcutContactLabel: string;
  };
}

type PanelKind = 'overview' | 'hotspot';

type PanelState = {
  kind: PanelKind;
  title: string;
  kicker: string;
  image?: string;
  lead?: string;
  hotspot?: HotspotContract;
};

const MODE_LABELS = ['Góc chính', 'Không gian', 'Chi tiết'] as const;
const HOTSPOT_SLOTS = ['glaze', 'pattern', 'base'] as const;

function asset(url?: string): string | undefined {
  const value = readShowroomText(url);
  if (!value) return undefined;
  return toAssetUrl(value, API_ORIGIN) || value;
}

function phoneHref(phone?: string): string | undefined {
  const digits = readShowroomText(phone)?.replace(/[^\d+]/g, '');
  return digits ? `tel:${digits}` : undefined;
}

function isContactOnlyPriceLabel(value: string): boolean {
  return /^(liên\s*hệ|contact|call|tư\s*vấn)(\s|&|\/|-|$)/i.test(value.trim());
}

function formatPriceLabel(referencePrice?: number, priceLabel?: string): string | undefined {
  const labeled = readShowroomText(priceLabel);
  if (labeled && !isContactOnlyPriceLabel(labeled)) return labeled;
  if (typeof referencePrice === 'number' && Number.isFinite(referencePrice) && referencePrice > 0) {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      maximumFractionDigits: 0,
    }).format(referencePrice);
  }
  return undefined;
}

export function ProductDetailViewer({
  productId,
  productSlug,
  productName,
  brandName,
  productSubtitle = '',
  posterUrl,
  images = [],
  viewSections = [],
  specs = {},
  story,
  referencePrice,
  priceLabel,
  cta = {},
  copy,
}: ProductDetailViewerProps) {
  const stageRef = useRef<HTMLDivElement | null>(null);
  const pageRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<{
    active: boolean;
    x: number;
    y: number;
    ry: number;
    rx: number;
  }>({ active: false, x: 0, y: 0, ry: 0, rx: 0 });
  const pinchRef = useRef<number | null>(null);
  const autoRef = useRef<number | null>(null);

  const mediaList = useMemo(() => {
    const list = [asset(posterUrl), ...images.map((item) => asset(item))].filter(
      (item): item is string => Boolean(item),
    );
    return Array.from(new Set(list));
  }, [images, posterUrl]);

  const hotspots = useMemo(
    () => viewSections.flatMap((section) => section.hotspots ?? []).slice(0, 3),
    [viewSections],
  );

  const [modeIndex, setModeIndex] = useState(0);
  const [ry, setRy] = useState(0);
  const [rx, setRx] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [autoRotate, setAutoRotate] = useState(false);
  const [panel, setPanel] = useState<PanelState | null>(null);
  const [guideVisible, setGuideVisible] = useState(true);
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  const activeImage = mediaList[Math.min(modeIndex, Math.max(mediaList.length - 1, 0))] ?? '';
  const displayName =
    productName.trim().length > 2
      ? productName
      : readShowroomText(productSubtitle) ||
        readShowroomText(story?.title) ||
        productName;

  const draw = useCallback((nextRy: number, nextRx: number, nextZoom: number) => {
    const product = stageRef.current?.querySelector<HTMLElement>(`.${css.product}`);
    if (!product) return;
    product.style.setProperty('--ry', `${nextRy}deg`);
    product.style.setProperty('--rx', `${nextRx}deg`);
    product.style.setProperty('--zoom', String(nextZoom));
  }, []);

  useEffect(() => {
    draw(ry, rx, zoom);
  }, [draw, rx, ry, zoom]);

  useEffect(() => {
    if (!autoRotate) {
      if (autoRef.current) window.cancelAnimationFrame(autoRef.current);
      autoRef.current = null;
      return;
    }
    const tick = () => {
      setRy((value) => {
        const next = value + 0.35;
        return next > 180 ? next - 360 : next;
      });
      autoRef.current = window.requestAnimationFrame(tick);
    };
    autoRef.current = window.requestAnimationFrame(tick);
    return () => {
      if (autoRef.current) window.cancelAnimationFrame(autoRef.current);
    };
  }, [autoRotate]);

  useEffect(() => {
    const timer = window.setTimeout(() => setGuideVisible(false), 4200);
    return () => window.clearTimeout(timer);
  }, []);

  const resetView = useCallback(() => {
    setRy(0);
    setRx(0);
    setZoom(1);
    setAutoRotate(false);
  }, []);

  const openOverview = useCallback(() => {
    setPanel({
      kind: 'overview',
      kicker: brandName || copy.productInfoLabel,
      title: displayName,
      image: activeImage || asset(posterUrl) || '/assets/brand/lotus-mark.png',
      lead: productSubtitle || story?.subtitle || story?.content,
    });
  }, [
    activeImage,
    brandName,
    copy.productInfoLabel,
    displayName,
    posterUrl,
    productSubtitle,
    story,
  ]);

  const openHotspot = useCallback(
    (hotspot: HotspotContract) => {
      setPanel({
        kind: 'hotspot',
        kicker: hotspot.label,
        title: hotspot.panel?.title || hotspot.label,
        image:
          asset(hotspot.panel?.image) ||
          activeImage ||
          '/assets/brand/lotus-mark.png',
        lead: hotspot.panel?.content,
        hotspot,
      });
    },
    [activeImage],
  );

  const closePanel = useCallback(() => setPanel(null), []);

  useEffect(() => {
    if (!panel) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closePanel();
    };
    window.addEventListener('keydown', onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = previous;
    };
  }, [closePanel, panel]);

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === 'touch' && event.nativeEvent.isPrimary === false) return;
    // Hotspot / control clicks sit inside the stage; capturing here eats the click.
    const target = event.target;
    if (target instanceof Element && target.closest('button, a, input, textarea, select, label')) {
      return;
    }
    dragRef.current = {
      active: true,
      x: event.clientX,
      y: event.clientY,
      ry,
      rx,
    };
    setAutoRotate(false);
    setGuideVisible(false);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current.active) return;
    const dx = event.clientX - dragRef.current.x;
    const dy = event.clientY - dragRef.current.y;
    setRy(dragRef.current.ry + dx * 0.35);
    setRx(Math.max(-28, Math.min(28, dragRef.current.rx - dy * 0.2)));
  };

  const onPointerUp = () => {
    dragRef.current.active = false;
  };

  const onWheel = (event: React.WheelEvent<HTMLDivElement>) => {
    event.preventDefault();
    setZoom((value) => Math.max(0.84, Math.min(1.58, value + (event.deltaY > 0 ? -0.08 : 0.08))));
    setGuideVisible(false);
  };

  const onTouchStart = (event: React.TouchEvent<HTMLDivElement>) => {
    if (event.touches.length === 2) {
      const [a, b] = [event.touches[0], event.touches[1]];
      if (!a || !b) return;
      pinchRef.current = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
      dragRef.current.active = false;
    }
  };

  const onTouchMove = (event: React.TouchEvent<HTMLDivElement>) => {
    if (event.touches.length < 2 || pinchRef.current == null) return;
    const [a, b] = [event.touches[0], event.touches[1]];
    if (!a || !b) return;
    const distance = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
    const delta = (distance - pinchRef.current) * 0.0025;
    pinchRef.current = distance;
    setZoom((value) => Math.max(0.84, Math.min(1.58, value + delta)));
  };

  const onTouchEnd = () => {
    pinchRef.current = null;
  };

  const onDoubleClick = () => resetView();

  const toggleFullscreen = async () => {
    const root = pageRef.current;
    if (!root) return;
    if (document.fullscreenElement) {
      await document.exitFullscreen();
      return;
    }
    await root.requestFullscreen?.();
  };

  const hotline = phoneHref(cta.hotline);
  const displayPrice = formatPriceLabel(referencePrice, priceLabel);
  const actionLabel = readShowroomText(cta.label) || 'Đặt mua';
  const unitPrice =
    typeof referencePrice === 'number' && Number.isFinite(referencePrice) && referencePrice > 0
      ? referencePrice
      : 0;
  const backHref = useMemo(() => readLastCatalogHref(), []);

  const specEntries = Object.entries(specs).filter(([, value]) => Boolean(value));

  return (
    <div className={css.page} ref={pageRef}>
      <div className={css.stageArea} id="viewer">
        <div className={css.lightCone} aria-hidden="true" />
        <div className={css.halo} aria-hidden="true" />
        <div className={css.pedestal} aria-hidden="true" />

        <div
          className={css.stage}
          id="stage"
          ref={stageRef}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onWheel={onWheel}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
          onDoubleClick={onDoubleClick}
        >
          {activeImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              id="product"
              className={`${css.product}${modeIndex === 2 ? ` ${css.macro}` : ''}`}
              src={activeImage}
              alt={displayName}
              draggable={false}
            />
          ) : null}

          {hotspots.map((hotspot, index) => {
            const slot = HOTSPOT_SLOTS[index] ?? 'glaze';
            return (
              <button
                key={hotspot.id || `${hotspot.label}-${index}`}
                type="button"
                className={`${css.hotspot} ${css[slot]}`}
                aria-label={hotspot.label}
                onPointerDown={(event) => event.stopPropagation()}
                onClick={(event) => {
                  event.stopPropagation();
                  openHotspot(hotspot);
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  className={css.hotspotLotus}
                  src="/assets/brand/lotus-mark.png"
                  alt=""
                  width={22}
                  height={20}
                  draggable={false}
                />
              </button>
            );
          })}
        </div>

        {mediaList.length > 1 ? (
          <div className={css.viewMode} role="toolbar" aria-label={copy.viewLabel}>
            {mediaList.slice(0, 3).map((_, index) => (
              <button
                key={`mode-${index}`}
                type="button"
                className={modeIndex === index ? css.active : undefined}
                data-mode={MODE_LABELS[index]}
                onClick={() => {
                  setModeIndex(index);
                  resetView();
                }}
              >
                {MODE_LABELS[index]}
              </button>
            ))}
          </div>
        ) : null}

        <section className={css.heroCopy}>
          <div className={css.eyebrow}>{brandName}</div>
          <div className={css.titleRow}>
            <h1>{displayName}</h1>
            {productSlug ? (
              <ProductQrPanel
                slug={productSlug}
                productName={displayName}
                variant="popover"
                className={css.qrTrigger}
              />
            ) : null}
          </div>
          {productSubtitle && productSubtitle !== displayName ? <p>{productSubtitle}</p> : null}
        </section>

        {guideVisible ? (
          <div className={css.guide} id="guide">
            Kéo để xoay · Chạm hai ngón để zoom
          </div>
        ) : null}

        <div className={css.controls}>
          <button
            type="button"
            className={css.control}
            aria-label="Thu nhỏ"
            onClick={() => setZoom((value) => Math.max(0.84, value - 0.1))}
          >
            −
          </button>
          <button
            type="button"
            className={css.control}
            aria-label="Phóng to"
            onClick={() => setZoom((value) => Math.min(1.58, value + 0.1))}
          >
            +
          </button>
          <button
            type="button"
            className={`${css.control}${autoRotate ? ` ${css.active}` : ''}`}
            aria-label="Tự động chuyển động"
            onClick={() => setAutoRotate((value) => !value)}
          >
            ⟳
          </button>
          <button type="button" className={css.control} aria-label="Đặt lại" onClick={resetView}>
            ↺
          </button>
          <button
            type="button"
            className={css.control}
            aria-label={copy.fullscreen3dLabel || 'Toàn màn hình'}
            onClick={() => {
              void toggleFullscreen();
            }}
          >
            ⛶
          </button>
        </div>

        <div className={css.bottomBar}>
          {displayPrice ? (
            <p className={css.priceTag}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                className={css.priceLotus}
                src="/assets/brand/lotus-mark.png"
                alt=""
                width={40}
                height={36}
                draggable={false}
              />
              <span>{displayPrice}</span>
            </p>
          ) : null}
          <div className={css.bottomActions}>
            <button type="button" className={css.infoTrigger} onClick={openOverview}>
              {copy.productInfoLabel || 'Xem thông tin tác phẩm'}
            </button>
            <button
              type="button"
              className={css.orderTrigger}
              onClick={() => setCheckoutOpen(true)}
            >
              {actionLabel}
            </button>
          </div>
          <Link href={backHref} className={css.backLink}>
            <span aria-hidden="true">←</span>
            <span>{copy.backLabel || 'Quay lại danh mục'}</span>
          </Link>
        </div>
      </div>

      <div
        className={`${css.overlay}${panel ? ` ${css.show}` : ''}`}
        id="overlay"
        onClick={closePanel}
      />

      <aside
        className={`${css.sidebar}${panel ? ` ${css.open}` : ''}`}
        id="sidebar"
        aria-hidden={panel ? 'false' : 'true'}
      >
        <div className={css.sidebarHead}>
          <div>
            <small id="panelKicker">{panel?.kicker}</small>
            <h2 id="panelTitle">{panel?.title}</h2>
          </div>
          <button
            type="button"
            className={css.close}
            id="closePanel"
            aria-label="Đóng bảng thông tin"
            title="Đóng"
            onClick={closePanel}
          >
            <span className={css.closeMark} aria-hidden="true">×</span>
            <span className={css.closeLabel}>Đóng</span>
          </button>
        </div>

        <div className={css.sidebarBody} id="panelContent">
          {panel?.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img className={css.sidebarImage} src={panel.image} alt={panel.title} />
          ) : null}
          {panel?.lead && panel.kind !== 'hotspot' ? (
            <div
              className={`${css.sidebarLead} ${css.richHtml}`}
              dangerouslySetInnerHTML={{ __html: toRenderableRichHtml(panel.lead) }}
            />
          ) : null}

          {panel?.kind === 'overview' && (displayPrice || specEntries.length > 0) ? (
            <dl className={css.meta}>
              {displayPrice ? (
                <div className={css.metaRow}>
                  <dt>Giá</dt>
                  <dd>{displayPrice}</dd>
                </div>
              ) : null}
              {specEntries.map(([key, value]) => (
                <div className={css.metaRow} key={key}>
                  <dt>{key}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>
          ) : null}

          {panel?.kind === 'overview' && story?.content ? (
            <div className={css.block}>
              <h3>{story.title || copy.storyTitle}</h3>
              <div
                className={css.richHtml}
                dangerouslySetInnerHTML={{ __html: toRenderableRichHtml(story.content) }}
              />
            </div>
          ) : null}

          {panel?.kind === 'hotspot' && panel.hotspot?.panel?.content ? (
            <div className={css.block}>
              <h3>{panel.hotspot.panel.title || panel.hotspot.label}</h3>
              <div
                className={css.richHtml}
                dangerouslySetInnerHTML={{ __html: toRenderableRichHtml(panel.hotspot.panel.content) }}
              />
            </div>
          ) : null}
        </div>

        <div className={css.sidebarCta}>
          <button
            type="button"
            className={`${css.btn} ${css.btnPrimary}`}
            onClick={() => setCheckoutOpen(true)}
          >
            {actionLabel}
          </button>
          {hotline ? (
            <a className={css.phoneBtn} href={hotline} aria-label={copy.hotlineLabel || 'Gọi điện'}>
              ☎
            </a>
          ) : (
            <span className={css.phoneBtn} aria-hidden="true">
              ☎
            </span>
          )}
        </div>
      </aside>

      <CheckoutOrderModal
        open={checkoutOpen}
        onClose={() => setCheckoutOpen(false)}
        productId={productId}
        productName={displayName}
        productSlug={productSlug}
        unitPrice={unitPrice}
        priceLabel={displayPrice}
      />
    </div>
  );
}
