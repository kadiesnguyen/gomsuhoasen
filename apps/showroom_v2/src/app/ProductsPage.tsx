import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { Droplet, Sun, Wind, CheckCircle, Package, Truck, Headset, Phone, MapPin, Facebook, ChevronLeft, ChevronRight } from 'lucide-react';
import { useShowroomData } from './data/ShowroomContext';
import Link from './mocks/next/link';
import './products-page.css';

/** Always carousel: ~3 cards visible per row (mobile + desktop). */
const CATEGORY_VISIBLE = 3;

function LotusIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" aria-hidden="true">
      <path d="M32 54C24 45 18 37 18 29C18 20 25 14 32 8C39 14 46 20 46 29C46 37 40 45 32 54Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M32 54C27 44 25 36 27 28C28.5 21 32 15 32 15C32 15 35.5 21 37 28C39 36 37 44 32 54Z" stroke="currentColor" strokeWidth="1.1" strokeLinejoin="round" />
      <path d="M31 52C19 48 10 41 8 31C18 31 27 37 31 52Z" stroke="currentColor" strokeWidth="1.1" strokeLinejoin="round" />
      <path d="M33 52C45 48 54 41 56 31C46 31 37 37 33 52Z" stroke="currentColor" strokeWidth="1.1" strokeLinejoin="round" />
      <path d="M23 44C13 43 7 38 4 29C13 27 22 32 27 43" stroke="currentColor" strokeWidth="1.1" strokeLinejoin="round" />
      <path d="M41 44C51 43 57 38 60 29C51 27 42 32 37 43" stroke="currentColor" strokeWidth="1.1" strokeLinejoin="round" />
    </svg>
  );
}

const E = [0.22, 1, 0.36, 1] as const;
const fadeUp = { hidden: { opacity: 0, y: 28 }, show: { opacity: 1, y: 0 } };

function Reveal({ children, delay = 0, className = '' }: { children: React.ReactNode; delay?: number; className?: string }) {
  return (
    <motion.div variants={fadeUp} initial="show" animate="show" transition={{ duration: 1.0, ease: E, delay }} className={className}>
      {children}
    </motion.div>
  );
}

const ICON_MAP: Record<string, React.ReactNode> = {
  lotus: <LotusIcon size={20} />,
  wind: <Wind size={20} strokeWidth={1.5} />,
  droplet: <Droplet size={20} strokeWidth={1.5} />,
  sun: <Sun size={20} strokeWidth={1.5} />,
  check: <CheckCircle size={20} strokeWidth={1.5} />,
  package: <Package size={20} strokeWidth={1.5} />,
  truck: <Truck size={20} strokeWidth={1.5} />,
  headset: <Headset size={20} strokeWidth={1.5} />,
};

function CategoryStrip({
  categories,
}: {
  categories: Array<{ id?: string; title: string; img: string; href?: string }>;
}) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const useCarousel = categories.length > CATEGORY_VISIBLE;
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);

  const syncScrollState = () => {
    const node = scrollerRef.current;
    if (!node) return;
    setCanScrollPrev(node.scrollLeft > 4);
    setCanScrollNext(node.scrollLeft + node.clientWidth < node.scrollWidth - 4);
  };

  useEffect(() => {
    const node = scrollerRef.current;
    if (!node) return;
    syncScrollState();
    node.addEventListener('scroll', syncScrollState, { passive: true });
    window.addEventListener('resize', syncScrollState);
    return () => {
      node.removeEventListener('scroll', syncScrollState);
      window.removeEventListener('resize', syncScrollState);
    };
  }, [categories.length]);

  const scrollByCard = (direction: -1 | 1) => {
    const node = scrollerRef.current;
    if (!node) return;
    const card = node.querySelector<HTMLElement>('.strip-card');
    const delta = (card?.offsetWidth ?? 220) + 12;
    node.scrollBy({ left: direction * delta, behavior: 'smooth' });
  };

  return (
    <div className={`strip-featured-wrap is-carousel${useCarousel ? '' : ' is-static'}`}>
      {useCarousel && (
        <button
          type="button"
          className="strip-nav strip-nav-prev"
          aria-label="Danh mục trước"
          disabled={!canScrollPrev}
          onClick={() => scrollByCard(-1)}
        >
          <ChevronLeft size={18} />
        </button>
      )}
      <div
        ref={scrollerRef}
        className="strip-featured is-carousel"
        role="region"
        aria-roledescription="carousel"
        aria-label="Danh mục sản phẩm"
      >
        {categories.map((category, index) => (
          <Reveal key={category.id ?? index} delay={0.08 * Math.min(index, 5)} className="strip-card">
            <Link
              href={category.href || '/danh-muc'}
              className="strip-card-link"
              aria-label={`Xem ${category.title}`}
            >
              <img src={category.img} alt={category.title} loading="lazy" decoding="async" />
              <h4>{category.title}</h4>
            </Link>
          </Reveal>
        ))}
      </div>
      {useCarousel && (
        <button
          type="button"
          className="strip-nav strip-nav-next"
          aria-label="Danh mục tiếp"
          disabled={!canScrollNext}
          onClick={() => scrollByCard(1)}
        >
          <ChevronRight size={18} />
        </button>
      )}
    </div>
  );
}

