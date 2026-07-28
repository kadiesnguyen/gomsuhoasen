// Refs read: v2/apps/v2-portal/src/pages/ProductList.tsx, components/ui/Table.tsx, EmptyState.tsx
// Kept: table layout, search, status badge, empty state, loading state
// Dropped: tenant filter, catalog profile selector, bulk actions, i18n

import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, apiAssetUrl, type ProductApi } from '../services/api';
import { mergeApiErrorMessage } from '../services/api-error';
import { useConfirm } from '../components/confirm-dialog';
import { LoadErrorState } from '../components/load-error-state';
import { MediaLightboxModal } from '../components/media-lightbox-modal';
import { MediaPreviewSurface } from '../components/media-preview';
import { useToast } from '../components/toast';
import { readDisplayText, readFirstDisplayText, readOptionalDisplayText } from '../utils/display-normalization';
import { readMediaPreviewKind } from '../utils/media-fields';

type Product = ProductApi;

const STATUS_MAP: Record<string, { label: string; bg: string; color: string }> = {
  ACTIVE: { label: 'Đang hiển thị', bg: '#ecfdf5', color: '#059669' },
  SOLD_OUT: { label: 'Đã bán', bg: '#fef2f2', color: '#b91c1c' },
  IN_PRODUCTION: { label: 'Đang chế tác', bg: '#eff6ff', color: '#2563eb' },
  DISPLAY_ONLY: { label: 'Chỉ trưng bày', bg: '#fef3c7', color: '#b45309' },
};

function readProductListParams(search: string): { search: string } | undefined {
  const normalizedSearch = readOptionalDisplayText(search);
  return normalizedSearch === undefined ? undefined : { search: normalizedSearch };
}

function readProductPriceLabel(product: Product): string {
  const explicitLabel = readOptionalDisplayText(product.priceLabel);
  if (explicitLabel !== undefined) return explicitLabel;
  return Number.isFinite(product.referencePrice) ? `${product.referencePrice.toLocaleString()}₫` : '—';
}

