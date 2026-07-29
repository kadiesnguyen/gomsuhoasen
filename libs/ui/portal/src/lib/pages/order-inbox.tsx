import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { readTrimmedString } from '@vt/common-utils';
import {
  ORDER_STATUSES,
  ORDER_STATUS_VALUES,
  type OrderStatus,
} from '@gomhoasen/contracts';
import { api, type OrderApi } from '../services/api';
import { mergeApiErrorMessage } from '../services/api-error';
import { LoadErrorState } from '../components/load-error-state';
import { useToast } from '../components/toast';
import { useConfirm } from '../components/confirm-dialog';
import { FilterTabs } from '../components/filter-tabs';

type Order = OrderApi & { internalNote?: string };

const STATUS_MAP: Record<OrderStatus, { label: string; bg: string; color: string }> = {
  NEW: { label: 'Mới', bg: '#fef3c7', color: '#b45309' },
  CONFIRMED: { label: 'Đã xác nhận', bg: '#dbeafe', color: '#2563eb' },
  SHIPPING: { label: 'Đang giao', bg: '#ede9fe', color: '#6d28d9' },
  COMPLETED: { label: 'Hoàn tất', bg: '#ecfdf5', color: '#059669' },
  CANCELLED: { label: 'Đã hủy', bg: '#f3f4f6', color: '#6b7280' },
};

const NEXT_STATUSES: Record<OrderStatus, OrderStatus[]> = {
  NEW: [ORDER_STATUSES.CONFIRMED, ORDER_STATUSES.CANCELLED],
  CONFIRMED: [ORDER_STATUSES.SHIPPING, ORDER_STATUSES.CANCELLED],
  SHIPPING: [ORDER_STATUSES.COMPLETED, ORDER_STATUSES.CANCELLED],
  COMPLETED: [],
  CANCELLED: [],
};

