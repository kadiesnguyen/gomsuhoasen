import { useEffect, useState, type CSSProperties } from 'react';
import { api, apiAssetUrl } from '../services/api';
import { mergeApiErrorMessage } from '../services/api-error';
import { useToast } from '../components/toast';
import { LoadErrorState } from '../components/load-error-state';
import type { SiteConfigApi, SiteContactApi, SiteSeoApi } from '../services/api';
import { readStringInput } from '../utils/form-normalization';
import { UploadField } from '../components/upload-field';

// ---- Typed state matching UpdateSiteConfigDto exactly ----

interface SiteContact {
  phone?: string;
  email?: string;
  zaloOA?: string;
  address?: string;
}

interface SiteSeo {
  defaultTitle?: string;
  defaultDescription?: string;
  ogImage?: string;
}

interface SiteConfigForm {
  brandName: string;
  tagline: string;
  subtitle: string;
  location: string;
  contact: SiteContact;
  seo: SiteSeo;
}

const EMPTY_FORM: SiteConfigForm = {
  brandName: '',
  tagline: '',
  subtitle: '',
  location: '',
  contact: { phone: '', email: '', zaloOA: '', address: '' },
  seo: { defaultTitle: '', defaultDescription: '', ogImage: '' },
};

/** Extract only the fields that UpdateSiteConfigDto accepts. */
function toPayload(form: SiteConfigForm) {
  return {
    brandName: form.brandName,
    tagline: form.tagline,
    subtitle: form.subtitle,
    location: form.location,
    contact: { ...form.contact },
    seo: { ...form.seo },
  };
}

function fromContact(contact?: SiteContactApi): SiteContact {
  return {
    phone: readStringInput(contact?.phone),
    email: readStringInput(contact?.email),
    zaloOA: readStringInput(contact?.zaloOA),
    address: readStringInput(contact?.address),
  };
}

function fromSeo(seo?: SiteSeoApi): SiteSeo {
  return {
    defaultTitle: readStringInput(seo?.defaultTitle),
    defaultDescription: readStringInput(seo?.defaultDescription),
    ogImage: readStringInput(seo?.ogImage),
  };
}

/** Safely hydrate form state from typed API contract (ignoring extra server fields). */
function fromApiResponse(raw?: SiteConfigApi): SiteConfigForm {
  return {
    brandName: readStringInput(raw?.brandName),
    tagline: readStringInput(raw?.tagline),
    subtitle: readStringInput(raw?.subtitle),
    location: readStringInput(raw?.location),
    contact: fromContact(raw?.contact),
    seo: fromSeo(raw?.seo),
  };
}

// ---- Field descriptors ----

type TopLevelKey = 'brandName' | 'tagline' | 'subtitle' | 'location';
type ContactKey = keyof SiteContact;
type SeoKey = keyof SiteSeo;

type FieldDescriptor =
  | { key: TopLevelKey; label: string; type?: string; rows?: number; group?: undefined }
  | { key: ContactKey; label: string; type?: string; rows?: number; group: 'contact' }
  | { key: SeoKey; label: string; type?: string; rows?: number; group: 'seo' };

const FIELDS: FieldDescriptor[] = [
  { key: 'brandName', label: 'Tên thương hiệu' },
  { key: 'tagline', label: 'Tiêu đề trang chủ' },
  { key: 'subtitle', label: 'Phụ đề trang chủ', type: 'textarea', rows: 2 },
  { key: 'location', label: 'Vị trí' },
  { key: 'phone', label: 'Số điện thoại', group: 'contact' },
  { key: 'email', label: 'Email liên hệ', group: 'contact' },
  { key: 'zaloOA', label: 'Link Zalo', group: 'contact' },
  { key: 'address', label: 'Địa chỉ', group: 'contact', type: 'textarea', rows: 2 },
  { key: 'defaultTitle', label: 'Tiêu đề SEO mặc định', group: 'seo' },
  { key: 'defaultDescription', label: 'Mô tả SEO', group: 'seo' },
];

const inputStyle: CSSProperties = {
  width: '100%',
  padding: '8px 12px',
  border: '1px solid #ddd',
  borderRadius: 6,
  fontSize: '0.9rem',
};

