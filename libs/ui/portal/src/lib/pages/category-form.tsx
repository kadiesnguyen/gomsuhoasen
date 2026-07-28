import { FormEvent, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  FILE_ASSET_FIELD_REFS,
  FILE_ASSET_MODULE_REFS,
  slugifyVi as slugify,
} from '@gomhoasen/contracts';
import { readTrimmedString } from '@vt/common-utils';
import { Button } from '@vt/ui-components';
import { api, type CategoryApi } from '../services/api';
import { mergeApiErrorMessage } from '../services/api-error';
import { LoadErrorState } from '../components/load-error-state';
import { UploadField } from '../components/upload-field';
import { useToast } from '../components/toast';
import { readFirstString, readStringInput } from '../utils/form-normalization';

interface CategoryFormData {
  name: string;
  slug: string;
  description: string;
  image: string;
  sortOrder: number | '';
}

const EMPTY: CategoryFormData = {
  name: '',
  slug: '',
  description: '',
  image: '',
  sortOrder: '',
};

export function CategoryFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const isEdit = !!id;
  const [form, setForm] = useState<CategoryFormData>(EMPTY);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isEdit || !id) return;
    setLoading(true);
    setLoadError('');
    api.category
      .get(id)
      .then((category: CategoryApi) => {
        setForm({
          name: readStringInput(category.name),
          slug: readStringInput(category.slug),
          description: readStringInput(category.description),
          image: readStringInput(category.image),
          sortOrder: typeof category.sortOrder === 'number' ? category.sortOrder : '',
        });
      })
      .catch((err) => setLoadError(mergeApiErrorMessage('Không tải được danh mục', err)))
      .finally(() => setLoading(false));
  }, [id, isEdit, reloadKey]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const val = type === 'number' ? (value === '' ? '' : Number(value)) : value;
    setForm((prev) => {
      const next = { ...prev, [name]: val };
      if (name === 'name' && !isEdit) next.slug = slugify(value);
      return next;
    });
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const payload = {
      name: form.name,
      slug: readTrimmedString(form.slug),
      description: readTrimmedString(form.description),
      image: readTrimmedString(form.image),
      sortOrder: typeof form.sortOrder === 'number' ? form.sortOrder : undefined,
    };
    try {
      await (isEdit && id ? api.category.update(id, payload) : api.category.create(payload));
      toast(isEdit ? 'Đã cập nhật danh mục.' : 'Đã tạo danh mục.', 'success');
      navigate('/admin/categories');
    } catch (err) {
      const message = mergeApiErrorMessage('Lưu danh mục thất bại', err);
      setError(message);
      toast(message, 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div style={{ textAlign: 'center', padding: 48, color: '#999' }}>Đang tải danh mục...</div>;
  if (loadError) {
    return <LoadErrorState message={loadError} onRetry={() => setReloadKey((value) => value + 1)} />;
  }

  return (
    <div>
      <div className="ghs-page-header">
        <div><h1>
          {isEdit ? 'Chỉnh sửa danh mục' : 'Thêm danh mục'}
        </h1></div>
        <button type="button" onClick={() => navigate('/admin/categories')} className="ghs-btn ghs-btn-ghost">
          ← Quay lại
        </button>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="ghs-card" style={{ marginBottom: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <label className="ghs-label">Tên danh mục *</label>
              <input name="name" value={form.name} onChange={handleChange} required className="ghs-input" />
            </div>
            <div>
              <label className="ghs-label">Slug</label>
              <input name="slug" value={form.slug} onChange={handleChange} className="ghs-input" />
            </div>
            <div>
              <label className="ghs-label">Thứ tự hiển thị</label>
              <input name="sortOrder" type="number" value={form.sortOrder} onChange={handleChange} className="ghs-input" />
            </div>
          </div>
          <div style={{ marginTop: 16 }}>
            <label className="ghs-label">Mô tả</label>
            <textarea name="description" value={form.description} onChange={handleChange} rows={4} className="ghs-textarea" />
          </div>
        </div>

        <div className="ghs-card" style={{ marginBottom: 16 }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#9A7520', marginBottom: 8, marginTop: 0 }}>Ảnh danh mục</h3>
          <p style={{ marginTop: 0, marginBottom: 16, color: '#777', fontSize: '0.85rem' }}>
            Ảnh hiển thị trên trang Sản phẩm. Nếu không upload, website dùng ảnh mặc định hiện tại.
          </p>
          <UploadField
            label="Ảnh danh mục"
            value={form.image ? [form.image] : []}
            accept="image/png,image/jpeg,image/webp"
            maxSizeMb={5}
            uploadContext={{
              moduleRef: FILE_ASSET_MODULE_REFS.CATALOG,
              fieldRef: FILE_ASSET_FIELD_REFS.CATEGORY_IMAGE,
              entityRef: id,
            }}
            onChange={(value) => setForm((prev) => ({ ...prev, image: readFirstString(value) }))}
          />
        </div>

        {error && <div role="alert" style={{ color: '#b91c1c', marginBottom: 12 }}>{error}</div>}

        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
          <Button variant="secondary" type="button" onClick={() => navigate('/admin/categories')}>Hủy</Button>
          <Button className="ghs-btn ghs-btn-primary" variant="primary" type="submit" isLoading={saving}>{isEdit ? 'Cập nhật' : 'Tạo danh mục'}</Button>
        </div>
      </form>
    </div>
  );
}