function formatVnd(amount: number): string {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function OrderInboxPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { toast } = useToast();
  const { confirm } = useConfirm();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [selected, setSelected] = useState<Order | null>(null);
  const [filter, setFilter] = useState<OrderStatus | ''>('');
  const [search, setSearch] = useState('');
  const [noteText, setNoteText] = useState('');
  const selectedIdFromQuery = readTrimmedString(searchParams.get('id')) ?? '';

  const load = () => {
    setLoading(true);
    setLoadError('');
    const params: { q?: string } = {};
    const q = search.trim();
    if (q) params.q = q;
    api.order
      .list(params)
      .then(setOrders)
      .catch((err) => setLoadError(mergeApiErrorMessage('Không tải được danh sách đơn hàng', err)))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const handle = window.setTimeout(() => load(), 280);
    return () => window.clearTimeout(handle);
  }, [search]); // eslint-disable-line react-hooks/exhaustive-deps

  const counts = useMemo(() => {
    const map: Record<string, number> = {};
    for (const order of orders) map[order.status] = (map[order.status] ?? 0) + 1;
    return map;
  }, [orders]);

  const displayed = useMemo(() => {
    if (!filter) return orders;
    return orders.filter((order) => order.status === filter);
  }, [filter, orders]);

  useEffect(() => {
    if (!selected) return;
    if (!displayed.some((order) => order.id === selected.id)) {
      setSelected(null);
      setNoteText('');
      if (selectedIdFromQuery) setSearchParams({});
    }
  }, [displayed, selected, selectedIdFromQuery, setSearchParams]);

  useEffect(() => {
    if (!selectedIdFromQuery) return;
    const matched = orders.find((order) => order.id === selectedIdFromQuery);
    if (!matched || selected?.id === matched.id) return;
    setSelected(matched);
    setNoteText('');
  }, [orders, selected, selectedIdFromQuery]);

  const handleStatus = (id: string, status: OrderStatus) => {
    const st = STATUS_MAP[status];
    confirm({
      title: `Chuyển sang "${st.label}"?`,
      description: 'Trạng thái đơn hàng sẽ được cập nhật ngay.',
      confirmLabel: 'Cập nhật',
      variant: status === ORDER_STATUSES.CANCELLED ? 'danger' : 'info',
      onConfirm: async () => {
        const normalizedNote = readTrimmedString(noteText);
        try {
          await api.order.updateStatus(id, status, normalizedNote);
          setOrders((prev) =>
            prev.map((order) =>
              order.id === id
                ? { ...order, status, internalNote: normalizedNote ?? order.internalNote }
                : order,
            ),
          );
          if (selected?.id === id) {
            setSelected({
              ...selected,
              status,
              internalNote: normalizedNote ?? selected.internalNote,
            });
          }
          setNoteText('');
          toast('Đã cập nhật trạng thái đơn hàng.', 'success');
        } catch (err) {
          toast(mergeApiErrorMessage('Cập nhật đơn hàng thất bại', err), 'error');
          throw err;
        }
      },
    });
  };

  const selectOrder = (order: Order) => {
    setSelected(order);
    setNoteText('');
    setSearchParams({ id: order.id });
  };

  const closeSelected = () => {
    setSelected(null);
    setNoteText('');
    if (selectedIdFromQuery) setSearchParams({});
  };

  const tabs = useMemo<Array<{ v: OrderStatus | ''; l: string; count: number }>>(
    () => [
      { v: '', l: 'Tất cả', count: orders.length },
      ...ORDER_STATUS_VALUES.map((v) => ({
        v,
        l: STATUS_MAP[v].label,
        count: counts[v] ?? 0,
      })),
    ],
    [orders.length, counts],
  );

  const tabItems = useMemo(
    () =>
      tabs.map((t) => ({
        id: t.v,
        label: t.l,
        badge: t.count,
      })),
    [tabs],
  );

  return (
    <div>
      <div className="ghs-page-header">
        <div>
          <h1>Đơn hàng</h1>
        </div>
      </div>

      <div className="ghs-filter-bar">
        <FilterTabs
          tabs={tabItems}
          activeTabId={filter}
          onTabChange={(id) => setFilter(id as OrderStatus | '')}
        />
        <input
          className="ghs-input ghs-filter-input ghs-filter-bar__search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Tìm tên hoặc SĐT..."
          aria-label="Tìm theo tên hoặc số điện thoại"
        />
      </div>

      <div className={selected ? 'ghs-rfq-inbox-layout is-detail-open' : 'ghs-rfq-inbox-layout'}>
        <div className="ghs-card" style={{ padding: 0, overflow: 'hidden' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: 48, color: '#999' }}>Đang tải...</div>
          ) : loadError ? (
            <LoadErrorState message={loadError} onRetry={load} />
          ) : displayed.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 48 }}>
              <h3 style={{ fontWeight: 600, color: '#555' }}>
                {filter || search ? 'Không có đơn phù hợp' : 'Chưa có đơn hàng'}
              </h3>
              <p style={{ color: '#999', fontSize: '0.85rem' }}>
                Đơn từ showroom sẽ xuất hiện tại đây.
              </p>
            </div>
          ) : (
            <div className="ghs-inbox-table-wrap">
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #f0ede6', textAlign: 'left' }}>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: '#666' }}>Khách hàng</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: '#666' }}>SĐT</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: '#666' }}>Sản phẩm</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: '#666' }}>Tổng</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: '#666' }}>Trạng thái</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: '#666' }}>Ngày</th>
                </tr>
              </thead>
              <tbody>
                {displayed.map((order) => {
                  const st = STATUS_MAP[order.status] ?? STATUS_MAP[ORDER_STATUSES.NEW];
                  const productSummary =
                    readTrimmedString(order.lineItems?.map((l) => l.productName).join(', ')) ?? '—';
                  return (
                    <tr
                      key={order.id}
                      onClick={() => selectOrder(order)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          selectOrder(order);
                        }
                      }}
                      role="button"
                      tabIndex={0}
                      aria-label={`Xem đơn của ${order.customerName}`}
                      style={{
                        borderBottom: '1px solid #f5f3ee',
                        cursor: 'pointer',
                        background: selected?.id === order.id ? '#faf7f0' : 'transparent',
                      }}
                    >
                      <td style={{ padding: '12px 16px', fontWeight: 500 }}>{order.customerName}</td>
                      <td style={{ padding: '12px 16px', color: '#888' }}>{order.customerPhone}</td>
                      <td
                        style={{
                          padding: '12px 16px',
                          color: '#888',
                          maxWidth: 180,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {productSummary}
                      </td>
                      <td style={{ padding: '12px 16px', fontWeight: 600 }}>{formatVnd(order.total)}</td>
                      <td className="ghs-status-cell" style={{ padding: '12px 16px' }}>
                        <span
                          className="ghs-status-badge"
                          style={{ background: st.bg, color: st.color }}
                        >
                          {st.label}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', color: '#999', fontSize: '0.8rem' }}>
                        {new Date(order.createdAt).toLocaleDateString('vi')}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            </div>
          )}
        </div>

        {selected && (
          <div className="ghs-card ghs-rfq-inbox-detail">
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 16,
              }}
            >
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>Chi tiết đơn hàng</h3>
              <button
                type="button"
                aria-label="Đóng chi tiết đơn hàng"
                onClick={closeSelected}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '1.2rem',
                  color: '#999',
                }}
              >
                ✕
              </button>
            </div>

            <div style={{ fontSize: '0.9rem', lineHeight: 2, color: '#555' }}>
              <div>
                <strong>Tên:</strong> {selected.customerName}
              </div>
              <div>
                <strong>SĐT:</strong>{' '}
                <a href={`tel:${selected.customerPhone}`} style={{ color: '#9A7520' }}>
                  {selected.customerPhone}
                </a>
              </div>
              <div>
                <strong>Địa chỉ:</strong> {selected.shippingAddress.street},{' '}
                {selected.shippingAddress.wardName}, {selected.shippingAddress.provinceName}
              </div>
              <div>
                <strong>Tổng:</strong> {formatVnd(selected.total)}
              </div>
            </div>

            <div style={{ marginTop: 16 }}>
              <strong style={{ fontSize: '0.85rem', color: '#555' }}>Sản phẩm:</strong>
              <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
                {selected.lineItems?.map((line, index) => (
                  <div
                    key={`${line.productId}-${index}`}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      gap: 12,
                      padding: '6px 10px',
                      background: '#f9f7f2',
                      borderRadius: 8,
                      fontSize: '0.85rem',
                    }}
                  >
                    <span>
                      {line.productName} ×{line.quantity}
                    </span>
                    <span style={{ color: '#666' }}>{formatVnd(line.lineTotal)}</span>
                  </div>
                ))}
              </div>
            </div>

            {selected.internalNote ? (
              <div
                style={{
                  marginTop: 12,
                  padding: 10,
                  background: '#f0f4ff',
                  borderRadius: 8,
                  fontSize: '0.8rem',
                  color: '#2563eb',
                }}
              >
                <strong>Ghi chú nội bộ:</strong> {selected.internalNote}
              </div>
            ) : null}

            <div style={{ marginTop: 16 }}>
              <textarea
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="Ghi chú nội bộ (tùy chọn)..."
                rows={2}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #e5e7eb',
                  borderRadius: 8,
                  fontSize: '0.85rem',
                  resize: 'vertical',
                }}
              />
            </div>

            <div style={{ marginTop: 16, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {NEXT_STATUSES[selected.status].map((status) => {
                const st = STATUS_MAP[status];
                return (
                  <button
                    key={status}
                    type="button"
                    className="ghs-inbox-status-btn"
                    onClick={() => handleStatus(selected.id, status)}
                    style={{
                      border: `1px solid ${st.color}`,
                      background: st.bg,
                      color: st.color,
                    }}
                  >
                    → {st.label}
                  </button>
                );
              })}
            </div>

            <div style={{ marginTop: 16, fontSize: '0.75rem', color: '#bbb' }}>
              Tạo lúc {new Date(selected.createdAt).toLocaleString('vi')}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
