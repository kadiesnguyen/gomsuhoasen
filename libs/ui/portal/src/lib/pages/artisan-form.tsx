// Artisan create/edit form
import { useState, useEffect, FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api, type ArtisanApi } from '../services/api';
import { mergeApiErrorMessage } from '../services/api-error';
import { Button } from '@vt/ui-components';
import { UploadField } from '../components/upload-field';
import { useToast } from '../components/toast';
import { LoadErrorState } from '../components/load-error-state';
import {
  ARTISAN_STATUSES,
  ARTISAN_STATUS_VALUES,
  FILE_ASSET_FIELD_REFS,
  FILE_ASSET_MODULE_REFS,
  slugifyVi as slugify,
  type ArtisanStatus,
} from '@gomhoasen/contracts';
import { readTrimmedString } from '@vt/common-utils';
import { readCsvStringList, readFirstString, readStringArray, readStringInput } from '../utils/form-normalization';

interface ArtisanFormData {
  name: string; slug: string; title: string; bio: string;
  avatar: string; coverImage: string; yearsExperience: number | '';
  specialty: string; workshop: string; location: string;
  lineage: string; certifications: string; phone: string; email: string; status: ArtisanStatus;
}

const EMPTY: ArtisanFormData = {
  name: '', slug: '', title: '', bio: '', avatar: '', coverImage: '',
  yearsExperience: '', specialty: '', workshop: '', location: '',
  lineage: '', certifications: '', phone: '', email: '', status: ARTISAN_STATUSES.ACTIVE,
};

function readArtisanStatus(value: unknown): ArtisanStatus {
  return ARTISAN_STATUS_VALUES.includes(value as ArtisanStatus)
    ? (value as ArtisanStatus)
    : ARTISAN_STATUSES.ACTIVE;
}

