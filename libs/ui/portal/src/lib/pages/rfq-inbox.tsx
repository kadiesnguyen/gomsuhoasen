// Task card: R3-004
// Refs read:
// - /Users/bonbon177tb/Documents/zalominiapp/v2/apps/v2-portal/src/pages/OrderList.tsx
// - /Users/bonbon177tb/Documents/zalominiapp/v2/apps/v2-portal/src/components/ecommerce/OrderViewPanel.tsx
// Kept: list/status/detail UX pattern, status tabs, detail side-panel
// Dropped: logistics, payment tabs, customer details
// Adapted: RFQ inbox with internal note, status transitions, quote creation CTA

import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { readTrimmedString } from '@vt/common-utils';
import { RFQ_STATUSES, RFQ_STATUS_VALUES, type RfqStatus } from '@gomhoasen/contracts';
import { api, type RfqApi } from '../services/api';
import { mergeApiErrorMessage } from '../services/api-error';
import { LoadErrorState } from '../components/load-error-state';
import { useToast } from '../components/toast';
import { Tabs, type TabItem } from '@vt/ui-components';

type Rfq = RfqApi & { internalNote?: string };

const STATUS_MAP: Record<RfqStatus, { label: string; bg: string; color: string }> = {
  NEW: { label: 'Mới', bg: '#fef3c7', color: '#b45309' },
  CONTACTED: { label: 'Đã liên hệ', bg: '#dbeafe', color: '#2563eb' },
  QUOTED: { label: 'Đã báo giá', bg: '#ecfdf5', color: '#059669' },
  CLOSED: { label: 'Đã đóng', bg: '#f3f4f6', color: '#6b7280' },
};

