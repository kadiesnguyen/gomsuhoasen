import React from 'react';
import { ArrowRight, Mountain, Droplet, Flame, Aperture } from 'lucide-react';
import { motion } from 'motion/react';
import { useShowroomData } from './data/ShowroomContext';
import Link from './mocks/next/link';
import './about-page.css';

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
          <h1 className="about-hero-title" style={{ whiteSpace: 'pre-wrap' }}>{aboutLanding.title}</h1>
          <p className="about-hero-desc">
            {aboutLanding.desc}
          </p>
          <Link href={aboutLanding.heroCtaHref} className="about-cta">
            {aboutLanding.heroCtaLabel} <ArrowRight size={14} strokeWidth={1.5} />
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
        <div className="elements-grid">
          {aboutElements.map((el, idx) => (
            <Reveal delay={0.1 * idx} key={el.id} className="element-card-shell">
              <div className={`element-card ${el.isActive ? 'is-active' : ''}`}>
                <div className="element-image">
                  <img src={el.img} alt={el.title} />
                </div>
                <div className="element-icon-wrapper">
                  <div className="element-icon">
                    {ICON_MAP[el.iconType]}
                  </div>
                </div>
                <h3 className="element-title">{el.title}</h3>
                <p className="element-desc">{el.desc}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>
    </div>
  );
}
