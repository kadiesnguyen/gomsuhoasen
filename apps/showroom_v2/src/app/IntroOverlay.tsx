'use client';

import { useEffect, useState } from 'react';
import css from './intro-overlay.module.css';
import { useShowroomData } from './data/ShowroomContext';

/**
 * Heritage Luxury Intro Overlay
 * Cinematic loading experience with multi-stage sequenced animation.
 *
 * Set DEV_HOLD=true below during development to freeze the overlay for debugging.
 */
const DEV_HOLD = false; // ← Toggle to `true` to freeze overlay for debug
const INTRO_SESSION_KEY = 'ghs_intro_seen';

function wasIntroShown(): boolean {
  try {
    return sessionStorage.getItem(INTRO_SESSION_KEY) === '1';
  } catch {
    return false;
  }
}

function rememberIntro(): void {
  try {
    sessionStorage.setItem(INTRO_SESSION_KEY, '1');
  } catch {
    // Storage can be unavailable in embedded browsers; the intro still completes normally.
  }
}

function shouldSkipIntro(): boolean {
  return wasIntroShown() ||
    (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
}

export function IntroOverlay({ onComplete }: { onComplete?: () => void }) {
  const { brand, homeLanding } = useShowroomData();
  const [stage, setStage] = useState<
    'motif' | 'brand' | 'tagline' | 'bar' | 'fade-out' | 'hidden'
  >(() => shouldSkipIntro() ? 'hidden' : 'motif');

  const completeIntro = () => {
    rememberIntro();
    setStage('hidden');
    onComplete?.();
  };

  useEffect(() => {
    if (DEV_HOLD || shouldSkipIntro()) return;

    const timers = [
      setTimeout(() => setStage('brand'), 600),
      setTimeout(() => setStage('tagline'), 1400),
      setTimeout(() => setStage('bar'), 2200),
      setTimeout(() => setStage('fade-out'), 3800),
      setTimeout(completeIntro, 4800),
    ];

    return () => timers.forEach(clearTimeout);
  }, [onComplete]);

  if (stage === 'hidden') return null;

  const isActive = (s: string) => {
    const order = ['motif', 'brand', 'tagline', 'bar', 'fade-out'];
    return order.indexOf(stage) >= order.indexOf(s);
  };

  return (
    <div className={`${css.overlay} ${stage === 'fade-out' ? css.fadeOut : ''}`} data-testid="intro-overlay">
      {/* Decorative corner flourishes */}
      <div className={`${css.cornerTL} ${css.corner}`} />
      <div className={`${css.cornerTR} ${css.corner}`} />
      <div className={`${css.cornerBL} ${css.corner}`} />
      <div className={`${css.cornerBR} ${css.corner}`} />

      {/* Ambient glow */}
      <div className={css.ambientGlow} />
      <button type="button" className={css.skipButton} onClick={completeIntro}>
        {homeLanding.introSkipLabel}
      </button>

      <div className={css.content}>
        {/* Lotus Motif — detailed, multi-layered */}
        <div className={`${css.motif} ${isActive('motif') ? css.show : ''}`}>
          <svg
            width="80"
            height="80"
            viewBox="0 0 100 100"
            fill="none"
            className={css.lotusSvg}
          >
            {/* Outer petals */}
            <path
              d="M50 8 C50 8, 25 35, 25 55 C25 75, 38 90, 50 95 C62 90, 75 75, 75 55 C75 35, 50 8, 50 8Z"
              stroke="var(--heritage-gold, #c4a550)"
              strokeWidth="0.8"
              className={css.petalOuter}
            />
            {/* Left petal */}
            <path
              d="M50 18 C50 18, 12 48, 15 68 C17 80, 30 90, 50 95"
              stroke="var(--heritage-gold, #c4a550)"
              strokeWidth="0.6"
              className={css.petalLeft}
              opacity="0.7"
            />
            {/* Right petal */}
            <path
              d="M50 18 C50 18, 88 48, 85 68 C83 80, 70 90, 50 95"
              stroke="var(--heritage-gold, #c4a550)"
              strokeWidth="0.6"
              className={css.petalRight}
              opacity="0.7"
            />
            {/* Inner detail */}
            <path
              d="M50 30 C50 30, 38 48, 38 58 C38 70, 44 80, 50 85 C56 80, 62 70, 62 58 C62 48, 50 30, 50 30Z"
              stroke="var(--heritage-gold, #c4a550)"
              strokeWidth="0.5"
              className={css.petalInner}
              opacity="0.4"
            />
            {/* Center dot */}
            <circle
              cx="50"
              cy="60"
              r="2"
              fill="var(--heritage-gold, #c4a550)"
              className={css.centerDot}
            />
          </svg>
        </div>

        {/* Decorative divider line */}
        <div className={`${css.divider} ${isActive('brand') ? css.show : ''}`}>
          <span className={css.dividerLine} />
          <span className={css.dividerDot} />
          <span className={css.dividerLine} />
        </div>

        {/* Brand name */}
        <div className={`${css.brand} ${isActive('brand') ? css.show : ''}`}>
          {brand.name}
        </div>

        {/* Tagline */}
        <div className={`${css.tagline} ${isActive('tagline') ? css.show : ''}`}>
          {brand.tagline}
        </div>

        {/* Loading bar */}
        <div className={`${css.loadingBar} ${isActive('bar') ? css.show : ''}`}>
          <div className={css.loadingProgress} />
        </div>
      </div>
    </div>
  );
}
