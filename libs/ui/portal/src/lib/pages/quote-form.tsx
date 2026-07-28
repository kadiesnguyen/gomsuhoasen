import { FormEvent, useEffect, useMemo, useState, type CSSProperties } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { api, type ProductApi, type QuoteApi, type QuoteItemApi } from '../services/api';
import { mergeApiErrorMessage } from '../services/api-error';
import { Button } from '@vt/ui-components';
import { useToast } from '../components/toast';
import { LoadErrorState } from '../components/load-error-state';
import { formatVnd as money } from '@gomhoasen/contracts';
import { readFirstTextInputValue, readTextInputValue } from '@vt/common-utils';
import { computeCheckoutPricing } from '@vt/ecommerce-core/pricing';

interface Rfq { id?: string; _id?: string; customerName: string; customerPhone: string; lineItems?: Array<{ productId: string; productName: string; quantity: number; variant?: string }>; }
interface QuoteLine { productId: string; productName: string; glaze: string; size: string; quantity: number; unitPrice: number; customization: string; }

const field: CSSProperties = { width: '100%', minHeight: 'var(--ghs-control-h)', padding: '0 12px', border: '1px solid var(--ghs-border)', borderRadius: 8, boxSizing: 'border-box' };
const label: CSSProperties = { display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--ghs-text-muted)', marginBottom: 6 };
const section: CSSProperties = { marginBottom: 16 };


function addDays(days: number) { const date = new Date(); date.setDate(date.getDate() + days); return date.toISOString().slice(0, 10); }

function readPositiveQuantity(value: unknown): number {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) && numericValue > 0 ? numericValue : 1;
}

function readNonNegativeMoneyValue(value: unknown): number {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) && numericValue >= 0 ? numericValue : 0;
}

function entityId(entity: { id?: string; _id?: string }): string {
  return readFirstTextInputValue(entity.id, entity._id);
}

function readRouteParamId(value: string | null): string {
  const normalized = readTextInputValue(value);
  return normalized === 'undefined' ? '' : normalized;
}

