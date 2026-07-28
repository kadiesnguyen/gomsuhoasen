import React from 'react';
import { motion } from 'motion/react';
import { Droplet, Sun, Wind, CheckCircle, Package, Truck, Headset, Phone, MapPin, Facebook } from 'lucide-react';
import { useShowroomData } from './data/ShowroomContext';
import Link from './mocks/next/link';
import './products-page.css';

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
        <div className="poster-hero-zone" style={{ backgroundImage: `url(${productsLandingInfo.heroBg})`, backgroundSize: 'cover', backgroundPosition: 'center' }}>
          <div className="poster-overlay" />
          <Reveal className="poster-content-left">
            <div className="poster-logo-block">
              <LotusIcon size={32} />
              <div className="poster-logo-text">{brand.name}</div>
              <div className="poster-logo-sub">{homeLanding.logoSubtext}</div>
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
            <p style={{ whiteSpace: 'pre-wrap' }}>{productsLandingInfo.badgeText}</p>
          </Reveal>
        </div>

        <div className="poster-bottom-zone">
          <div className="poster-divider">
            <span>{productsLandingInfo.featuredSectionLabel}</span>
          </div>

          <div className="strip-featured">
            {productCategories.map((category, index) => (
              <Reveal key={category.id ?? index} delay={0.1 * index} className="strip-card">
                <Link
                  href={category.href || '/danh-muc-san-pham'}
                  className="strip-card-link"
                  aria-label={`Xem ${category.title}`}
                >
                  <img src={category.img} alt={category.title} />
                  <h4>{category.title}</h4>
                </Link>
              </Reveal>
            ))}
          </div>

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
              <LotusIcon size={24} />
              <div>
                <div className="contact-logo-text">{brand.name}</div>
                <div className="contact-logo-sub">{homeLanding.logoSubtext}</div>
              </div>
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