export function ArtisanFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const isEdit = !!id;
  const [form, setForm] = useState<ArtisanFormData>(EMPTY);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isEdit && id) {
      setLoading(true);
      setLoadError('');
      api.artisan.get(id).then((a: ArtisanApi) => {
        setForm({
          name: readStringInput(a.name), slug: readStringInput(a.slug),
          title: readStringInput(a.title), bio: readStringInput(a.bio),
          avatar: readStringInput(a.avatar), coverImage: readStringInput(a.coverImage),
          yearsExperience: typeof a.yearsExperience === 'number' ? a.yearsExperience : '',
          specialty: readStringInput(a.specialty), workshop: readStringInput(a.workshop),
          location: readStringInput(a.location),
          lineage: readStringInput(a.lineage),
          certifications: readStringArray(a.certifications).join(', '),
          phone: readStringInput(a.phone), email: readStringInput(a.email),
          status: readArtisanStatus(readTrimmedString(a.status)),
        });
      }).catch((err) => setLoadError(mergeApiErrorMessage('Không tải được nghệ nhân', err))).finally(() => setLoading(false));
    }
  }, [id, isEdit, reloadKey]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const val = type === 'number' ? (value === '' ? '' : Number(value)) : value;
    setForm(prev => {
      const next = { ...prev, [name]: val };
      if (name === 'name' && !isEdit) next.slug = slugify(value);
      return next;
    });
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true); setError(null);
    const payload = {
      ...form,
      avatar: readTrimmedString(form.avatar),
      yearsExperience: typeof form.yearsExperience === 'number' ? form.yearsExperience : undefined,
      certifications: readCsvStringList(form.certifications),
    };
    try {
      await (isEdit && id ? api.artisan.update(id, payload) : api.artisan.create(payload));
      toast(isEdit ? 'Đã cập nhật nghệ nhân.' : 'Đã tạo nghệ nhân.', 'success');
      navigate('/admin/artisans');
    } catch (err) {
      const message = mergeApiErrorMessage('Lưu nghệ nhân thất bại', err);
      setError(message);
      toast(message, 'error');
    }
    finally { setSaving(false); }
  };

  if (loading) return <div style={{ textAlign: 'center', padding: 48, color: '#999' }}>Đang tải hồ sơ nghệ nhân...</div>;
  if (loadError) {
    return <LoadErrorState message={loadError} onRetry={() => setReloadKey((value) => value + 1)} />;
  }

  const f: React.CSSProperties = { width: '100%', minHeight: 'var(--ghs-control-h)', border: '1px solid var(--ghs-border)', borderRadius: 8, padding: '0 12px', boxSizing: 'border-box' };
  const l: React.CSSProperties = { display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--ghs-text-muted)', marginBottom: 6 };

  return (
    <div>
      <div className="ghs-page-header">
        <div><h1>
          {isEdit ? 'Chỉnh sửa nghệ nhân' : 'Thêm nghệ nhân'}
        </h1></div>
        <button type="button" onClick={() => navigate('/admin/artisans')} className="ghs-btn ghs-btn-ghost">← Quay lại</button>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="ghs-card" style={{ marginBottom: 16 }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#9A7520', marginBottom: 16, marginTop: 0 }}>Thông tin cá nhân</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div><label style={l}>Họ tên *</label><input name="name" value={form.name} onChange={handleChange} required style={f} /></div>
            <div><label style={l}>Slug</label><input name="slug" value={form.slug} onChange={handleChange} style={f} /></div>
            <div><label style={l}>Danh hiệu</label><input name="title" value={form.title} onChange={handleChange} placeholder="Nghệ nhân ưu tú" style={f} /></div>
            <div><label style={l}>Trạng thái</label>
              <select name="status" value={form.status} onChange={handleChange} style={f}>
                <option value={ARTISAN_STATUSES.ACTIVE}>Đang hoạt động</option>
                <option value={ARTISAN_STATUSES.INACTIVE}>Tạm nghỉ</option>
              </select>
            </div>
          </div>
          <div style={{ marginTop: 16 }}><label style={l}>Tiểu sử</label><textarea name="bio" value={form.bio} onChange={handleChange} rows={4} style={{ ...f, resize: 'vertical' }} /></div>
        </div>

        <div className="ghs-card" style={{ marginBottom: 16 }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#9A7520', marginBottom: 16, marginTop: 0 }}>Chuyên môn</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div><label style={l}>Chuyên môn</label><input name="specialty" value={form.specialty} onChange={handleChange} placeholder="Men Cobalt, Vẽ tay" style={f} /></div>
            <div><label style={l}>Xưởng / Làng nghề</label><input name="workshop" value={form.workshop} onChange={handleChange} placeholder="Làng gốm Bình Dương" style={f} /></div>
            <div><label style={l}>Địa chỉ</label><input name="location" value={form.location} onChange={handleChange} style={f} /></div>
            <div><label style={l}>Kinh nghiệm (năm)</label><input name="yearsExperience" type="number" value={form.yearsExperience} onChange={handleChange} style={f} /></div>
          </div>
          <div style={{ marginTop: 16 }}><label style={l}>Phổ hệ / Truyền nhân</label><input name="lineage" value={form.lineage} onChange={handleChange} placeholder="Truyền nhân đời thứ 5, dòng họ Trần — Bát Tràng" style={f} /></div>
          <div style={{ marginTop: 16 }}><label style={l}>Chứng nhận (phân cách bằng dấu phẩy)</label><input name="certifications" value={form.certifications} onChange={handleChange} placeholder="Nghệ nhân ưu tú, Hội gốm truyền thống" style={f} /></div>
        </div>

        <div className="ghs-card" style={{ marginBottom: 16 }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#9A7520', marginBottom: 16, marginTop: 0 }}>Liên hệ & Media</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div><label style={l}>SĐT</label><input name="phone" value={form.phone} onChange={handleChange} style={f} /></div>
            <div><label style={l}>Email</label><input name="email" value={form.email} onChange={handleChange} style={f} /></div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 16 }}>
            <UploadField
              label="Ảnh đại diện"
              value={form.avatar ? [form.avatar] : []}
              accept="image/png,image/jpeg,image/webp"
              maxSizeMb={5}
              uploadContext={{ moduleRef: FILE_ASSET_MODULE_REFS.ARTISAN, fieldRef: FILE_ASSET_FIELD_REFS.AVATAR, entityRef: id }}
              onChange={(value) => setForm(prev => ({ ...prev, avatar: readFirstString(value) }))}
            />
            <UploadField
              label="Ảnh bìa"
              value={form.coverImage ? [form.coverImage] : []}
              accept="image/png,image/jpeg,image/webp"
              maxSizeMb={10}
              uploadContext={{ moduleRef: FILE_ASSET_MODULE_REFS.ARTISAN, fieldRef: FILE_ASSET_FIELD_REFS.COVER_IMAGE, entityRef: id }}
              onChange={(value) => setForm(prev => ({ ...prev, coverImage: readFirstString(value) }))}
            />
          </div>
        </div>

        {error && <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 12, padding: '10px 14px', fontSize: '0.85rem', color: '#b91c1c', marginBottom: 16 }}>⚠️ {error}</div>}

        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
          <Button className="ghs-btn ghs-btn-ghost" variant="secondary" type="button" onClick={() => navigate('/admin/artisans')}>Hủy</Button>
          <Button className="ghs-btn ghs-btn-primary" variant="primary" type="submit" isLoading={saving}>{isEdit ? 'Cập nhật' : 'Thêm nghệ nhân'}</Button>
        </div>
      </form>
    </div>
  );
}