export function RfqInboxPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { toast } = useToast();
  const [rfqs, setRfqs] = useState<Rfq[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [selected, setSelected] = useState<Rfq | null>(null);
  const [filter, setFilter] = useState<RfqStatus | ''>('');
  const [noteText, setNoteText] = useState('');
  const selectedIdFromQuery = readTrimmedString(searchParams.get('id')) ?? '';

  const load = () => {
    setLoading(true);
    setLoadError('');
    api.rfq.list()
      .then(setRfqs)
      .catch((err) => setLoadError(mergeApiErrorMessage('Không tải được danh sách yêu cầu báo giá', err)))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Count per status for tab badges
  const counts = useMemo(() => {
    const map: Record<string, number> = {};
    for (const r of rfqs) map[r.status] = (map[r.status] ?? 0) + 1;
    return map;
  }, [rfqs]);

  const displayed = useMemo(() => {
    if (!filter) return rfqs;
    return rfqs.filter((rfq) => rfq.status === filter);
  }, [filter, rfqs]);

  useEffect(() => {
    if (!selected) return;
    if (!displayed.some((rfq) => rfq.id === selected.id)) {
      setSelected(null);
      setNoteText('');
      if (selectedIdFromQuery) setSearchParams({});
    }
  }, [displayed, selected, selectedIdFromQuery, setSearchParams]);

  useEffect(() => {
    if (!selectedIdFromQuery) return;
    const matched = rfqs.find((rfq) => rfq.id === selectedIdFromQuery);
    if (!matched) return;
    if (selected?.id === matched.id) return;
    setSelected(matched);
    setNoteText('');
  }, [rfqs, selected, selectedIdFromQuery]);

  const handleStatus = async (id: string, status: RfqStatus) => {
    try {
      const normalizedNote = readTrimmedString(noteText);
      await api.rfq.updateStatus(id, status, normalizedNote);
      const updated = rfqs.map(r => r.id === id ? { ...r, status, internalNote: normalizedNote ?? r.internalNote } : r);
      setRfqs(updated);
      if (selected && selected.id === id) {
        if (filter && filter !== status) {
          setSelected(null);
        } else {
          setSelected({ ...selected, status, internalNote: normalizedNote ?? selected.internalNote });
        }
      }
      setNoteText('');
      toast('Đã cập nhật trạng thái RFQ.', 'success');
    } catch (err) {
      toast(mergeApiErrorMessage('Cập nhật RFQ thất bại', err), 'error');
    }
  };

  const selectRfq = (rfq: Rfq) => {
    setSelected(rfq);
    setNoteText('');
    setSearchParams({ id: rfq.id });
  };

  const closeSelected = () => {
    setSelected(null);
    setNoteText('');
    if (selectedIdFromQuery) setSearchParams({});
  };

  const tabs = useMemo<Array<{ v: RfqStatus | ''; l: string; count: number }>>(() => [
    { v: '', l: 'Tất cả', count: rfqs.length },
    ...RFQ_STATUS_VALUES.map((v) => ({ v, l: STATUS_MAP[v].label, count: counts[v] ?? 0 })),
  ], [rfqs.length, counts]);

  const tabItems = useMemo<TabItem[]>(() => {
    return tabs.map(t => ({
      id: t.v,
      label: t.l,
      badge: t.count > 0 ? t.count : undefined,
    }));
  }, [tabs]);

  return (
    <div>
      <div className="ghs-page-header"><div><h1>Yêu cầu báo giá</h1></div></div>

      {/* Status filter tabs with counts */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        <Tabs
          tabs={tabItems}
          activeTabId={filter}
          onTabChange={(id) => setFilter(id as RfqStatus | '')}
          size="sm"
        />
      </div>

      <div className={selected ? 'ghs-rfq-inbox-layout is-detail-open' : 'ghs-rfq-inbox-layout'}>
        {/* List */}
        <div className="ghs-card" style={{ padding: 0, overflow: 'hidden' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: 48, color: '#999' }}>Đang tải...</div>
          ) : loadError ? (
            <LoadErrorState message={loadError} onRetry={load} />
          ) : displayed.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 48 }}>
              <div style={{ fontSize: '3rem', marginBottom: 12 }}>📭</div>
              <h3 style={{ fontWeight: 600, color: '#555' }}>
                {filter ? `Không có yêu cầu "${STATUS_MAP[filter]?.label}"` : 'Chưa có yêu cầu'}
              </h3>
              <p style={{ color: '#999', fontSize: '0.85rem' }}>
                {filter ? 'Thử chọn trạng thái khác để tiếp tục xử lý.' : 'Yêu cầu từ khách hàng sẽ xuất hiện tại đây.'}
              </p>
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #f0ede6', textAlign: 'left' }}>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: '#666' }}>Khách hàng</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: '#666' }}>SĐT</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: '#666' }}>Sản phẩm</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: '#666' }}>Trạng thái</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: '#666' }}>Ngày</th>
                </tr>
              </thead>
              <tbody>
                {displayed.map(r => {
                  const st = STATUS_MAP[r.status] ?? STATUS_MAP[RFQ_STATUSES.NEW];
                  const productSummary = readTrimmedString(r.lineItems?.map(l => l.productName).join(', ')) ?? '—';
                  return (
                    <tr
                      key={r.id}
                      onClick={() => selectRfq(r)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          selectRfq(r);
                        }
                      }}
                      role="button"
                      tabIndex={0}
                      aria-label={`Xem yêu cầu của ${r.customerName}`}
                      style={{
                        borderBottom: '1px solid #f5f3ee', cursor: 'pointer',
                        background: selected?.id === r.id ? '#faf7f0' : 'transparent',
                        transition: 'background 0.15s',
                      }}
                    >
                      <td style={{ padding: '12px 16px', fontWeight: 500 }}>{r.customerName}</td>
                      <td style={{ padding: '12px 16px', color: '#888' }}>{r.customerPhone}</td>
                      <td style={{ padding: '12px 16px', color: '#888', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {productSummary}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: '0.75rem', fontWeight: 600, background: st.bg, color: st.color }}>{st.label}</span>
                      </td>
                      <td style={{ padding: '12px 16px', color: '#999', fontSize: '0.8rem' }}>{new Date(r.createdAt).toLocaleDateString('vi')}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Detail panel */}
        {selected && (
          <div className="ghs-card ghs-rfq-inbox-detail">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>Chi tiết RFQ</h3>
              <button type="button" aria-label="Đóng chi tiết yêu cầu" onClick={closeSelected} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem', color: '#999' }}>✕</button>
            </div>

            {/* Customer info */}
            <div style={{ fontSize: '0.9rem', lineHeight: 2, color: '#555' }}>
              <div><strong>Tên:</strong> {selected.customerName}</div>
              <div><strong>SĐT:</strong> <a href={`tel:${selected.customerPhone}`} style={{ color: '#9A7520' }}>{selected.customerPhone}</a></div>
              {selected.customerEmail && <div><strong>Email:</strong> <a href={`mailto:${selected.customerEmail}`} style={{ color: '#9A7520' }}>{selected.customerEmail}</a></div>}
            </div>

            {/* Message */}
            {selected.message && (
              <div style={{ marginTop: 12, padding: 12, background: '#faf7f0', borderRadius: 10, fontSize: '0.85rem', color: '#666', borderLeft: '3px solid #9A7520' }}>
                <strong style={{ display: 'block', marginBottom: 4, color: '#9A7520' }}>Lời nhắn</strong>
                {selected.message}
              </div>
            )}

            {/* Line items */}
            <div style={{ marginTop: 16 }}>
              <strong style={{ fontSize: '0.85rem', color: '#555' }}>Sản phẩm quan tâm:</strong>
              <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
                {selected.lineItems?.map((l, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 10px', background: '#f9f7f2', borderRadius: 8, fontSize: '0.85rem' }}>
                    <span>{l.productName}</span>
                    <span style={{ color: '#999' }}>×{l.quantity}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Internal note */}
            {selected.internalNote && (
              <div style={{ marginTop: 12, padding: 10, background: '#f0f4ff', borderRadius: 8, fontSize: '0.8rem', color: '#2563eb' }}>
                <strong>Ghi chú nội bộ:</strong> {selected.internalNote}
              </div>
            )}

            {/* Note input for status change */}
            <div style={{ marginTop: 16 }}>
              <textarea
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="Ghi chú nội bộ (tùy chọn)..."
                rows={2}
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: '0.85rem', resize: 'vertical' }}
              />
            </div>

            <div style={{ marginTop: 16, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button type="button" onClick={() => navigate(`/admin/quotes/new?rfqId=${selected.id}`)} className="ghs-btn ghs-btn-primary">
                Tạo báo giá
              </button>
              {([RFQ_STATUSES.CONTACTED, RFQ_STATUSES.QUOTED, RFQ_STATUSES.CLOSED] as const).filter(s => s !== selected.status).map(s => {
                const st = STATUS_MAP[s];
                return (
                  <button key={s} onClick={() => handleStatus(selected.id, s)} style={{
                    padding: '8px 16px', borderRadius: 10, border: `1px solid ${st.color}`, background: st.bg,
                    color: st.color, fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer',
                  }}>
                    → {st.label}
                  </button>
                );
              })}
            </div>

            {/* Timestamp */}
            <div style={{ marginTop: 16, fontSize: '0.75rem', color: '#bbb' }}>
              Nhận lúc {new Date(selected.createdAt).toLocaleString('vi')}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
