'use client';

import { useEffect, useState } from 'react';
import css from './intro-overlay.module.css';
import { useShowroomData } from './data/ShowroomContext';

/**
 * Heritage Luxury Intro Overlay — emblem-only 2D bloom reveal.
 *
 * Set DEV_HOLD=true to freeze the overlay for debugging.
 * Append ?intro=1 to force show even if already seen this session.
 */
const DEV_HOLD = false;
const INTRO_SESSION_KEY = 'ghs_intro_seen_v2';

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

function forceIntroFromQuery(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return new URLSearchParams(window.location.search).get('intro') === '1';
  } catch {
    return false;
  }
}

function shouldSkipIntro(): boolean {
  if (forceIntroFromQuery()) return false;
  return (
    wasIntroShown() ||
    (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  );
}

export function IntroOverlay({ onComplete }: { onComplete?: () => void }) {
  const { brand } = useShowroomData();
  const [stage, setStage] = useState<
    'logo' | 'glow' | 'bar' | 'fade-out' | 'hidden'
  >(() => (shouldSkipIntro() ? 'hidden' : 'logo'));

  const completeIntro = () => {
    rememberIntro();
    setStage('hidden');
    onComplete?.();
  };

  useEffect(() => {
    if (DEV_HOLD || shouldSkipIntro()) return;

    const timers = [
      setTimeout(() => setStage('glow'), 900),
      setTimeout(() => setStage('bar'), 2100),
      setTimeout(() => setStage('fade-out'), 3900),
      setTimeout(completeIntro, 4900),
    ];

    return () => timers.forEach(clearTimeout);
  }, [onComplete]);

  if (stage === 'hidden') return null;

  const isActive = (s: string) => {
    const order = ['logo', 'glow', 'bar', 'fade-out'];
    return order.indexOf(stage) >= order.indexOf(s);
  };

  return (
    <div
      className={`${css.overlay} ${stage === 'fade-out' ? css.fadeOut : ''}`}
      data-testid="intro-overlay"
      role="status"
      aria-label={`Đang tải ${brand.name}`}
    >
      <div className={`${css.cornerTL} ${css.corner}`} />
      <div className={`${css.cornerTR} ${css.corner}`} />
      <div className={`${css.cornerBL} ${css.corner}`} />
      <div className={`${css.cornerBR} ${css.corner}`} />

      <div className={`${css.ambientGlow} ${isActive('glow') ? css.ambientGlowHot : ''}`} />

      <div className={css.content}>
        <div className={`${css.logoWrap} ${isActive('logo') ? css.show : ''}`}>
          <div className={`${css.logoAura} ${isActive('glow') ? css.logoAuraPulse : ''}`} aria-hidden="true" />
          <img
            src="/assets/brand/logo-intro.png?v=20260810c"
            alt={brand.name}
            className={css.logoImg}
            width={340}
            height={219}
          />
          <span className={`${css.shimmer} ${isActive('glow') ? css.shimmerRun : ''}`} aria-hidden="true" />
        </div>

        <div className={`${css.loadingBar} ${isActive('bar') ? css.show : ''}`}>
          <div className={css.loadingProgress} />
        </div>
      </div>
    </div>
  );
}
