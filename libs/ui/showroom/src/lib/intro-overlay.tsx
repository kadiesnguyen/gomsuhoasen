'use client';

import { useEffect, useState } from 'react';
import css from './intro-overlay.module.css';

/**
 * Heritage Luxury Intro Overlay
 * Cinematic loading experience with multi-stage sequenced animation.
 *
 * Set DEV_HOLD=true below during development to freeze the overlay for debugging.
 */
const DEV_HOLD = false; // ← Toggle to `true` to freeze overlay for debug

export function IntroOverlay({ onComplete }: { onComplete?: () => void }) {
  const [stage, setStage] = useState<
    'motif' | 'brand' | 'tagline' | 'bar' | 'fade-out' | 'hidden'
  >('motif');

  useEffect(() => {
    if (DEV_HOLD) return;

    const timers = [
      setTimeout(() => setStage('brand'), 600),
      setTimeout(() => setStage('tagline'), 1400),
      setTimeout(() => setStage('bar'), 2200),
      setTimeout(() => setStage('fade-out'), 3800),
      setTimeout(() => {
        setStage('hidden');
        if (onComplete) onComplete();
      }, 4800),
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

      <div className={css.content}>
        {/* Brand mark */}
        <div className={`${css.motif} ${isActive('motif') ? css.show : ''}`}>
          <img
            src="/assets/brand/lotus-mark.png"
            alt=""
            width={80}
            height={80}
            className={css.lotusSvg}
            draggable={false}
            aria-hidden="true"
          />
        </div>

        {/* Decorative divider line */}
        <div className={`${css.divider} ${isActive('brand') ? css.show : ''}`}>
          <span className={css.dividerLine} />
          <span className={css.dividerDot} />
          <span className={css.dividerLine} />
        </div>

        {/* Brand name */}
        <div className={`${css.brand} ${isActive('brand') ? css.show : ''}`}>
          Gốm Hoa Sen
        </div>

        {/* Tagline */}
        <div className={`${css.tagline} ${isActive('tagline') ? css.show : ''}`}>
          Tinh hoa men Việt — Từ 1984
        </div>

        {/* Loading bar */}
        <div className={`${css.loadingBar} ${isActive('bar') ? css.show : ''}`}>
          <div className={css.loadingProgress} />
        </div>
      </div>
    </div>
  );
}
