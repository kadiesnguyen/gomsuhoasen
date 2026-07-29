// Task card: R3-005
// Refs read:
// - /Users/bonbon177tb/Documents/zalominiapp/v2/apps/v2-portal/src/pages/OrderList.tsx
// - /Users/bonbon177tb/Documents/zalominiapp/v2/apps/v2-portal/src/components/ecommerce/OrderViewPanel.tsx
// Kept: status tabs, list/detail/action layout, count badges
// Dropped: logistics, payment, shipping, bulk order actions
// Adapted: RFQ quote workflow, PDF/send actions

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, type QuoteApi } from '../services/api';
import { mergeApiErrorMessage } from '../services/api-error';
import { LoadErrorState } from '../components/load-error-state';
import { FilterTabs } from '../components/filter-tabs';
import {
  QUOTE_STATUSES,
  QUOTE_STATUS_VALUES,
  formatVnd as money,
  type QuoteStatus,
} from '@gomhoasen/contracts';
import { readTrimmedString } from '@vt/common-utils';

type Quote = QuoteApi;

const STATUS_MAP: Record<QuoteStatus, { label: string; bg: string; color: string }> = {
  DRAFT: { label: 'Nháp', bg: '#f3f4f6', color: '#6b7280' },
  SENT: { label: 'Đã gửi', bg: '#dbeafe', color: '#2563eb' },
  ACCEPTED: { label: 'Chấp nhận', bg: '#ecfdf5', color: '#059669' },
  EXPIRED: { label: 'Hết hạn', bg: '#fef3c7', color: '#b45309' },
  REJECTED: { label: 'Từ chối', bg: '#fef2f2', color: '#b91c1c' },
};



function relativeDate(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return 'Hôm nay';
  if (diffDays === 1) return 'Hôm qua';
  if (diffDays < 7) return `${diffDays} ngày trước`;
  return d.toLocaleDateString('vi');
}

