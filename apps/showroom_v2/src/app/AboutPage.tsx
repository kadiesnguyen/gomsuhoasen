import React from 'react';
import { ArrowRight, Mountain, Droplet, Flame, Aperture } from 'lucide-react';
import { motion } from 'motion/react';
import { useShowroomData } from './data/ShowroomContext';
import Link from './mocks/next/link';
import { ArtFrame } from './ArtFrame';
import './about-page.css';

function LotusIcon({ size = 22 }: { size?: number }) {
  return (
    <img
      src="/assets/brand/lotus-mark.png"
      alt=""
      width={size}
      height={size}
      className="element-lotus-img"
      draggable={false}
      aria-hidden="true"
    />
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
  mountain: <Mountain size={20} strokeWidth={1.5} />,
  lotus: <LotusIcon size={20} />,
  droplet: <Droplet size={20} strokeWidth={1.5} />,
  flame: <Flame size={20} strokeWidth={1.5} />,
  aperture: <Aperture size={20} strokeWidth={1.5} />,
};

export function AboutPage() {
  const { aboutElements, aboutLanding } = useShowroomData();

  return (
    <div className="about-page">
      <section className="about-hero">
        <Reveal className="about-hero-left">
          <span className="about-eyebrow">{aboutLanding.eyebrow}</span>
          <h1 className="about-hero-title title-balanced">{aboutLanding.title}</h1>
          <p className="about-hero-desc">
            {aboutLanding.desc}
          </p>
          <Link href={aboutLanding.heroCtaHref} className="art-btn about-cta">
            <ArtFrame />
            <span>{aboutLanding.heroCtaLabel}</span>
            <ArrowRight size={14} strokeWidth={1.5} />
          </Link>
        </Reveal>

        <Reveal delay={0.2} className="about-hero-center">
          <img src={aboutLanding.heroBg} alt={aboutLanding.heroImageAlt} />
        </Reveal>

        <Reveal delay={0.4} className="about-hero-right">
          <div
            className="about-quote-box"
            style={{ backgroundImage: `url(${aboutLanding.quoteBg})`, backgroundSize: 'cover', backgroundPosition: 'center', position: 'relative', overflow: 'hidden' }}
          >
            <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 1 }}></div>
            <div style={{ position: 'relative', zIndex: 2 }}>
              <div className="about-quote-mark">“</div>
              <div className="about-quote-text">
                {aboutLanding.quoteText}
              </div>
              <div style={{ marginTop: '12px', fontSize: '13px', fontStyle: 'italic', color: '#cbb279' }}>
                — {aboutLanding.quoteAuthor}
              </div>
              <div className="about-quote-icon">
                <LotusIcon size={24} />
              </div>
            </div>
          </div>
        </Reveal>
      </section>

      <section id="ngu-hanh" className="elements-section">
        <div
          className="elements-carousel"
          role="region"
          aria-roledescription="carousel"
          aria-label="Ngũ hành gốm Việt"
        >
          <div className="elements-grid">
            {aboutElements.map((el, idx) => (
              <Reveal delay={0.1 * idx} key={el.id} className="element-card-shell">
                <article className={`element-card ${el.isActive ? 'is-active' : ''}`}>
                  <ArtFrame />
                  <div className="element-image">
                    <img src={el.img} alt={el.title} loading="lazy" decoding="async" />
                  </div>
                  <div className="element-icon-wrapper">
                    <div className="element-icon">
                      {ICON_MAP[el.iconType]}
                    </div>
                  </div>
                  <h3 className="element-title">{el.title}</h3>
                  <p className="element-desc">{el.desc}</p>
                </article>
              </Reveal>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
