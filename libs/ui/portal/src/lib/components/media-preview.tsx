import { createElement, useEffect, useState, type CSSProperties } from 'react';
import { Box, FileCode2, FileImage, FileText, Film } from 'lucide-react';
import type { MediaPreviewKind } from '../utils/media-fields';

interface MediaPreviewSurfaceProps {
  kind: MediaPreviewKind;
  src?: string;
  title: string;
  aspectRatio?: string;
  radius?: number;
  minHeight?: number;
  fit?: 'contain' | 'cover';
  padding?: number;
  background?: string;
  fallbackText?: string;
}

export function readMediaKindLabel(kind: MediaPreviewKind): string {
  switch (kind) {
    case 'image':
      return 'Ảnh';
    case 'video':
      return 'Video';
    case 'document':
      return 'Tài liệu';
    case 'model':
      return '3D';
    case 'html':
      return 'HTML';
    default:
      return 'Tệp';
  }
}

function readMediaKindIcon(kind: MediaPreviewKind) {
  switch (kind) {
    case 'image':
      return FileImage;
    case 'video':
      return Film;
    case 'document':
      return FileText;
    case 'model':
      return Box;
    case 'html':
      return FileCode2;
    default:
      return FileText;
  }
}

export function MediaPreviewSurface({
  kind,
  src,
  title,
  aspectRatio = '4 / 3',
  radius = 14,
  minHeight = 120,
  fit = 'contain',
  padding = fit === 'contain' ? 12 : 0,
  background = 'linear-gradient(180deg, #fbf7ef 0%, #f2e6cd 100%)',
  fallbackText,
}: MediaPreviewSurfaceProps) {
  const [hasError, setHasError] = useState(false);
  const [modelViewerReady, setModelViewerReady] = useState(() => (
    typeof window !== 'undefined' && window.customElements?.get('model-viewer') !== undefined
  ));

  useEffect(() => {
    setHasError(false);
  }, [kind, src]);

  useEffect(() => {
    if (kind !== 'model' || !src) return undefined;
    if (typeof window !== 'undefined' && window.customElements?.get('model-viewer') !== undefined) {
      setModelViewerReady(true);
      return undefined;
    }

    let cancelled = false;
    void import('@google/model-viewer')
      .then(() => {
        if (!cancelled) setModelViewerReady(true);
      })
      .catch(() => {
        if (!cancelled) setModelViewerReady(false);
      });

    return () => {
      cancelled = true;
    };
  }, [kind, src]);

  const shellBackground = kind === 'model'
    ? 'radial-gradient(circle at 50% 34%, rgba(224, 195, 145, 0.18), rgba(23, 18, 13, 0.96) 72%)'
    : background;

  const shellStyle: CSSProperties = {
    width: '100%',
    minHeight,
    aspectRatio,
    borderRadius: radius,
    overflow: 'hidden',
    display: 'grid',
    placeItems: 'center',
    background: shellBackground,
  };

  if (!hasError && (kind === 'image' || kind === 'video') && src) {
    const mediaStyle: CSSProperties = {
      width: '100%',
      height: '100%',
      objectFit: fit,
      padding,
      boxSizing: 'border-box',
      display: 'block',
      background: 'transparent',
    };

    return (
      <div style={shellStyle}>
        {kind === 'image' ? (
          <img src={src} alt={title} style={mediaStyle} onError={() => setHasError(true)} />
        ) : (
          <video
            src={src}
            muted
            playsInline
            preload="metadata"
            style={mediaStyle}
            onError={() => setHasError(true)}
          />
        )}
      </div>
    );
  }

  if (kind === 'model' && src && modelViewerReady) {
    return (
      <div style={shellStyle}>
        {createElement('model-viewer', {
          src,
          alt: title,
          loading: 'lazy',
          'camera-controls': '',
          'interaction-prompt': 'none',
          'auto-rotate': '',
          'shadow-intensity': '0',
          exposure: '0.9',
          'environment-image': 'neutral',
          style: {
            width: '100%',
            height: '100%',
            pointerEvents: 'none',
            background: 'transparent',
          },
        } as Record<string, unknown>)}
      </div>
    );
  }

  if (fallbackText) {
    return (
      <div style={{ ...shellStyle, color: '#7b5e18' }}>
        <span style={{ fontSize: '1.25rem', fontWeight: 700, lineHeight: 1 }}>
          {fallbackText}
        </span>
      </div>
    );
  }

  const Icon = readMediaKindIcon(kind);

  return (
    <div style={{ ...shellStyle, color: '#7b5e18' }}>
      <div style={{ display: 'grid', justifyItems: 'center', gap: 8 }}>
        <Icon size={30} strokeWidth={1.8} />
        <span style={{ fontSize: '0.74rem', fontWeight: 700, letterSpacing: '0.04em' }}>
          {readMediaKindLabel(kind).toUpperCase()}
        </span>
      </div>
    </div>
  );
}
