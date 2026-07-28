import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api, apiAssetUrl, type QuoteApi } from '../services/api';
import { mergeApiErrorMessage } from '../services/api-error';
import { Button } from '@vt/ui-components';
import { useToast } from '../components/toast';
import { useConfirm } from '../components/confirm-dialog';
import { LoadErrorState } from '../components/load-error-state';
import { MediaLightboxModal } from '../components/media-lightbox-modal';
import { formatVnd as money } from '@gomhoasen/contracts';
import { readDisplayText, readOptionalDisplayText } from '../utils/display-normalization';



export function QuoteDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { confirm } = useConfirm();
  const [quote, setQuote] = useState<QuoteApi | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPdfPreviewOpen, setIsPdfPreviewOpen] = useState(false);

  const reload = () => {
    if (!id) return;
    setLoading(true);
    setLoadError('');
    api.quote.get(id)
      .then(setQuote)
      .catch((err) => setLoadError(mergeApiErrorMessage('Không tải được báo giá', err)))
      .finally(() => setLoading(false));
  };

  useEffect(reload, [id]);

  const generatePdf = async () => {
    if (!id) return;
    setBusy(true); setError(null);
    try {
      setQuote(await api.quote.generatePdf(id));
      toast('Đã tạo PDF báo giá.', 'success');
    } catch (err) {
      const message = mergeApiErrorMessage('Tạo PDF thất bại', err);
      setError(message);
      toast(message, 'error');
    } finally { setBusy(false); }
  };

  const sendQuote = async () => {
    if (!id) return;
    setBusy(true); setError(null);
    try {
      setQuote(await api.quote.send(id));
      toast('Đã gửi báo giá qua email.', 'success');
    } catch (err) {
      const message = mergeApiErrorMessage('Gửi email thất bại', err);
      setError(message);
      toast(message, 'error');
    } finally { setBusy(false); }
  };

  const requestSendQuote = () => {
    confirm({
      title: 'Gửi báo giá?',
      description: 'Email báo giá sẽ được gửi cho khách hàng kèm file PDF nếu SMTP đã cấu hình.',
      confirmLabel: 'Gửi email',
      variant: 'warning',
      onConfirm: sendQuote,
    });
  };

  if (loading) return <div style={{ padding: 48, color: '#999', textAlign: 'center' }}>Đang tải...</div>;
  if (loadError) return <LoadErrorState message={loadError} onRetry={reload} />;
  if (!quote) return <LoadErrorState message="Không tìm thấy báo giá." onRetry={reload} />;
  const pdfUrl = readOptionalDisplayText(quote.pdfUrl);
  const pdfPreviewUrl = pdfUrl === undefined ? '' : apiAssetUrl(pdfUrl);

  return (
    <div>
      <MediaLightboxModal
        isOpen={isPdfPreviewOpen && Boolean(pdfPreviewUrl)}
        kind="document"
        src={pdfPreviewUrl || undefined}
        title={`Báo giá ${quote.code}`}
        subtitle={pdfUrl ?? undefined}
        onClose={() => setIsPdfPreviewOpen(false)}
        onOpenExternal={
          pdfPreviewUrl
            ? () => window.open(pdfPreviewUrl, '_blank', 'noopener,noreferrer')
            : undefined
        }
      />
      <div className="ghs-page-header">
        <div>
          <h1>{quote.code}</h1>
          <p>{quote.customerName} · {quote.customerPhone} · {readDisplayText(quote.customerEmail, 'chưa có email')}</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button variant="secondary" onClick={() => navigate('/admin/quotes')}>Danh sách</Button>
          <Button variant="secondary" onClick={() => navigate(`/admin/quotes/${quote.id}/edit`)}>Sửa</Button>
          <Button variant="secondary" onClick={generatePdf} isLoading={busy}>{quote.pdfUrl ? 'Tạo lại PDF' : 'Tạo PDF'}</Button>
          {pdfPreviewUrl && (
            <Button
              variant="secondary"
              onClick={() => setIsPdfPreviewOpen(true)}
              type="button"
              data-testid="quote-pdf-preview-button"
            >
              Xem PDF
            </Button>
          )}
          <Button className="ghs-btn ghs-btn-primary" variant="primary" onClick={requestSendQuote} isLoading={busy}>Gửi email</Button>
        </div>
      </div>
      {error && <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 12, padding: '10px 14px', color: '#b91c1c', marginBottom: 16 }}>{error}</div>}
      <div className="ghs-card">
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
          <thead><tr style={{ textAlign: 'left', borderBottom: '1px solid #eee' }}><th style={{ padding: 10 }}>Sản phẩm</th><th style={{ padding: 10 }}>Tùy chỉnh</th><th style={{ padding: 10 }}>SL</th><th style={{ padding: 10 }}>Đơn giá</th><th style={{ padding: 10 }}>Thành tiền</th></tr></thead>
          <tbody>{quote.items.map((item, idx) => <tr key={idx} style={{ borderBottom: '1px solid #f5f3ee' }}><td style={{ padding: 10 }}>{item.productName}<br /><span style={{ color: '#888', fontSize: '0.8rem' }}>{item.glaze} {item.size}</span></td><td style={{ padding: 10 }}>{readDisplayText(item.customization, '—')}</td><td style={{ padding: 10 }}>{item.quantity}</td><td style={{ padding: 10 }}>{money(item.unitPrice)}</td><td style={{ padding: 10, fontWeight: 700 }}>{money(item.lineTotal)}</td></tr>)}</tbody>
        </table>
        <div style={{ marginTop: 20, marginLeft: 'auto', width: 320, display: 'grid', gap: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Tạm tính</span><strong>{money(quote.subtotal)}</strong></div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Chiết khấu</span><strong>{money(quote.discount)}</strong></div>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#9A7520', fontSize: '1.2rem' }}><span>Tổng cộng</span><strong>{money(quote.total)}</strong></div>
        </div>
        {pdfPreviewUrl && (
          <div style={{ marginTop: 24, border: '1px solid #eadfbf', borderRadius: 14, overflow: 'hidden', background: '#fffaf0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', borderBottom: '1px solid #eadfbf' }}>
              <strong style={{ color: '#7a5a14' }}>PDF báo giá đã sẵn sàng</strong>
              <button
                type="button"
                onClick={() => setIsPdfPreviewOpen(true)}
                style={{ border: 0, background: 'none', color: '#9A7520', fontWeight: 700, fontSize: '0.86rem', cursor: 'pointer' }}
              >
                Xem trong portal
              </button>
            </div>
            <div style={{ padding: 16, color: '#7a5a14', fontSize: '0.9rem', lineHeight: 1.6 }}>
              Bạn có thể xem trước ngay trong portal, hoặc mở tab mới từ thanh công cụ trong khung xem.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