const textAreaStyle: CSSProperties = {
  ...inputStyle,
  resize: 'vertical',
};

export function SiteConfigPage() {
  const [form, setForm] = useState<SiteConfigForm>(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    setLoading(true);
    setLoadError('');
    api.site.getConfig()
      .then((res) => setForm(fromApiResponse(res)))
      .catch((err) => {
        const message = mergeApiErrorMessage('Không tải được cấu hình', err);
        setLoadError(message);
        toast(message, 'error');
      })
      .finally(() => setLoading(false));
  }, [reloadKey, toast]);

  const handleChange = (field: FieldDescriptor, value: string) => {
    setForm((prev) => {
      if (field.group === 'contact') {
        return { ...prev, contact: { ...prev.contact, [field.key]: value } };
      }
      if (field.group === 'seo') {
        return { ...prev, seo: { ...prev.seo, [field.key]: value } };
      }
      return { ...prev, [field.key]: value };
    });
  };

  const getValue = (field: FieldDescriptor): string => {
    if (field.group === 'contact') return readStringInput(form.contact[field.key]);
    if (field.group === 'seo') return readStringInput(form.seo[field.key]);
    return form[field.key];
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.site.updateConfig(toPayload(form));
      toast('Đã lưu cấu hình thành công', 'success');
    } catch (err) {
      toast(mergeApiErrorMessage('Lưu cấu hình thất bại', err), 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#888' }}>Đang tải...</div>;
  if (loadError) {
    return <LoadErrorState message={loadError} onRetry={() => setReloadKey((value) => value + 1)} />;
  }

  const ogImage = readStringInput(form.seo.ogImage);

  return (
    <div style={{ maxWidth: 760, margin: '0 auto' }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: 8 }}>Cấu hình website</h1>
      <div style={{ color: '#7a7265', fontSize: '0.9rem', marginBottom: 24 }}>
        Quản lý thông tin thương hiệu, liên hệ và bộ dữ liệu SEO mặc định dùng cho toàn site.
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {FIELDS.map((f) => {
          const val = getValue(f);
          const inputId = `site-config-${f.group ?? 'root'}-${f.key}`;
          return (
            <div key={`${f.group ?? 'root'}-${f.key}`}>
              <label htmlFor={inputId} style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 4, color: '#555' }}>
                {f.label}
              </label>
              {f.type === 'textarea' ? (
                <textarea
                  id={inputId}
                  value={val}
                  onChange={(e) => handleChange(f, e.target.value)}
                  rows={f.rows ?? 3}
                  style={textAreaStyle}
                />
              ) : (
                <input
                  id={inputId}
                  type="text"
                  value={val}
                  onChange={(e) => handleChange(f, e.target.value)}
                  style={inputStyle}
                />
              )}
            </div>
          );
        })}

        <div>
          <UploadField
            label="Ảnh SEO / chia sẻ mạng xã hội"
            value={ogImage ? [ogImage] : []}
            accept="image/*"
            maxFiles={1}
            maxSizeMb={10}
            helperText="Dùng cho Open Graph, chia sẻ Facebook/Zalo và ảnh mặc định khi hiển thị link."
            uploadContext={{ moduleRef: 'site-config', fieldRef: 'seo.ogImage' }}
            onChange={(value) => {
              setForm((prev) => ({ ...prev, seo: { ...prev.seo, ogImage: value[0] ?? '' } }));
            }}
          />
          {ogImage ? (
            <div style={{ fontSize: '0.78rem', color: '#8a8178' }}>
              URL xem nhanh:{' '}
              <a href={apiAssetUrl(ogImage)} target="_blank" rel="noreferrer" style={{ color: '#7b5e18' }}>
                {apiAssetUrl(ogImage)}
              </a>
            </div>
          ) : null}
        </div>
      </div>

      <div style={{ marginTop: 24 }}>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          style={{
            padding: '10px 24px', background: '#9a7520', color: '#fff', border: 'none',
            borderRadius: 6, fontSize: '0.9rem', fontWeight: 600, cursor: saving ? 'wait' : 'pointer',
            opacity: saving ? 0.6 : 1,
          }}
        >
          {saving ? 'Đang lưu...' : 'Lưu cấu hình'}
        </button>
      </div>
    </div>
  );
}
