import { createElement, useEffect, useState, type CSSProperties } from 'react';
import { Box, ExternalLink, FileCode2, FileImage, FileText, Film, X } from 'lucide-react';
import { Button } from '@vt/ui-components';
import type { MediaPreviewKind } from '../utils/media-fields';
import { readMediaKindLabel } from './media-preview';

interface MediaLightboxModalProps {
  isOpen: boolean;
  kind: MediaPreviewKind;
  src?: string;
  title: string;
  subtitle?: string;
  onClose: () => void;
  onOpenExternal?: () => void;
}

const overlayStyle: CSSProperties = {
  position: 'fixed',
  inset: 0,
  zIndex: 1350,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 20,
};

const panelStyle: CSSProperties = {
  width: 'min(1080px, 100%)',
  height: 'min(760px, 92vh)',
  borderRadius: 18,
  background: '#fff',
  boxShadow: '0 28px 96px rgba(25, 23, 20, 0.3)',
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
  position: 'relative',
};

const badgeStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  fontSize: '0.72rem',
  fontWeight: 700,
  color: '#7b5e18',
  background: '#fff6dd',
  border: '1px solid #e9d8a6',
  padding: '4px 9px',
  borderRadius: 999,
};

function readKindIcon(kind: MediaPreviewKind) {
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

export function MediaLightboxModal({
  isOpen,
  kind,
  src,
  title,
  subtitle,
  onClose,
  onOpenExternal,
}: MediaLightboxModalProps) {
  const [modelViewerReady, setModelViewerReady] = useState(() => (
    typeof window !== 'undefined' && window.customElements?.get('model-viewer') !== undefined
  ));

  useEffect(() => {
    if (!isOpen) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen || kind !== 'model' || !src) return undefined;
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
  }, [isOpen, kind, src]);

  if (!isOpen) return null;

  const Icon = readKindIcon(kind);
  const showInlineFrame = src !== undefined && (kind === 'document' || kind === 'html');
  const showInlineMedia = src !== undefined && (kind === 'image' || kind === 'video');
  const showInlineModel = src !== undefined && kind === 'model' && modelViewerReady;
  const contentBackground = kind === 'model'
    ? 'radial-gradient(circle at 50% 28%, rgba(198, 165, 111, 0.14), rgba(18, 14, 10, 0.98) 72%)'
    : 'linear-gradient(180deg, #fbf7ef 0%, #f3ead8 100%)';

  return (
    <div
      style={overlayStyle}
      role="dialog"
      aria-modal="true"
      aria-labelledby="media-lightbox-title"
      data-testid="media-lightbox-modal"
    >
      <div
        style={{ position: 'absolute', inset: 0, background: 'rgba(25, 23, 20, 0.66)' }}
        onClick={onClose}
      />

      <div style={panelStyle}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            gap: 16,
            alignItems: 'flex-start',
            padding: '18px 22px',
            borderBottom: '1px solid #eee7d8',
            background: '#fffdf8',
          }}
        >
          <div style={{ minWidth: 0 }}>
            <div style={badgeStyle}>
              <Icon size={15} />
              {readMediaKindLabel(kind)}
            </div>
            <h2
              id="media-lightbox-title"
              style={{
                margin: '10px 0 0',
                fontSize: '1.2rem',
                color: '#191714',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {title}
            </h2>
            {subtitle ? (
              <div
                style={{
                  marginTop: 6,
                  fontSize: '0.82rem',
                  color: '#7b7266',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {subtitle}
              </div>
            ) : null}
          </div>

          <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
            {onOpenExternal ? (
              <Button variant="secondary" size="sm" type="button" onClick={onOpenExternal}>
                <ExternalLink size={14} />
                Mở tab mới
              </Button>
            ) : null}
            <button
              type="button"
              onClick={onClose}
              aria-label="Đóng xem trước media"
              data-testid="media-lightbox-close"
              style={{
                width: 36,
                height: 36,
                borderRadius: 999,
                border: '1px solid #e6dcc8',
                background: '#fff',
                color: '#6b6254',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
            >
              <X size={16} />
            </button>
          </div>
        </div>

        <div
          style={{
            flex: 1,
            background: contentBackground,
            display: 'grid',
            placeItems: 'center',
            padding: 24,
            overflow: 'hidden',
          }}
        >
          {showInlineMedia ? (
            kind === 'image' ? (
              <img
                src={src}
                alt={title}
                style={{
                  maxWidth: '100%',
                  maxHeight: '100%',
                  objectFit: 'contain',
                  borderRadius: 16,
                  boxShadow: '0 18px 48px rgba(25, 23, 20, 0.18)',
                  background: '#fff',
                }}
              />
            ) : (
              <video
                src={src}
                controls
                playsInline
                style={{
                  maxWidth: '100%',
                  maxHeight: '100%',
                  borderRadius: 16,
                  boxShadow: '0 18px 48px rgba(25, 23, 20, 0.18)',
                  background: '#111',
                }}
              />
            )
          ) : showInlineModel ? (
            <div
              style={{
                width: '100%',
                height: '100%',
                borderRadius: 18,
                overflow: 'hidden',
                border: '1px solid rgba(233, 223, 207, 0.24)',
                boxShadow: '0 18px 48px rgba(7, 6, 5, 0.32)',
                background: 'radial-gradient(circle at 50% 28%, rgba(231, 205, 162, 0.12), rgba(14, 11, 8, 0.96) 72%)',
              }}
            >
              {createElement('model-viewer', {
                src,
                alt: title,
                loading: 'eager',
                'camera-controls': '',
                'interaction-prompt': 'auto',
                'auto-rotate': '',
                'auto-rotate-delay': '1200',
                'shadow-intensity': '0',
                exposure: '0.92',
                'environment-image': 'neutral',
                style: {
                  width: '100%',
                  height: '100%',
                  background: 'transparent',
                },
              } as Record<string, unknown>)}
            </div>
          ) : showInlineFrame ? (
            <iframe
              title={title}
              src={src}
              style={{
                width: '100%',
                height: '100%',
                border: '1px solid #e9dfcf',
                borderRadius: 16,
                background: '#fff',
              }}
            />
          ) : (
            <div
              style={{
                width: 'min(520px, 100%)',
                background: '#fff',
                border: '1px solid #eadfcd',
                borderRadius: 18,
                padding: 28,
                display: 'grid',
                gap: 14,
                justifyItems: 'center',
                textAlign: 'center',
                boxShadow: '0 14px 40px rgba(25, 23, 20, 0.12)',
              }}
            >
              <div
                style={{
                  width: 72,
                  height: 72,
                  borderRadius: 999,
                  background: '#fff6dd',
                  color: '#7b5e18',
                  display: 'grid',
                  placeItems: 'center',
                }}
              >
                <Icon size={30} />
              </div>
              <div style={{ fontSize: '1rem', fontWeight: 700, color: '#191714' }}>
                {kind === 'model' ? 'Tệp 3D cần trình xem chuyên dụng' : 'Không có bản xem trước trực tiếp'}
              </div>
              <div style={{ fontSize: '0.88rem', lineHeight: 1.6, color: '#746a5c' }}>
                {kind === 'model'
                  ? 'Bạn có thể mở tệp trong tab mới để kiểm tra chi tiết bằng trình xem phù hợp.'
                  : 'Loại tệp này hiện chưa có chế độ xem lớn ngay trong portal.'}
              </div>
              {onOpenExternal ? (
                <Button variant="primary" type="button" onClick={onOpenExternal}>
                  <ExternalLink size={14} />
                  Mở trong tab mới
                </Button>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