export function QuoteListPage() {
  const navigate = useNavigate();
  const [allQuotes, setAllQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [status, setStatus] = useState<QuoteStatus | ''>('');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Fetch all quotes (unfiltered) for accurate counts
  const fetchQuotes = useCallback(() => {
    setLoading(true);
    setLoadError('');
    api.quote.list({ ...(debouncedSearch ? { search: debouncedSearch } : {}) })
      .then(setAllQuotes)
      .catch((err) => setLoadError(mergeApiErrorMessage('Không tải được danh sách báo giá', err)))
      .finally(() => setLoading(false));
  }, [debouncedSearch]);

  useEffect(() => { fetchQuotes(); }, [fetchQuotes]);

  // Count per status
  const counts = useMemo(() => {
    const map: Record<string, number> = {};
    for (const q of allQuotes) map[q.status] = (map[q.status] ?? 0) + 1;
    return map;
  }, [allQuotes]);

  // Client-side filter by status for instant tab switching
  const displayed = useMemo(() => {
    if (!status) return allQuotes;
    return allQuotes.filter(q => q.status === status);
  }, [allQuotes, status]);

  const tabs = useMemo<Array<{ value: QuoteStatus | ''; label: string; count: number }>>(() => [
    { value: '', label: 'Tất cả', count: allQuotes.length },
    ...QUOTE_STATUS_VALUES.map((value) => ({
      value,
      label: STATUS_MAP[value].label,
      count: counts[value] ?? 0,
    })),
  ], [allQuotes.length, counts]);

  const tabItems = useMemo(() => {
    return tabs.map(t => ({
      id: t.value,
      label: t.label,
      badge: t.count,
    }));
  }, [tabs]);

  return (
    <div>
      <div className="ghs-page-header">
        <div><h1>Báo giá</h1></div>
        <button type="button" className="ghs-btn ghs-btn-primary" onClick={() => navigate('/admin/quotes/new')}>
          Tạo báo giá
        </button>
      </div>

      <div className="ghs-filter-bar">
        <FilterTabs
          tabs={tabItems}
          activeTabId={status}
          onTabChange={(id) => setStatus(id as QuoteStatus | '')}
        />
        <input
          className="ghs-input ghs-filter-input ghs-filter-bar__search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Tìm mã, khách hàng, SĐT..."
          aria-label="Tìm báo giá"
        />
        {(status || search) ? (
          <button
            type="button"
            className="ghs-btn ghs-btn-ghost ghs-btn-sm"
            onClick={() => {
              setStatus('');
              setSearch('');
              setDebouncedSearch('');
            }}
          >
            Xóa lọc
          </button>
        ) : null}
      </div>

      <div className="ghs-card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 48, color: '#999' }}>Đang tải...</div>
        ) : loadError ? (
          <LoadErrorState message={loadError} onRetry={fetchQuotes} />
        ) : displayed.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 48 }}>
            <div style={{ fontSize: '3rem', marginBottom: 12 }}>📋</div>
            <h3 style={{ fontWeight: 600, color: '#555' }}>
              {status ? `Không có báo giá "${STATUS_MAP[status]?.label}"` : 'Chưa có báo giá'}
            </h3>
            <p style={{ color: '#999', fontSize: '0.85rem', marginTop: 4 }}>
              {status || search
                ? 'Thử chọn trạng thái khác hoặc xóa bộ lọc để xem lại toàn bộ báo giá.'
                : 'Tạo báo giá đầu tiên từ yêu cầu của khách hàng.'}
            </p>
            {status || search ? (
              <button
                type="button"
                className="ghs-btn ghs-btn-ghost"
                onClick={() => {
                  setStatus('');
                  setSearch('');
                  setDebouncedSearch('');
                }}
                style={{ marginTop: 12 }}
              >
                Xem tất cả báo giá
              </button>
            ) : (
              <button type="button" className="ghs-btn ghs-btn-primary" onClick={() => navigate('/admin/quotes/new')} style={{ marginTop: 12 }}>
                Tạo báo giá
              </button>
            )}
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #f0ede6', textAlign: 'left' }}>
                <th style={{ padding: '12px 16px', fontWeight: 600, color: '#666' }}>Mã</th>
                <th style={{ padding: '12px 16px', fontWeight: 600, color: '#666' }}>Khách hàng</th>
                <th style={{ padding: '12px 16px', fontWeight: 600, color: '#666' }}>Tổng tiền</th>
                <th style={{ padding: '12px 16px', fontWeight: 600, color: '#666' }}>Trạng thái</th>
                <th style={{ padding: '12px 16px', fontWeight: 600, color: '#666' }}>Hiệu lực</th>
                <th style={{ padding: '12px 16px', fontWeight: 600, color: '#666' }}>Ngày tạo</th>
              </tr>
            </thead>
            <tbody>
              {displayed.map(quote => {
                const st = STATUS_MAP[quote.status] ?? STATUS_MAP[QUOTE_STATUSES.DRAFT];
                const isExpiringSoon = quote.validUntil && new Date(quote.validUntil).getTime() - Date.now() < 3 * 24 * 60 * 60 * 1000 && quote.status === QUOTE_STATUSES.SENT;
                return (
                  <tr
                    key={quote.id}
                    onClick={() => navigate(`/admin/quotes/${quote.id}`)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        navigate(`/admin/quotes/${quote.id}`);
                      }
                    }}
                    role="link"
                    tabIndex={0}
                    aria-label={`Xem báo giá ${quote.code}`}
                    style={{
                      borderBottom: '1px solid #f5f3ee', cursor: 'pointer',
                      transition: 'background 0.15s',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = '#faf7f0'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                  >
                    <td style={{ padding: '12px 16px', fontWeight: 700, color: '#9A7520' }}>{quote.code}</td>
                    <td style={{ padding: '12px 16px' }}>
                      {readTrimmedString(quote.customerName) ?? '—'}
                      {quote.customerPhone && <><br /><span style={{ color: '#888', fontSize: '0.8rem' }}>{quote.customerPhone}</span></>}
                    </td>
                    <td style={{ padding: '12px 16px', fontWeight: 700 }}>{money(quote.total)}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: '0.75rem', fontWeight: 600, background: st.bg, color: st.color }}>{st.label}</span>
                    </td>
                    <td style={{ padding: '12px 16px', color: isExpiringSoon ? '#b45309' : '#888', fontWeight: isExpiringSoon ? 600 : 400 }}>
                      {quote.validUntil ? (
                        <>
                          {new Date(quote.validUntil).toLocaleDateString('vi')}
                          {isExpiringSoon && <span style={{ display: 'block', fontSize: '0.7rem', color: '#b45309' }}>⚠ Sắp hết hạn</span>}
                        </>
                      ) : '—'}
                    </td>
                    <td style={{ padding: '12px 16px', color: '#999', fontSize: '0.8rem' }}>{relativeDate(quote.createdAt)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Summary footer */}
      {!loading && displayed.length > 0 && (
        <div style={{ marginTop: 12, display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#999', padding: '0 4px' }}>
          <span>{displayed.length} báo giá{status ? ` (${STATUS_MAP[status]?.label})` : ''}</span>
          <span>Tổng giá trị: <strong style={{ color: '#9A7520' }}>{money(displayed.reduce((sum, q) => sum + (q.total ?? 0), 0))}</strong></span>
        </div>
      )}
    </div>
  );
}