export function ProductListPage() {
  const navigate = useNavigate();
  const { confirm } = useConfirm();
  const { toast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [previewProduct, setPreviewProduct] = useState<Product | null>(null);

  const load = () => {
    setLoading(true);
    setLoadError('');
    api.catalog.list(readProductListParams(search))
      .then(setProducts)
      .catch((err) => setLoadError(mergeApiErrorMessage('Không tải được danh sách sản phẩm', err)))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const normalizedSearch = readOptionalDisplayText(search)?.toLowerCase();
  const filtered = useMemo(
    () => products.filter(p =>
      (normalizedSearch === undefined || p.name.toLowerCase().includes(normalizedSearch)) &&
      (statusFilter === '' || p.status === statusFilter)
    ),
    [products, normalizedSearch, statusFilter],
  );
  const statusFilters: Array<[string, string]> = [
    ['', 'Tất cả'],
    ...Object.entries(STATUS_MAP).map(([key, meta]) => [key, meta.label] as [string, string]),
  ];

  const requestDelete = (product: Product) => {
    confirm({
      title: 'Xóa sản phẩm?',
      description: `Sản phẩm "${product.name}" sẽ được ẩn khỏi showroom và giữ lại trong dữ liệu quản trị.`,
      confirmLabel: 'Xóa',
      variant: 'danger',
      onConfirm: async () => {
        try {
          await api.catalog.delete(product.id);
          setProducts(prev => prev.filter(item => item.id !== product.id));
          toast('Đã xóa sản phẩm.', 'success');
        } catch (err) {
          toast(mergeApiErrorMessage('Xóa sản phẩm thất bại', err), 'error');
          throw err;
        }
      },
    });
  };

  return (
    <div>
      <MediaLightboxModal
        isOpen={previewProduct !== null}
        kind={readMediaPreviewKind(readFirstDisplayText([previewProduct?.poster, previewProduct?.images?.[0]], ''))}
        src={previewProduct ? apiAssetUrl(readFirstDisplayText([previewProduct.poster, previewProduct.images?.[0]], '')) : undefined}
        title={previewProduct?.name ?? ''}
        subtitle={previewProduct ? readFirstDisplayText([previewProduct.poster, previewProduct.images?.[0]], '') : undefined}
        onClose={() => setPreviewProduct(null)}
        onOpenExternal={
          previewProduct
            ? () => window.open(apiAssetUrl(readFirstDisplayText([previewProduct.poster, previewProduct.images?.[0]], '')), '_blank', 'noopener,noreferrer')
            : undefined
        }
      />
      <div className="ghs-page-header">
        <div>
          <h1>Sản phẩm</h1>
          <p>{filtered.length} sản phẩm</p>
        </div>
        <button type="button" className="ghs-btn ghs-btn-primary" onClick={() => navigate('/admin/products/new')}>
          + Thêm sản phẩm
        </button>
      </div>

      {/* Toolbar */}
      <div className="ghs-card" style={{ marginBottom: 16, display: 'grid', gap: 12 }}>
        <input
          type="text"
          className="ghs-input"
          placeholder="Tìm kiếm sản phẩm..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ maxWidth: 360 }}
        />
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }} role="group" aria-label="Lọc theo trạng thái">
          {statusFilters.map(([key, label]) => (
            <button
              key={key || 'ALL'}
              type="button"
              className={statusFilter === key ? 'ghs-btn ghs-btn-primary' : 'ghs-btn ghs-btn-ghost'}
              aria-pressed={statusFilter === key}
              onClick={() => setStatusFilter(key)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="ghs-empty">Đang tải...</div>
      ) : loadError ? (
        <LoadErrorState message={loadError} onRetry={load} />
      ) : filtered.length === 0 ? (
        <div className="ghs-card ghs-empty">
          <div style={{ fontSize: '3rem', marginBottom: 12 }}>📦</div>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 600, color: '#333', marginBottom: 8 }}>Chưa có sản phẩm</h3>
          <p>Tạo sản phẩm đầu tiên để bắt đầu.</p>
        </div>
      ) : (
        <div className="ghs-card" style={{ padding: 0, overflow: 'hidden' }}>
          <table className="ghs-table">
            <thead>
              <tr>
                <th>Ảnh</th>
                <th>Tên</th>
                <th>Bộ sưu tập</th>
                <th>Men</th>
                <th>Giá</th>
                <th>3D</th>
                <th>Trạng thái</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => {
                const st = STATUS_MAP[p.status] ?? STATUS_MAP.DISPLAY_ONLY;
                const thumbnail = readFirstDisplayText([p.poster, p.images?.[0]], '');
                return (
                  <tr
                    key={p.id}
                    onClick={() => navigate(`/admin/products/${p.id}/edit`)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        navigate(`/admin/products/${p.id}/edit`);
                      }
                    }}
                    role="link"
                    tabIndex={0}
                    aria-label={`Xem sản phẩm ${p.name}`}
                    style={{ cursor: 'pointer', transition: 'background 0.1s' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--ghs-surface-muted)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <td>
                      <div style={{ width: 64 }}>
                        {thumbnail.length > 0 ? (
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              setPreviewProduct(p);
                            }}
                            style={{ padding: 0, border: 0, background: 'transparent', cursor: 'pointer' }}
                            aria-label={`Xem lớn ${p.name}`}
                          >
                            <MediaPreviewSurface
                              kind={readMediaPreviewKind(thumbnail)}
                              src={apiAssetUrl(thumbnail)}
                              title={p.name}
                              aspectRatio="4 / 3"
                              radius={8}
                              minHeight={48}
                              fit="contain"
                              padding={6}
                              background="linear-gradient(180deg, #fbf7ef 0%, #f2e6cd 100%)"
                            />
                          </button>
                        ) : (
                          <div style={{ width: 64, minHeight: 48, aspectRatio: '4 / 3', borderRadius: 8, overflow: 'hidden', background: 'var(--ghs-surface-muted)', display: 'grid', placeItems: 'center', color: 'var(--ghs-primary)', fontSize: '0.8rem' }}>
                            GHS
                          </div>
                        )}
                      </div>
                    </td>
                    <td style={{ fontWeight: 500 }}>{p.name}</td>
                    <td style={{ color: 'var(--ghs-text-muted)' }}>{readDisplayText(p.collection, '—')}</td>
                    <td style={{ color: 'var(--ghs-text-muted)' }}>{readDisplayText(p.glaze, '—')}</td>
                    <td style={{ color: 'var(--ghs-primary-hover)', fontWeight: 600 }}>{readProductPriceLabel(p)}</td>
                    <td>{p.modelUrl ? '✅' : '—'}</td>
                    <td>
                      <span className="ghs-badge" style={{ background: st.bg, color: st.color }}>
                        {st.label}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
                        <button
                          type="button"
                          className="ghs-btn ghs-btn-ghost ghs-btn-sm"
                          onClick={(event) => {
                            event.stopPropagation();
                            navigate(`/admin/products/${p.id}/edit`);
                          }}
                        >
                          Sửa
                        </button>
                        <button
                          type="button"
                          className="ghs-btn ghs-btn-danger ghs-btn-sm"
                          onClick={(event) => {
                            event.stopPropagation();
                            requestDelete(p);
                          }}
                        >
                          Xóa
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