export function QuoteFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const location = useLocation();
  const paramRfqId = new URLSearchParams(location.search).get('rfqId');
  const rfqId = readRouteParamId(paramRfqId);
  const isEdit = Boolean(id);

  const [products, setProducts] = useState<ProductApi[]>([]);
  const [rfqs, setRfqs] = useState<Rfq[]>([]);
  const [selectedRfqId, setSelectedRfqId] = useState(rfqId);
  const [lines, setLines] = useState<QuoteLine[]>([]);
  const [discount, setDiscount] = useState(0);
  const [terms, setTerms] = useState('Thanh toán 30% đặt cọc, phần còn lại trước khi bàn giao.');
  const [validUntil, setValidUntil] = useState(addDays(30));
  const [loading, setLoading] = useState(isEdit);
  const [loadError, setLoadError] = useState('');
  const [referenceError, setReferenceError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const selectedRfq = useMemo(
    () => rfqs.find((item) => entityId(item) === selectedRfqId) ?? null,
    [rfqs, selectedRfqId],
  );

  const loadReferences = async () => {
    setReferenceError('');
    const [productResult, rfqResult] = await Promise.allSettled([
      api.catalog.list(),
      api.rfq.list(),
    ]);
    const messages: string[] = [];
    if (productResult.status === 'fulfilled') {
      setProducts(productResult.value);
    } else {
      messages.push(mergeApiErrorMessage('Không tải được danh sách sản phẩm', productResult.reason));
    }
    if (rfqResult.status === 'fulfilled') {
      setRfqs(rfqResult.value);
    } else {
      messages.push(mergeApiErrorMessage('Không tải được danh sách RFQ', rfqResult.reason));
    }
    setReferenceError(messages.join('. '));
  };

  useEffect(() => { void loadReferences(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!isEdit || !id) return;
    setLoading(true);
    setLoadError('');
    api.quote.get(id).then((quote: QuoteApi) => {
      setSelectedRfqId(readTextInputValue(quote.rfqId));
      setLines(Array.isArray(quote.items) ? quote.items.map((item: QuoteItemApi) => ({
        productId: readTextInputValue(item.productId),
        productName: readTextInputValue(item.productName),
        glaze: readTextInputValue(item.glaze),
        size: readTextInputValue(item.size),
        quantity: readPositiveQuantity(item.quantity),
        unitPrice: readNonNegativeMoneyValue(item.unitPrice),
        customization: readTextInputValue(item.customization),
      })) : []);
      setDiscount(readNonNegativeMoneyValue(quote.discount));
      setTerms(readTextInputValue(quote.terms));
      setValidUntil(quote.validUntil ? new Date(String(quote.validUntil)).toISOString().slice(0, 10) : addDays(30));
    }).catch((err) => setLoadError(mergeApiErrorMessage('Không tải được báo giá', err)))
      .finally(() => setLoading(false));
  }, [id, isEdit, reloadKey]);

  useEffect(() => {
    if (isEdit) return;
    if (!selectedRfqId) {
      setLines([]);
      return;
    }
    api.rfq.get(selectedRfqId).then((rfq: Rfq) => {
      if (!rfq.lineItems?.length) {
        setLines([]);
        return;
      }
      setLines(rfq.lineItems.map(item => ({
        productId: item.productId,
        productName: item.productName,
        glaze: readTextInputValue(item.variant),
        size: '',
        quantity: readPositiveQuantity(item.quantity),
        unitPrice: 0,
        customization: '',
      })));
    }).catch((err) => {
      const message = mergeApiErrorMessage('Không tải được chi tiết RFQ', err);
      setError(message);
      toast(message, 'error');
    });
  }, [selectedRfqId, isEdit]);

  const subtotal = useMemo(() => lines.reduce((sum, line) => sum + line.quantity * line.unitPrice, 0), [lines]);
  const total = useMemo(() => computeCheckoutPricing({
    cartTotal: subtotal,
    discountVoucher: discount,
    clampDiscounts: true,
  }).totalPayment, [discount, subtotal]);

  const updateLine = (index: number, patch: Partial<QuoteLine>) => {
    setLines(prev => prev.map((line, i) => i === index ? { ...line, ...patch } : line));
  };

  const chooseProduct = (index: number, productId: string) => {
    const product = products.find(p => entityId(p) === productId);
    updateLine(index, {
      productId,
      productName: readTextInputValue(product?.name),
      glaze: readTextInputValue(product?.glaze),
      size: readTextInputValue(product?.size),
      unitPrice: readNonNegativeMoneyValue(product?.referencePrice),
    });
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (lines.length === 0) {
      const message = 'Cần ít nhất một dòng báo giá trước khi lưu.';
      setError(message);
      toast(message, 'error');
      return;
    }
    setSaving(true);
    setError(null);
    const payload = { rfqId: selectedRfqId, items: lines, discount, terms, validUntil };
    try {
      const saved = isEdit && id ? await api.quote.update(id, payload) : await api.quote.create(payload);
      const savedId = readFirstTextInputValue(entityId(saved), id);
      toast(isEdit ? 'Đã cập nhật báo giá.' : 'Đã tạo báo giá.', 'success');
      navigate(`/admin/quotes/${savedId}`);
    } catch (err) {
      const message = mergeApiErrorMessage('Lưu báo giá thất bại', err);
      setError(message);
      toast(message, 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div style={{ textAlign: 'center', padding: 48, color: '#999' }}>Đang tải...</div>;
  if (loadError) {
    return <LoadErrorState message={loadError} onRetry={() => setReloadKey((value) => value + 1)} />;
  }

  return (
    <div>
      <div className="ghs-page-header">
        <div><h1>{isEdit ? 'Chỉnh sửa báo giá' : 'Tạo báo giá'}</h1></div>
        <Button className="ghs-btn ghs-btn-ghost" variant="secondary" onClick={() => navigate('/admin/quotes')}>Quay lại</Button>
      </div>
      {referenceError && (
        <div role="alert" style={{ marginBottom: 16, padding: '10px 14px', borderRadius: 10, background: '#fff7ed', color: '#9a3412', fontSize: '0.84rem' }}>
          {referenceError}.{' '}
          <button type="button" onClick={() => void loadReferences()} style={{ border: 0, padding: 0, background: 'none', color: '#9A7520', fontWeight: 700, cursor: 'pointer' }}>
            Thử lại
          </button>
        </div>
      )}
      <form onSubmit={handleSubmit}>
        <div className="ghs-card" style={section}>
          <h3 style={{ marginTop: 0, color: '#9A7520' }}>RFQ & điều khoản</h3>
          {rfqs.length === 0 && !referenceError && (
            <div style={{ marginBottom: 16, padding: '12px 14px', borderRadius: 12, background: '#fffaf0', color: '#7b5e18', fontSize: '0.86rem' }}>
              Chưa có RFQ nào trong hộp thư. Hãy tiếp nhận yêu cầu báo giá trước khi tạo quote.
              <div style={{ marginTop: 8 }}>
                <button type="button" onClick={() => navigate('/admin/rfq')} style={{ border: 0, background: 'none', color: '#9A7520', cursor: 'pointer', fontWeight: 700, padding: 0 }}>
                  Mở hộp thư RFQ
                </button>
              </div>
            </div>
          )}
          <div className="ghs-quote-form-grid">
            <div><label style={label}>RFQ</label><select value={selectedRfqId} onChange={(e) => setSelectedRfqId(e.target.value)} required disabled={isEdit} style={field}><option value="">Chọn RFQ</option>{rfqs.map(r => {
              const id = entityId(r);
              return <option key={id} value={id}>{r.customerName} - {r.customerPhone}</option>;
            })}</select></div>
            <div><label style={label}>Hiệu lực đến</label><input type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} style={field} /></div>
          </div>
          {selectedRfq && (
            <div style={{ marginTop: 14, padding: '12px 14px', borderRadius: 12, background: '#f8f4ec', color: '#6b5b45', fontSize: '0.84rem' }}>
              RFQ đang chọn: <strong>{selectedRfq.customerName}</strong>
              {selectedRfq.customerPhone ? ` • ${selectedRfq.customerPhone}` : ''}
              {selectedRfq.lineItems?.length ? ` • ${selectedRfq.lineItems.length} dòng yêu cầu` : ' • chưa có dòng sản phẩm'}
            </div>
          )}
          <div style={{ marginTop: 16 }}><label style={label}>Điều khoản</label><textarea value={terms} onChange={(e) => setTerms(e.target.value)} rows={3} style={{ ...field, resize: 'vertical' }} /></div>
        </div>

        <div className="ghs-card" style={section}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h3 style={{ margin: 0, color: '#9A7520' }}>Dòng báo giá</h3>
            <Button className="ghs-btn ghs-btn-ghost" type="button" variant="secondary" size="sm" onClick={() => setLines(prev => [...prev, { productId: '', productName: '', glaze: '', size: '', quantity: 1, unitPrice: 0, customization: '' }])}>Thêm dòng</Button>
          </div>
          <div style={{ display: 'grid', gap: 12 }}>
            {lines.length === 0 ? (
              <div style={{ border: '1px dashed #ddcfb5', borderRadius: 12, padding: '18px 16px', background: '#fffaf2', color: '#7b5e18' }}>
                <div style={{ fontWeight: 700, marginBottom: 6 }}>Chưa có dòng báo giá</div>
                <div style={{ fontSize: '0.84rem', marginBottom: 10 }}>
                  Chọn RFQ để nạp nhanh danh sách sản phẩm, hoặc thêm từng dòng một cũng được.
                </div>
                <Button className="ghs-btn ghs-btn-ghost" type="button" variant="secondary" size="sm" onClick={() => setLines([{ productId: '', productName: '', glaze: '', size: '', quantity: 1, unitPrice: 0, customization: '' }])}>
                  Thêm dòng đầu tiên
                </Button>
              </div>
            ) : lines.map((line, index) => (
              <div key={index} style={{ border: '1px solid #eee', borderRadius: 10, padding: 12 }}>
                <div className="ghs-quote-line-grid">
                  <div><label htmlFor={`quote-line-${index}-product`} style={label}>Sản phẩm</label><select id={`quote-line-${index}-product`} value={line.productId} onChange={(e) => chooseProduct(index, e.target.value)} style={field}><option value="">Chọn sản phẩm</option>{products.map(p => {
                    const id = entityId(p);
                    return <option key={id} value={id}>{p.name}</option>;
                  })}</select></div>
                  <div><label htmlFor={`quote-line-${index}-glaze`} style={label}>Men</label><input id={`quote-line-${index}-glaze`} value={line.glaze} onChange={(e) => updateLine(index, { glaze: e.target.value })} style={field} /></div>
                  <div><label htmlFor={`quote-line-${index}-size`} style={label}>Size</label><input id={`quote-line-${index}-size`} value={line.size} onChange={(e) => updateLine(index, { size: e.target.value })} style={field} /></div>
                  <div><label htmlFor={`quote-line-${index}-quantity`} style={label}>SL</label><input id={`quote-line-${index}-quantity`} type="number" min={1} value={line.quantity} onChange={(e) => updateLine(index, { quantity: Number(e.target.value) })} style={field} /></div>
                  <div><label htmlFor={`quote-line-${index}-unit-price`} style={label}>Đơn giá</label><input id={`quote-line-${index}-unit-price`} type="number" min={0} value={line.unitPrice} onChange={(e) => updateLine(index, { unitPrice: Number(e.target.value) })} style={field} /></div>
                  <Button className="ghs-btn ghs-btn-danger" type="button" variant="destructive" size="sm" onClick={() => setLines(prev => prev.filter((_, i) => i !== index))}>Xóa</Button>
                </div>
                <div style={{ marginTop: 10 }}><label htmlFor={`quote-line-${index}-customization`} style={label}>Tùy chỉnh</label><input id={`quote-line-${index}-customization`} value={line.customization} onChange={(e) => updateLine(index, { customization: e.target.value })} style={field} /></div>
              </div>
            ))}
          </div>
        </div>

        <div className="ghs-card" style={section}>
          <h3 style={{ marginTop: 0, color: '#9A7520' }}>Tổng tiền</h3>
          <div className="ghs-quote-summary-grid">
            <div><label style={label}>Tạm tính</label><div style={{ fontWeight: 800, fontSize: '1.2rem' }}>{money(subtotal)}</div></div>
            <div><label style={label}>Chiết khấu</label><input type="number" min={0} value={discount} onChange={(e) => setDiscount(Number(e.target.value))} style={field} /></div>
            <div><label style={label}>Tổng cộng</label><div style={{ fontWeight: 800, fontSize: '1.35rem', color: '#9A7520' }}>{money(total)}</div></div>
          </div>
        </div>

        {error && <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 12, padding: '10px 14px', color: '#b91c1c', marginBottom: 16 }}>{error}</div>}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
          <Button className="ghs-btn ghs-btn-ghost" type="button" variant="secondary" onClick={() => navigate('/admin/quotes')}>Hủy</Button>
          <Button className="ghs-btn ghs-btn-primary" type="submit" variant="primary" isLoading={saving}>Lưu báo giá</Button>
        </div>
      </form>
    </div>
  );
}
