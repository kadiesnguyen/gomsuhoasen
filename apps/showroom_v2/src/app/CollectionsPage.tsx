import React from 'react';
import { ArrowRight } from 'lucide-react';
import { motion } from 'motion/react';
import { useShowroomData } from './data/ShowroomContext';
import type { ShowroomV2Data } from './data/adapter';
import Link from './mocks/next/link';
import { ArtFrame } from './ArtFrame';
import './collections-page.css';

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

function BentoDivider() {
  return (
    <div className="bento-divider">
      <LotusIcon size={12} />
    </div>
  );
}

type CollectionItem = ShowroomV2Data['collectionsRows']['row1'][number];

function BentoItem({
  item,
  index,
  ctaLabel,
  href,
}: {
  item: CollectionItem;
  index: number;
  ctaLabel: string;
  href: string;
}) {
  return (
    <Reveal delay={0.1 * index} className={`bento-item span-${item.span}`}>
      <div className="bento-item-bg">
        <img src={item.img} alt={item.title} />
      </div>
      <div className="bento-item-overlay"></div>
      <div className="bento-item-content">
        <div className="bento-item-content-inner">
          <h3 className="bento-title">{item.title}</h3>
          <BentoDivider />
          <p className="bento-desc">{item.desc}</p>
          <Link className="bento-link" href={href} aria-label={`${ctaLabel}: ${item.title}`}>
            {ctaLabel} <ArrowRight size={12} strokeWidth={1.5} />
          </Link>
        </div>
      </div>
    </Reveal>
  );
}

export function CollectionsPage() {
  const { collectionsRows, collectionsLanding } = useShowroomData();

  return (
    <div className="collections-page">
      <section className="collections-hero">
        <div className="collections-hero-bg">
          <img src={collectionsLanding.heroBg} alt={collectionsLanding.title} />
        </div>
        <div className="collections-hero-overlay"></div>
        <div className="collections-hero-content">
          <Reveal className="collections-hero-content-inner">
            <span className="collections-eyebrow">{collectionsLanding.eyebrow}</span>
            <h1 className="collections-hero-title">{collectionsLanding.title}</h1>
            <p className="collections-hero-desc">
              {collectionsLanding.desc}
            </p>
            <Link href={collectionsLanding.heroCtaHref} className="art-btn collections-cta">
              <ArtFrame />
              <span>{collectionsLanding.heroCtaLabel}</span>
              <ArrowRight size={14} strokeWidth={1.5} />
            </Link>
          </Reveal>
        </div>
      </section>

      <div id="collections-grid" className="bento-container">
        <section className="bento-row-a">
          {collectionsRows.row1.map((item, index) => (
            <BentoItem key={item.id ?? index} item={item} index={index} ctaLabel={collectionsLanding.tileCtaLabel} href={item.href} />
          ))}
        </section>

        <section className="bento-row-b">
          {collectionsRows.row2.map((item, index) => (
            <BentoItem key={item.id ?? index} item={item} index={index + 2} ctaLabel={collectionsLanding.tileCtaLabel} href={item.href} />
          ))}
        </section>

        <section className="bento-row-a">
          {collectionsRows.row3.map((item, index) => (
            <BentoItem key={item.id ?? index} item={item} index={index + 5} ctaLabel={collectionsLanding.tileCtaLabel} href={item.href} />
          ))}
        </section>
      </div>
    </div>
  );
}
