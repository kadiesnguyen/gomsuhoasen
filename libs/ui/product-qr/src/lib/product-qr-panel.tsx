import { useEffect, useId, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  copyTextToClipboard,
  downloadDataUrl,
  generateProductQrDataUrl,
  normalizeProductSlug,
  productPublicUrl,
  productQrFilename,
} from './product-qr';
import css from './product-qr-panel.module.css';

export type ProductQrPanelProps = {
  slug: string;
  /** Explicit showroom origin (portal should pass VITE_SITE_URL). */
  siteOrigin?: string;
  productName?: string;
  /** `popover` = icon → centered modal (showroom); `card` = always-visible panel (admin). */
  variant?: 'popover' | 'card';
  className?: string;
};

export function ProductQrPanel({
  slug,
  siteOrigin,
  productName,
  variant = 'popover',
  className,
}: ProductQrPanelProps) {
  const normalizedSlug = normalizeProductSlug(slug);
  const link = productPublicUrl(normalizedSlug, siteOrigin);
  const panelId = useId();
  const titleId = useId();
  const [open, setOpen] = useState(variant === 'card');
  const [dataUrl, setDataUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');

  useEffect(() => {
    if (!normalizedSlug || !link) {
      setDataUrl('');
      return;
    }
    if (variant === 'popover' && !open) return;

    let cancelled = false;
    setBusy(true);
    setStatus('');
    void generateProductQrDataUrl(normalizedSlug, { siteOrigin, width: 280 })
      .then((url) => {
        if (!cancelled) setDataUrl(url);
      })
      .catch(() => {
        if (!cancelled) {
          setDataUrl('');
          setStatus('Không tạo được mã QR.');
        }
      })
      .finally(() => {
        if (!cancelled) setBusy(false);
      });

    return () => {
      cancelled = true;
    };
  }, [link, normalizedSlug, open, siteOrigin, variant]);

  useEffect(() => {
    if (variant !== 'popover' || !open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKey);
    };
  }, [open, variant]);

  if (!normalizedSlug || !link) return null;

  const onDownload = () => {
    if (!dataUrl) return;
    downloadDataUrl(dataUrl, productQrFilename(normalizedSlug));
    setStatus('Đã tải mã QR.');
  };

  const onCopy = async () => {
    const ok = await copyTextToClipboard(link);
    setStatus(ok ? 'Đã copy link sản phẩm.' : 'Không copy được link.');
  };

  const close = () => setOpen(false);

  const body = (
    <div className={css.body} id={panelId}>
      <div className={css.cardHeader}>
        <strong id={titleId}>Mã QR sản phẩm</strong>
        <span className={css.hint}>
          {productName ? productName : 'Quét để mở trang công khai'}
        </span>
      </div>
      <div className={css.previewWrap}>
        {busy && !dataUrl ? (
          <span className={css.placeholder}>Đang tạo QR…</span>
        ) : dataUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            className={css.preview}
            src={dataUrl}
            alt={productName ? `QR ${productName}` : 'Mã QR sản phẩm'}
            width={180}
            height={180}
          />
        ) : (
          <span className={css.placeholder}>{status || 'Chưa có QR'}</span>
        )}
      </div>
      <p className={css.link} title={link}>
        {link}
      </p>
      <div className={css.actions}>
        <button type="button" className={css.primaryBtn} onClick={onDownload} disabled={!dataUrl || busy}>
          Tải QR
        </button>
        <button type="button" className={css.secondaryBtn} onClick={() => void onCopy()}>
          Copy link
        </button>
      </div>
      {status ? (
        <p className={css.status} role="status">
          {status}
        </p>
      ) : null}
    </div>
  );

  if (variant === 'card') {
    return <div className={[css.card, className].filter(Boolean).join(' ')}>{body}</div>;
  }

  const modal =
    open && typeof document !== 'undefined'
      ? createPortal(
          <div
            className={css.modalRoot}
            role="presentation"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) close();
            }}
          >
            <div
              className={css.modalDialog}
              role="dialog"
              aria-modal="true"
              aria-labelledby={titleId}
              onMouseDown={(event) => event.stopPropagation()}
            >
              <button type="button" className={css.closeBtn} aria-label="Đóng" onClick={close}>
                ×
              </button>
              {body}
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <div className={[css.triggerRoot, className].filter(Boolean).join(' ')}>
      <button
        type="button"
        className={css.iconBtn}
        aria-label="Mã QR sản phẩm"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={(event) => {
          event.stopPropagation();
          setOpen(true);
        }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M4 4h6v6H4V4Zm10 0h6v6h-6V4ZM4 14h6v6H4v-6Zm10 2h2v2h-2v-2Zm4-2h2v2h-2v-2Zm-2 4h2v2h-2v-2Zm4 0h2v2h-2v-2Zm-4 4h2v2h-2v-2Zm4 0h2v2h-2v-2ZM6 6h2v2H6V6Zm10 0h2v2h-2V6ZM6 16h2v2H6v-2Z"
            fill="currentColor"
          />
        </svg>
        <span className={css.iconLabel}>Mã QR</span>
      </button>
      {modal}
    </div>
  );
}
