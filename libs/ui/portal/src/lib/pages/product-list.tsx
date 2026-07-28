// Refs read: v2/apps/v2-portal/src/pages/ProductList.tsx, components/ui/Table.tsx, EmptyState.tsx
// Kept: table layout, search, status badge, empty state, loading state
// Dropped: tenant filter, catalog profile selector, bulk actions, i18n

import { useEffect, useState } from 'react';
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
  const filtered = products.filter(p =>
    normalizedSearch === undefined || p.name.toLowerCase().includes(normalizedSearch)
  );

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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h1 style={{ fontSize: '1.6rem', fontWeight: 700, color: '#191714', margin: 0 }}>Sản phẩm</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{ fontSize: '0.85rem', color: '#999' }}>{filtered.length} sản phẩm</span>
          <button type="button" onClick={() => navigate('/admin/products/new')} style={{ background: 'linear-gradient(135deg, #9A7520, #C4A550)', color: '#fff', border: 'none', borderRadius: 10, padding: '8px 18px', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}>
            + Tạo sản phẩm
          </button>
        </div>
      </div>

      {/* Search */}
      <div style={{ marginBottom: 16 }}>
        <input
          type="text" placeholder="Tìm kiếm sản phẩm..." value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ width: '100%', maxWidth: 360, padding: '10px 14px', border: '1px solid #ddd', borderRadius: 10, fontSize: '0.9rem', outline: 'none', background: '#fff', boxSizing: 'border-box' }}
        />
      </div>

      {/* Table */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 48, color: '#999' }}>Đang tải...</div>
      ) : loadError ? (
        <LoadErrorState message={loadError} onRetry={load} />
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 48, background: '#fff', borderRadius: 16 }}>
          <div style={{ fontSize: '3rem', marginBottom: 12 }}>📦</div>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 600, color: '#333', marginBottom: 8 }}>Chưa có sản phẩm</h3>
          <p style={{ color: '#999', fontSize: '0.9rem' }}>Tạo sản phẩm đầu tiên để bắt đầu.</p>
        </div>
      ) : (
        <div style={{ background: '#fff', borderRadius: 16, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #f0ede6', textAlign: 'left' }}>
                <th style={{ padding: '12px 16px', fontWeight: 600, color: '#666' }}>Ảnh</th>
                <th style={{ padding: '12px 16px', fontWeight: 600, color: '#666' }}>Tên</th>
                <th style={{ padding: '12px 16px', fontWeight: 600, color: '#666' }}>Bộ sưu tập</th>
                <th style={{ padding: '12px 16px', fontWeight: 600, color: '#666' }}>Men</th>
                <th style={{ padding: '12px 16px', fontWeight: 600, color: '#666' }}>Giá</th>
                <th style={{ padding: '12px 16px', fontWeight: 600, color: '#666' }}>3D</th>
                <th style={{ padding: '12px 16px', fontWeight: 600, color: '#666' }}>Trạng thái</th>
                <th style={{ padding: '12px 16px', fontWeight: 600, color: '#666' }} />
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
                    style={{ borderBottom: '1px solid #f5f3ee', cursor: 'pointer', transition: 'background 0.1s' }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#faf7f0')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <td style={{ padding: '12px 16px' }}>
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
                          <div style={{ width: 64, minHeight: 48, aspectRatio: '4 / 3', borderRadius: 8, overflow: 'hidden', background: '#f7f4ec', display: 'grid', placeItems: 'center', color: '#9A7520', fontSize: '0.8rem' }}>
                            GHS
                          </div>
                        )}
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px', fontWeight: 500 }}>{p.name}</td>
                    <td style={{ padding: '12px 16px', color: '#888' }}>{readDisplayText(p.collection, '—')}</td>
                    <td style={{ padding: '12px 16px', color: '#888' }}>{readDisplayText(p.glaze, '—')}</td>
                    <td style={{ padding: '12px 16px', color: '#9A7520', fontWeight: 600 }}>{readProductPriceLabel(p)}</td>
                    <td style={{ padding: '12px 16px' }}>{p.modelUrl ? '✅' : '—'}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ display: 'inline-block', padding: '3px 10px', borderRadius: 20, fontSize: '0.75rem', fontWeight: 600, background: st.bg, color: st.color }}>
                        {st.label}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            navigate(`/admin/products/${p.id}/edit`);
                          }}
                          style={{ border: '1px solid #d9cfbb', color: '#7b5e18', background: '#fff', borderRadius: 8, padding: '6px 10px', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600 }}
                        >
                          Sửa
                        </button>
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            requestDelete(p);
                          }}
                          style={{ border: '1px solid #f2caca', color: '#b91c1c', background: '#fff', borderRadius: 8, padding: '6px 10px', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600 }}
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
