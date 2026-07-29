import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, apiAssetUrl, type CategoryApi } from '../services/api';
import { mergeApiErrorMessage } from '../services/api-error';
import { useConfirm } from '../components/confirm-dialog';
import { LoadErrorState } from '../components/load-error-state';
import { useToast } from '../components/toast';
import { readOptionalDisplayText } from '../utils/display-normalization';

type Category = CategoryApi;

export function CategoryListPage() {
  const navigate = useNavigate();
  const { confirm } = useConfirm();
  const { toast } = useToast();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const load = () => {
    setLoading(true);
    setLoadError('');
    api.category
      .list()
      .then(setCategories)
      .catch((err) => setLoadError(mergeApiErrorMessage('Không tải được danh sách danh mục', err)))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const requestDelete = (category: Category) => {
    confirm({
      title: 'Xóa danh mục?',
      description: `Danh mục "${category.name}" sẽ được ẩn khỏi hệ thống.`,
      confirmLabel: 'Xóa',
      variant: 'danger',
      onConfirm: async () => {
        try {
          await api.category.delete(category.id);
          setCategories((prev) => prev.filter((item) => item.id !== category.id));
          toast('Đã xóa danh mục.', 'success');
        } catch (err) {
          toast(mergeApiErrorMessage('Xóa danh mục thất bại', err), 'error');
          throw err;
        }
      },
    });
  };

  return (
    <div>
      <div className="ghs-page-header">
        <div><h1>Danh mục</h1></div>
        <button
          type="button"
          onClick={() => navigate('/admin/categories/new')}
          className="ghs-btn ghs-btn-primary"
        >
          + Thêm danh mục
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 48, color: '#999' }}>Đang tải...</div>
      ) : loadError ? (
        <LoadErrorState message={loadError} onRetry={load} />
      ) : categories.length === 0 ? (
        <div className="ghs-card ghs-empty">
          <h3 style={{ fontWeight: 600, color: '#333', marginBottom: 8 }}>Chưa có danh mục</h3>
          <p style={{ color: '#888', marginBottom: 16 }}>Tạo danh mục để gom nhóm sản phẩm trên showroom.</p>
        </div>
      ) : (
        <div className="ghs-card" style={{ padding: 0, overflow: 'hidden' }}>
          <table className="ghs-table">
            <thead>
              <tr style={{ background: '#fafaf8', borderBottom: '1px solid #eee' }}>
                <th style={{ textAlign: 'left', padding: '12px 16px', fontSize: '0.78rem', color: '#888' }}>Ảnh</th>
                <th style={{ textAlign: 'left', padding: '12px 16px', fontSize: '0.78rem', color: '#888' }}>Tên</th>
                <th style={{ textAlign: 'left', padding: '12px 16px', fontSize: '0.78rem', color: '#888' }}>Slug</th>
                <th style={{ textAlign: 'left', padding: '12px 16px', fontSize: '0.78rem', color: '#888' }}>Mô tả</th>
                <th style={{ textAlign: 'right', padding: '12px 16px', fontSize: '0.78rem', color: '#888' }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((category) => (
                <tr key={category.id} style={{ borderBottom: '1px solid #f0f0ee' }}>
                  <td style={{ padding: '12px 16px' }}>
                    {category.image ? (
                      <img
                        src={apiAssetUrl(category.image)}
                        alt={category.name}
                        style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 8, border: '1px solid #eee' }}
                      />
                    ) : (
                      <div style={{ width: 48, height: 48, borderRadius: 8, background: '#f3f1ec', color: '#999', fontSize: 10, display: 'grid', placeItems: 'center' }}>
                        Mặc định
                      </div>
                    )}
                  </td>
                  <td style={{ padding: '14px 16px', fontWeight: 600, color: '#191714' }}>{category.name}</td>
                  <td style={{ padding: '14px 16px', color: '#666', fontFamily: 'monospace', fontSize: '0.82rem' }}>{category.slug}</td>
                  <td style={{ padding: '14px 16px', color: '#666', fontSize: '0.88rem' }}>
                    {readOptionalDisplayText(category.description) ?? '—'}
                  </td>
                  <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                    <div className="ghs-table-actions">
                      <button
                        type="button"
                        className="ghs-btn ghs-btn-ghost ghs-btn-sm"
                        onClick={() => navigate(`/admin/categories/${category.id}/edit`)}
                      >
                        Sửa
                      </button>
                      <button
                        type="button"
                        className="ghs-btn ghs-btn-danger ghs-btn-sm"
                        onClick={() => requestDelete(category)}
                      >
                        Xóa
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