export function ProductsPage() {
  const {
    brand,
    homeLanding,
    productCategories,
    productFeatures,
    trustBadges,
    productsLandingInfo,
    contactLanding,
  } = useShowroomData();
  const phoneHref = brand.phone ? `tel:${brand.phone.replace(/[^\d+]/g, '')}` : '';
  const mapHref = contactLanding.mapCtaHref?.trim() ?? '';
  const facebookHref = brand.facebookHref?.trim() ?? '';

  return (
    <div className="products-page">
      <div className="poster-canvas">
        <div className="poster-canvas-bottom-corners"></div>
        <div
          className="poster-hero-zone"
          style={{ ['--poster-hero-bg' as string]: `url(${productsLandingInfo.heroBg})` }}
        >
          <Reveal className="poster-content-left">
            <div className="poster-logo-block">
              <img
                src="/assets/brand/logo.png"
                alt={`${brand.name} — ${homeLanding.logoSubtext}`}
                className="poster-logo-img"
                width={320}
                height={76}
              />
            </div>

            <h1 className="poster-title">{productsLandingInfo.title}</h1>
            <h2 className="poster-subtitle">{productsLandingInfo.subtitle}</h2>
            <p className="poster-desc">
              {productsLandingInfo.desc}
            </p>

            <div className="poster-features">
              {productFeatures.map((feature, index) => (
                <div key={index} className="poster-feature-item">
                  <div className="poster-feature-icon">{ICON_MAP[feature.iconType]}</div>
                  <div className="poster-feature-text">
                    <h4>{feature.title}</h4>
                    <p>{feature.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </Reveal>

          <Reveal delay={0.4} className="poster-badge-right">
            <LotusIcon size={28} />
            <p className="script-text" style={{ whiteSpace: 'pre-line' }}>{productsLandingInfo.badgeText}</p>
          </Reveal>
        </div>

        <div className="poster-bottom-zone">
          <div className="poster-divider">
            <span>{productsLandingInfo.featuredSectionLabel}</span>
          </div>

          <CategoryStrip categories={productCategories} />

          <div className="strip-trust">
            {trustBadges.map((badge, index) => (
              <Reveal key={index} delay={0.1 * index} className="trust-cell">
                <div className="trust-icon">{ICON_MAP[badge.iconType]}</div>
                <div className="trust-info">
                  <h4>{badge.title}</h4>
                  <p>{badge.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>

          <div className="strip-contact">
            <div className="contact-logo">
              <img
                src="/assets/brand/logo.png"
                alt={brand.name}
                className="contact-logo-img"
                width={210}
                height={50}
              />
            </div>

            {phoneHref ? (
              <a className="contact-item" href={phoneHref}>
                <Phone size={18} className="contact-icon" />
                <span>{brand.phone}</span>
              </a>
            ) : (
              <div className="contact-item" aria-disabled="true">
                <Phone size={18} className="contact-icon" />
                <span>{brand.phone}</span>
              </div>
            )}

            {mapHref ? (
              <a className="contact-item" href={mapHref} target="_blank" rel="noreferrer">
                <MapPin size={18} className="contact-icon" />
                <span>{brand.location}</span>
              </a>
            ) : (
              <div className="contact-item" aria-disabled="true">
                <MapPin size={18} className="contact-icon" />
                <span>{brand.location}</span>
              </div>
            )}

            {facebookHref ? (
              <a className="contact-item" href={facebookHref} target="_blank" rel="noreferrer">
                <Facebook size={18} className="contact-icon" />
                <span>{brand.name}</span>
              </a>
            ) : (
              <div className="contact-item">
                <Facebook size={18} className="contact-icon" />
                <span>{brand.name}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
