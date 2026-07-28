import { useEffect, useMemo, useState, type CSSProperties, type ChangeEvent, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  api,
  apiAssetUrl,
  type ProductApi,
  type CategoryApi,
  type ProductHotspotApi,
  type ProductStoryApi,
  type ProductVariantApi,
  type ProductViewSectionApi,
} from '../services/api';
import { mergeApiErrorMessage } from '../services/api-error';
import { Button } from '@vt/ui-components';
import { UploadField } from '../components/upload-field';
import { MediaLightboxModal } from '../components/media-lightbox-modal';
import { LoadErrorState } from '../components/load-error-state';
import { useToast } from '../components/toast';
import { useConfirm } from '../components/confirm-dialog';
import {
  PRODUCT_STATUSES,
  PRODUCT_STATUS_VALUES,
  PRODUCT_VARIANT_STATUSES,
  PROVENANCE_TYPES,
  PROVENANCE_TYPE_VALUES,
  FILE_ASSET_FIELD_REFS,
  FILE_ASSET_MODULE_REFS,
  slugifyVi as slugify,
  type ProductStatus,
  type ProductVariantStatus,
  type ProvenanceType,
} from '@gomhoasen/contracts';
import { readFirstTextInputValue, readTextInputValue, readTrimmedString } from '@vt/common-utils';
import {
  hasTrimmedString,
  readCsvStringList,
  readFirstString,
  readStringArray,
  readStringInput,
} from '../utils/form-normalization';
import { readDisplayText, readOptionalDisplayText } from '../utils/display-normalization';
import { fileNameFromPath } from '../utils/media-fields';

function formatOptionalDate(value: unknown, fallback: string): string {
  const text = readOptionalDisplayText(value);
  return text === undefined ? fallback : new Date(text).toLocaleDateString('vi');
}

interface ArtisanOption {
  id: string;
  name: string;
  title?: string;
}

interface CategoryOption {
  id: string;
  name: string;
}

interface VariantForm {
  id: string;
  name: string;
  glaze: string;
  size: string;
  swatchColor: string;
  swatchImage: string;
  image: string;
  modelUrl: string;
  referencePrice: number | '';
  status: ProductVariantStatus;
}

interface HotspotForm {
  id: string;
  position: string;
  normal: string;
  label: string;
  panelTitle: string;
  panelContent: string;
  panelImage: string;
  panelCta: string;
}

interface ViewSectionForm {
  id: string;
  name: string;
  icon: string;
  cameraOrbit: string;
  cameraTarget: string;
  description: string;
  hotspots: HotspotForm[];
}

interface ProductFormData {
  name: string;
  slug: string;
  sku: string;
  status: ProductStatus;
  collectionId: string;
  collection: string;
  artisanId: string;
  glaze: string;
  type: string;
  size: string;
  referencePrice: number | '';
  priceLabel: string;
  weight: number | '';
  description: string;
  tags: string;
  images: string[];
  modelUrl: string;
  video360Url: string;
  poster: string;
  specsTemperature: number | '';
  specsFiringTime: number | '';
  specsTechnique: string;
  storyTitle: string;
  storySubtitle: string;
  storyContent: string;
  storyImage: string;
  variants: VariantForm[];
  viewSections: ViewSectionForm[];
  seoTitle: string;
  seoDescription: string;
}

interface ProvenanceRecord {
  id: string;
  _id?: string;
  type: ProvenanceType;
  title: string;
  fileUrl: string;
  issuedDate?: string;
  issuedBy?: string;
  isActive?: boolean;
}

type ProvenanceDraft = {
  type: ProvenanceType;
  title: string;
  issuedDate: string;
  issuedBy: string;
};

const PROVENANCE_TYPE_LABELS: Record<ProvenanceType, string> = {
  [PROVENANCE_TYPES.CERTIFICATE]: 'Chứng nhận',
  [PROVENANCE_TYPES.APPRAISAL]: 'Giám định',
  [PROVENANCE_TYPES.OWNERSHIP_HISTORY]: 'Lịch sử sở hữu',
};

const PROVENANCE_TYPE_OPTIONS = PROVENANCE_TYPE_VALUES.map((type) => ({
  value: type,
  label: PROVENANCE_TYPE_LABELS[type],
}));

const EMPTY_SECTION: ViewSectionForm = {
  id: 'overview',
  name: 'Tổng quan',
  icon: 'overview',
  cameraOrbit: '30deg 75deg 0.43m',
  cameraTarget: '0m 0.101m 0m',
  description: '',
  hotspots: [],
};

const EMPTY: ProductFormData = {
  name: '',
  slug: '',
  sku: '',
  status: PRODUCT_STATUSES.DISPLAY_ONLY,
  collectionId: '',
  collection: '',
  artisanId: '',
  glaze: '',
  type: '',
  size: '',
  referencePrice: '',
  priceLabel: '',
  weight: '',
  description: '',
  tags: '',
  images: [],
  modelUrl: '',
  video360Url: '',
  poster: '',
  specsTemperature: '',
  specsFiringTime: '',
  specsTechnique: '',
  storyTitle: '',
  storySubtitle: '',
  storyContent: '',
  storyImage: '',
  variants: [],
  viewSections: [EMPTY_SECTION],
  seoTitle: '',
  seoDescription: '',
};

const STATUS_LABEL: Record<ProductStatus, string> = {
  ACTIVE: 'Đang hiển thị',
  SOLD_OUT: 'Đã bán',
  IN_PRODUCTION: 'Đang chế tác',
  DISPLAY_ONLY: 'Chỉ trưng bày',
};

function readProductStatus(value: unknown): ProductStatus {
  return PRODUCT_STATUS_VALUES.includes(value as ProductStatus)
    ? value as ProductStatus
    : PRODUCT_STATUSES.DISPLAY_ONLY;
}

const fieldStyle: CSSProperties = {
  width: '100%',
  padding: '10px 14px',
  border: '1px solid #ddd',
  borderRadius: 10,
  fontSize: '0.9rem',
  outline: 'none',
  background: '#fafaf8',
  boxSizing: 'border-box',
};

const labelStyle: CSSProperties = {
  display: 'block',
  fontSize: '0.8rem',
  fontWeight: 600,
  color: '#555',
  marginBottom: 6,
};

const sectionStyle: CSSProperties = {
  background: '#fff',
  borderRadius: 12,
  padding: 24,
  marginBottom: 16,
  boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
};

const grid2: CSSProperties = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 };
const grid3: CSSProperties = { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 };

type ProductFormTab = 'basic' | 'ceramic' | 'media' | 'spatial' | 'advanced';

const PRODUCT_FORM_TABS: Array<[ProductFormTab, string]> = [
  ['basic', 'Cơ bản'],
  ['ceramic', 'Chi tiết gốm'],
  ['media', 'Media'],
  ['spatial', '3D / 360'],
  ['advanced', 'Nâng cao'],
];



function asNumber(value: unknown): number | '' {
  return typeof value === 'number' && Number.isFinite(value) ? value : '';
}

function normalizeVariant(raw: ProductVariantApi, index: number): VariantForm {
  return {
    id: readTrimmedString(raw.id) ?? `variant-${index + 1}`,
    name: readStringInput(raw.name),
    glaze: readStringInput(raw.glaze),
    size: readStringInput(raw.size),
    swatchColor: readTrimmedString(raw.swatchColor) ?? readTrimmedString(raw.colorHex) ?? '#9A7520',
    swatchImage: readStringInput(raw.swatchImage),
    image: readFirstTextInputValue(raw.image, raw.thumbnail),
    modelUrl: readStringInput(raw.modelUrl),
    referencePrice: asNumber(raw.referencePrice),
    status: raw.status ?? PRODUCT_VARIANT_STATUSES.ACTIVE,
  };
}

function normalizeHotspot(raw: ProductHotspotApi, index: number): HotspotForm {
  const panel = raw.panel ?? {};
  return {
    id: readTrimmedString(raw.id) ?? `hotspot-${index + 1}`,
    position: readTrimmedString(raw.position) ?? '0m 0.1m 0m',
    normal: readTrimmedString(raw.normal) ?? '0 1 0',
    label: readStringInput(raw.label),
    panelTitle: readTrimmedString(panel.title) ?? readStringInput(raw.label),
    panelContent: readTrimmedString(panel.content) ?? readStringInput(raw.description),
    panelImage: readTrimmedString(panel.image) ?? readStringInput(raw.image),
    panelCta: readStringInput(panel.cta),
  };
}

function normalizeSection(raw: ProductViewSectionApi, index: number, fallbackHotspots: ProductHotspotApi[]): ViewSectionForm {
  const camera = raw.camera ?? {};
  const hotspots = Array.isArray(raw.hotspots)
    ? raw.hotspots
    : index === 0
      ? fallbackHotspots
      : [];
  return {
    id: readTrimmedString(raw.id) ?? `section-${index + 1}`,
    name: readTrimmedString(raw.name) ?? readStringInput(raw.label),
    icon: readTrimmedString(raw.icon) ?? 'section',
    cameraOrbit: readTrimmedString(camera.orbit) ?? readTrimmedString(raw.cameraOrbit) ?? '30deg 75deg 0.43m',
    cameraTarget: readTrimmedString(camera.target) ?? readTrimmedString(raw.cameraTarget) ?? '0m 0.101m 0m',
    description: readStringInput(raw.description),
    hotspots: hotspots.map((h, i) => normalizeHotspot(h, i)),
  };
}

function normalizeStory(raw: ProductApi['story']): ProductStoryApi {
  const story = Array.isArray(raw) ? raw[0] : raw;
  return story ?? {};
}

function makeVariant(index: number): VariantForm {
  return {
    id: `variant-${Date.now()}-${index}`,
    name: `Biến thể ${index + 1}`,
    glaze: '',
    size: '',
    swatchColor: '#9A7520',
    swatchImage: '',
    image: '',
    modelUrl: '',
    referencePrice: '',
    status: PRODUCT_VARIANT_STATUSES.ACTIVE,
  };
}

function makeSection(index: number): ViewSectionForm {
  return {
    ...EMPTY_SECTION,
    id: `section-${Date.now()}-${index}`,
    name: `Góc nhìn ${index + 1}`,
    icon: 'section',
    hotspots: [],
  };
}

function makeHotspot(index: number): HotspotForm {
  return {
    id: `hotspot-${Date.now()}-${index}`,
    position: '0m 0.1m 0m',
    normal: '0 1 0',
    label: `Điểm nhấn ${index + 1}`,
    panelTitle: '',
    panelContent: '',
    panelImage: '',
    panelCta: 'Tư vấn chi tiết',
  };
}

export function ProductFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { confirm } = useConfirm();
  const isEdit = Boolean(id);
  const [form, setForm] = useState<ProductFormData>(EMPTY);
  const [artisans, setArtisans] = useState<ArtisanOption[]>([]);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [provenance, setProvenance] = useState<ProvenanceRecord[]>([]);
  const [provenanceDraft, setProvenanceDraft] = useState<ProvenanceDraft>({
    type: PROVENANCE_TYPES.CERTIFICATE,
    title: 'Chứng nhận tác phẩm',
    issuedDate: '',
    issuedBy: '',
  });
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [artisanLoadError, setArtisanLoadError] = useState('');
  const [categoryLoadError, setCategoryLoadError] = useState('');
  const [provenanceLoadError, setProvenanceLoadError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewProvenance, setPreviewProvenance] = useState<ProvenanceRecord | null>(null);
  const [activeTab, setActiveTab] = useState<ProductFormTab>('basic');
  const hasModel = Boolean(form.modelUrl?.trim());

  const loadArtisans = () => {
    setArtisanLoadError('');
    api.artisan.list()
      .then(setArtisans)
      .catch((err) => setArtisanLoadError(mergeApiErrorMessage('Không tải được danh sách nghệ nhân', err)));
  };

  const loadCategories = () => {
    setCategoryLoadError('');
    api.category
      .list()
      .then((items: CategoryApi[]) => setCategories(items.map((item) => ({ id: item.id, name: item.name }))))
      .catch((err) => setCategoryLoadError(mergeApiErrorMessage('Không tải được danh sách danh mục', err)));
  };

  useEffect(() => { loadArtisans(); loadCategories(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (form.collectionId || !form.collection || categories.length === 0) return;
    const matched = categories.find((item) => item.name === form.collection);
    if (matched) {
      setForm((prev) => ({ ...prev, collectionId: matched.id }));
    }
  }, [categories, form.collection, form.collectionId]);

  useEffect(() => {
    if (!isEdit || !id) return;
    setLoading(true);
    setLoadError('');
    api.catalog.get(id).then((p: ProductApi) => {
      const story = normalizeStory(p.story);
      const sections = Array.isArray(p.viewSections) ? p.viewSections : [];
      setForm({
        name: readStringInput(p.name),
        slug: readStringInput(p.slug),
        sku: readStringInput(p.sku),
        status: readProductStatus(p.status),
        collectionId: readStringInput(p.collectionId),
        collection: readStringInput(p.collection),
        artisanId: readStringInput(p.artisanId),
        glaze: readStringInput(p.glaze),
        type: readStringInput(p.type),
        size: readStringInput(p.size),
        referencePrice: asNumber(p.referencePrice),
        priceLabel: readStringInput(p.priceLabel),
        weight: asNumber(p.weight),
        description: readStringInput(p.description),
        tags: readStringArray(p.tags).join(', '),
        images: readStringArray(p.images),
        modelUrl: readStringInput(p.modelUrl),
        video360Url: readStringInput(p.video360Url),
        poster: readStringInput(p.poster),
        specsTemperature: asNumber(p.specs?.temperature),
        specsFiringTime: asNumber(p.specs?.firingTime),
        specsTechnique: readStringInput(p.specs?.technique),
        storyTitle: readStringInput(story.title),
        storySubtitle: readStringInput(story.subtitle),
        storyContent: readTrimmedString(story.content) ?? readStringInput(story.body),
        storyImage: readStringInput(story.image),
        variants: Array.isArray(p.variants) ? p.variants.map((v, i) => normalizeVariant(v, i)) : [],
        viewSections: sections.length
          ? sections.map((s, i) => normalizeSection(s, i, Array.isArray(p.hotspots) ? p.hotspots : []))
          : [EMPTY_SECTION],
        seoTitle: readStringInput(p.seo?.metaTitle),
        seoDescription: readStringInput(p.seo?.metaDescription),
      });
    }).catch((err) => setLoadError(mergeApiErrorMessage('Không tải được sản phẩm', err)))
      .finally(() => setLoading(false));
  }, [id, isEdit, reloadKey]);

  const loadProvenance = () => {
    if (!isEdit || !id) return;
    setProvenanceLoadError('');
    api.catalog.provenance.list(id)
      .then((records: ProvenanceRecord[]) => setProvenance(records))
      .catch((err) => setProvenanceLoadError(mergeApiErrorMessage('Không tải được chứng nhận sản phẩm', err)));
  };

  useEffect(() => { loadProvenance(); }, [id, isEdit]); // eslint-disable-line react-hooks/exhaustive-deps

  const statusOptions = useMemo(
    () => PRODUCT_STATUS_VALUES.map((status) => [status, STATUS_LABEL[status]] as [ProductStatus, string]),
    [],
  );

  const updateField = (name: keyof ProductFormData, value: ProductFormData[keyof ProductFormData]) => {
    setForm(prev => {
      const next = { ...prev, [name]: value };
      if (name === 'name' && !isEdit) next.slug = slugify(String(value));
      return next;
    });
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    updateField(name as keyof ProductFormData, type === 'number' ? (value === '' ? '' : Number(value)) : value);
  };

  const updateVariant = (index: number, patch: Partial<VariantForm>) => {
    setForm(prev => ({
      ...prev,
      variants: prev.variants.map((variant, i) => i === index ? { ...variant, ...patch } : variant),
    }));
  };

  const updateSection = (index: number, patch: Partial<ViewSectionForm>) => {
    setForm(prev => ({
      ...prev,
      viewSections: prev.viewSections.map((section, i) => i === index ? { ...section, ...patch } : section),
    }));
  };

  const updateHotspot = (sectionIndex: number, hotspotIndex: number, patch: Partial<HotspotForm>) => {
    setForm(prev => ({
      ...prev,
      viewSections: prev.viewSections.map((section, i) => {
        if (i !== sectionIndex) return section;
        return {
          ...section,
          hotspots: section.hotspots.map((hotspot, h) => h === hotspotIndex ? { ...hotspot, ...patch } : hotspot),
        };
      }),
    }));
  };

  const uploadProvenance = async (file: File) => {
    if (!id) throw new Error('Cần lưu sản phẩm trước khi upload chứng nhận');
    const record = await api.catalog.provenance.upload(id, file, provenanceDraft) as ProvenanceRecord;
    setProvenance(prev => [record, ...prev]);
    toast('Đã upload chứng nhận PDF.', 'success');
    return record.fileUrl;
  };

  const deleteProvenance = async (recordId: string) => {
    await api.catalog.provenance.delete(recordId);
    setProvenance(prev => prev.filter(record => record.id !== recordId));
    toast('Đã xóa chứng nhận.', 'success');
  };

  const requestDeleteProvenance = (recordId: string, title: string) => {
    confirm({
      title: 'Xóa chứng nhận?',
      description: `Chứng nhận "${title}" sẽ bị ẩn khỏi hồ sơ sản phẩm.`,
      confirmLabel: 'Xóa',
      variant: 'danger',
      onConfirm: () => deleteProvenance(recordId),
    });
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    if (!hasTrimmedString(form.name)) {
      setError('Cần nhập tên sản phẩm.');
      setActiveTab('basic');
      setSaving(false);
      return;
    }

    if (form.images.length === 0) {
      setError('Cần ít nhất 1 ảnh tác phẩm.');
      setActiveTab('media');
      setSaving(false);
      return;
    }

    const storyTitle = readTrimmedString(form.storyTitle);
    const storyContent = readTrimmedString(form.storyContent);
    const payloadBase = {
      name: form.name,
      sku: readTrimmedString(form.sku),
      status: form.status,
      collectionId: readTrimmedString(form.collectionId),
      collection: readTrimmedString(form.collection),
      artisanId: readTrimmedString(form.artisanId),
      glaze: readTrimmedString(form.glaze),
      type: readTrimmedString(form.type),
      size: readTrimmedString(form.size),
      referencePrice: typeof form.referencePrice === 'number' ? form.referencePrice : 0,
      priceLabel: readTrimmedString(form.priceLabel),
      weight: typeof form.weight === 'number' ? form.weight : undefined,
      description: readTrimmedString(form.description),
      tags: readCsvStringList(form.tags),
      images: form.images,
      modelUrl: readTrimmedString(form.modelUrl),
      video360Url: readTrimmedString(form.video360Url),
      poster: readTrimmedString(form.poster),
      specs: {
        temperature: typeof form.specsTemperature === 'number' ? form.specsTemperature : null,
        firingTime: typeof form.specsFiringTime === 'number' ? form.specsFiringTime : null,
        technique: readTrimmedString(form.specsTechnique) ?? null,
      },
      story: storyTitle !== undefined || storyContent !== undefined
        ? {
            title: storyTitle ?? form.name,
            subtitle: readTextInputValue(form.storySubtitle),
            content: readTextInputValue(storyContent),
            image: readTrimmedString(form.storyImage),
          }
        : undefined,
      variants: form.variants
        .filter((v) => hasTrimmedString(v.name))
        .map(v => ({
          id: readStringInput(v.id),
          name: readStringInput(v.name),
          glaze: readTrimmedString(v.glaze),
          size: readTrimmedString(v.size),
          swatchColor: readTrimmedString(v.swatchColor),
          swatchImage: readTrimmedString(v.swatchImage),
          image: readTrimmedString(v.image),
          modelUrl: readTrimmedString(v.modelUrl),
          referencePrice: typeof v.referencePrice === 'number' ? v.referencePrice : undefined,
          status: v.status,
        })),
      viewSections: form.viewSections
        .filter((s) => hasTrimmedString(s.id) && hasTrimmedString(s.name))
        .map(s => ({
          id: readStringInput(s.id),
          name: readStringInput(s.name),
          icon: readStringInput(s.icon),
          camera: { orbit: readStringInput(s.cameraOrbit), target: readStringInput(s.cameraTarget) },
          description: readStringInput(s.description),
          hotspots: s.hotspots
            .filter((h) => hasTrimmedString(h.id) && hasTrimmedString(h.label))
            .map(h => ({
              id: readStringInput(h.id),
              position: readStringInput(h.position),
              normal: readStringInput(h.normal),
              label: readStringInput(h.label),
              panel: {
                title: readTrimmedString(h.panelTitle) ?? readStringInput(h.label),
                content: readStringInput(h.panelContent),
                image: readTrimmedString(h.panelImage),
                cta: readTrimmedString(h.panelCta),
              },
            })),
        })),
      seo: {
        metaTitle: readTrimmedString(form.seoTitle),
        metaDescription: readTrimmedString(form.seoDescription),
      },
    };
    const payload = isEdit
      ? payloadBase
      : { ...payloadBase, slug: readTrimmedString(form.slug) };

    try {
      await (isEdit && id ? api.catalog.update(id, payload) : api.catalog.create(payload));
      toast(isEdit ? 'Đã cập nhật sản phẩm.' : 'Đã tạo sản phẩm.', 'success');
      navigate('/admin/products');
    } catch (err) {
      const message = mergeApiErrorMessage('Lưu sản phẩm thất bại', err);
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

  const previewCover = readTrimmedString(form.poster) ?? readTrimmedString(form.images[0]);
  const previewPrice = readTrimmedString(form.priceLabel)
    ?? (typeof form.referencePrice === 'number' ? `${form.referencePrice.toLocaleString('vi')} VND` : 'Chưa có giá');

  return (
    <div>
      <MediaLightboxModal
        isOpen={previewProvenance !== null}
        kind="document"
        src={previewProvenance ? apiAssetUrl(previewProvenance.fileUrl) : undefined}
        title={previewProvenance?.title ?? 'Chứng nhận sản phẩm'}
        subtitle={previewProvenance ? fileNameFromPath(previewProvenance.fileUrl) : undefined}
        onClose={() => setPreviewProvenance(null)}
        onOpenExternal={
          previewProvenance
            ? () => window.open(apiAssetUrl(previewProvenance.fileUrl), '_blank', 'noopener,noreferrer')
            : undefined
        }
      />
      <div className="ghs-page-header">
        <div>
          <h1>{isEdit ? 'Chỉnh sửa sản phẩm' : 'Tạo sản phẩm mới'}</h1>
          <p>Ảnh và thông tin gốm trước — model 3D / 360 bổ sung khi sẵn sàng.</p>
        </div>
        <button type="button" className="ghs-btn ghs-btn-ghost" onClick={() => navigate('/admin/products')}>Quay lại</button>
      </div>

      <form onSubmit={handleSubmit} className="ghs-product-form">
        <div className="ghs-product-form-grid">
          <div className="ghs-product-form-main">
            <div className="ghs-tabs" role="tablist" aria-label="Nhóm thông tin sản phẩm">
              {PRODUCT_FORM_TABS.map(([tab, label]) => (
                <button
                  key={tab}
                  type="button"
                  role="tab"
                  id={`ghs-product-tab-${tab}`}
                  aria-selected={activeTab === tab}
                  aria-controls={`ghs-product-panel-${tab}`}
                  className={activeTab === tab ? 'ghs-tab active' : 'ghs-tab'}
                  onClick={() => setActiveTab(tab)}
                >
                  {label}
                </button>
              ))}
            </div>

            {activeTab === 'basic' && (
              <div style={sectionStyle} role="tabpanel" id="ghs-product-panel-basic" aria-labelledby="ghs-product-tab-basic">
                <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#9A7520', marginBottom: 16, marginTop: 0 }}>Thông tin cơ bản</h3>
                <div style={grid2}>
                  <div><label style={labelStyle}>Tên sản phẩm *</label><input name="name" value={form.name} onChange={handleChange} required style={fieldStyle} /></div>
                  <div><label style={labelStyle}>Slug</label><input name="slug" value={form.slug} onChange={handleChange} style={fieldStyle} /></div>
                  <div><label style={labelStyle}>SKU</label><input name="sku" value={form.sku} onChange={handleChange} style={fieldStyle} /></div>
                  <div><label style={labelStyle}>Trạng thái</label>
                    <select name="status" value={form.status} onChange={handleChange} style={fieldStyle}>
                      {statusOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                    </select>
                  </div>
                  <div><label style={labelStyle}>Danh mục</label>
                    <select
                      name="collectionId"
                      value={form.collectionId}
                      onChange={(event) => {
                        const nextId = event.target.value;
                        const selected = categories.find((item) => item.id === nextId);
                        setForm((prev) => ({
                          ...prev,
                          collectionId: nextId,
                          collection: selected?.name ?? prev.collection,
                        }));
                      }}
                      style={fieldStyle}
                    >
                      <option value="">Chưa chọn danh mục</option>
                      {categories.map((category) => (
                        <option key={category.id} value={category.id}>{category.name}</option>
                      ))}
                    </select>
                    {categoryLoadError && (
                      <div role="alert" style={{ marginTop: 6, color: '#b45309', fontSize: '0.78rem' }}>
                        {categoryLoadError}.{' '}
                        <button type="button" onClick={loadCategories} style={{ border: 0, padding: 0, background: 'none', color: '#9A7520', fontWeight: 700, cursor: 'pointer' }}>
                          Thử lại
                        </button>
                      </div>
                    )}
                  </div>
                  <div><label style={labelStyle}>Nghệ nhân</label>
                    <select name="artisanId" value={form.artisanId} onChange={handleChange} style={fieldStyle}>
                      <option value="">Chưa gán nghệ nhân</option>
                      {artisans.map(a => <option key={a.id} value={a.id}>{a.name}{a.title ? ` - ${a.title}` : ''}</option>)}
                    </select>
                    {artisanLoadError && (
                      <div role="alert" style={{ marginTop: 6, color: '#b45309', fontSize: '0.78rem' }}>
                        {artisanLoadError}.{' '}
                        <button type="button" onClick={loadArtisans} style={{ border: 0, padding: 0, background: 'none', color: '#9A7520', fontWeight: 700, cursor: 'pointer' }}>
                          Thử lại
                        </button>
                      </div>
                    )}
                  </div>
                </div>
                <div style={{ marginTop: 16 }}><label style={labelStyle}>Mô tả</label><textarea name="description" value={form.description} onChange={handleChange} rows={3} style={{ ...fieldStyle, resize: 'vertical' }} /></div>
              </div>
            )}

            {activeTab === 'ceramic' && (
              <div style={sectionStyle} role="tabpanel" id="ghs-product-panel-ceramic" aria-labelledby="ghs-product-tab-ceramic">
                <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#9A7520', marginBottom: 16, marginTop: 0 }}>Chi tiết gốm sứ</h3>
                <div style={grid3}>
                  <div><label style={labelStyle}>Dòng men</label><input name="glaze" value={form.glaze} onChange={handleChange} placeholder="Men Cobalt" style={fieldStyle} /></div>
                  <div><label style={labelStyle}>Loại sản phẩm</label><input name="type" value={form.type} onChange={handleChange} placeholder="Bình hoa" style={fieldStyle} /></div>
                  <div><label style={labelStyle}>Kích thước</label><input name="size" value={form.size} onChange={handleChange} placeholder="Cao 20cm x ĐK 8.3cm" style={fieldStyle} /></div>
                  <div><label style={labelStyle}>Giá tham khảo</label><input name="referencePrice" type="number" value={form.referencePrice} onChange={handleChange} style={fieldStyle} /></div>
                  <div><label style={labelStyle}>Nhãn giá</label><input name="priceLabel" value={form.priceLabel} onChange={handleChange} placeholder="15.800.000 VND" style={fieldStyle} /></div>
                  <div><label style={labelStyle}>Trọng lượng (g)</label><input name="weight" type="number" value={form.weight} onChange={handleChange} style={fieldStyle} /></div>
                </div>
                <div style={{ marginTop: 16 }}><label style={labelStyle}>Tags</label><input name="tags" value={form.tags} onChange={handleChange} placeholder="hoa-sen, cobalt, cao-cap" style={fieldStyle} /></div>
              </div>
            )}

            {activeTab === 'media' && (
              <div style={sectionStyle} role="tabpanel" id="ghs-product-panel-media" aria-labelledby="ghs-product-tab-media">
                <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#9A7520', marginBottom: 16, marginTop: 0 }}>Ảnh và poster</h3>
                <div style={{ display: 'grid', gap: 16 }}>
                  <UploadField
                    label="Ảnh tác phẩm *"
                    value={form.images}
                    accept="image/png,image/jpeg,image/webp"
                    multiple
                    maxFiles={10}
                    maxSizeMb={5}
                    uploadContext={{ moduleRef: FILE_ASSET_MODULE_REFS.CATALOG_PRODUCT, fieldRef: FILE_ASSET_FIELD_REFS.IMAGES, entityRef: id }}
                    onChange={(v) => updateField('images', v)}
                  />
                  <UploadField
                    label="Poster"
                    value={form.poster ? [form.poster] : []}
                    accept="image/png,image/jpeg,image/webp"
                    maxSizeMb={5}
                    uploadContext={{ moduleRef: FILE_ASSET_MODULE_REFS.CATALOG_PRODUCT, fieldRef: FILE_ASSET_FIELD_REFS.POSTER, entityRef: id }}
                    onChange={(v) => updateField('poster', readFirstString(v))}
                  />
                </div>
              </div>
            )}

            {activeTab === 'spatial' && (
              <div style={sectionStyle} role="tabpanel" id="ghs-product-panel-spatial" aria-labelledby="ghs-product-tab-spatial">
                <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#9A7520', marginBottom: 16, marginTop: 0 }}>Model 3D và video 360°</h3>
                <div style={{ display: 'grid', gap: 16 }}>
                  <UploadField
                    label="Model 3D (.glb, tùy chọn)"
                    value={form.modelUrl ? [form.modelUrl] : []}
                    accept=".glb,.gltf,model/gltf-binary,model/gltf+json"
                    maxSizeMb={50}
                    uploadContext={{ moduleRef: FILE_ASSET_MODULE_REFS.CATALOG_PRODUCT, fieldRef: FILE_ASSET_FIELD_REFS.MODEL_URL, entityRef: id }}
                    onChange={(v) => updateField('modelUrl', readFirstString(v))}
                  />
                  <UploadField
                    label="Video 360° (.mp4/.webm/.mov, tùy chọn)"
                    value={form.video360Url ? [form.video360Url] : []}
                    accept="video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov"
                    maxSizeMb={120}
                    uploadContext={{ moduleRef: FILE_ASSET_MODULE_REFS.CATALOG_PRODUCT, fieldRef: FILE_ASSET_FIELD_REFS.VIDEO_360_URL, entityRef: id }}
                    onChange={(v) => updateField('video360Url', readFirstString(v))}
                  />
                  {!hasModel && (
                    <div style={{ fontSize: '0.86rem', color: '#8a8178' }}>
                      Chưa có model 3D. Upload file .glb để mở phần góc nhìn và hotspot trong tab Nâng cao.
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'advanced' && (
              <div role="tabpanel" id="ghs-product-panel-advanced" aria-labelledby="ghs-product-tab-advanced">
                <div style={sectionStyle}>
                  <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#9A7520', marginBottom: 16, marginTop: 0 }}>Câu chuyện tác phẩm</h3>
                  <div style={grid2}>
                    <div><label style={labelStyle}>Tiêu đề</label><input name="storyTitle" value={form.storyTitle} onChange={handleChange} style={fieldStyle} /></div>
                    <div><label style={labelStyle}>Phụ đề</label><input name="storySubtitle" value={form.storySubtitle} onChange={handleChange} style={fieldStyle} /></div>
                    <div>
                      <UploadField
                        label="Ảnh câu chuyện"
                        value={form.storyImage ? [form.storyImage] : []}
                        accept="image/png,image/jpeg,image/webp"
                        maxSizeMb={5}
                        uploadContext={{ moduleRef: FILE_ASSET_MODULE_REFS.CATALOG_PRODUCT, fieldRef: FILE_ASSET_FIELD_REFS.STORY_IMAGE, entityRef: id }}
                        onChange={(v) => updateField('storyImage', readFirstString(v))}
                      />
                    </div>
                  </div>
                  <div style={{ marginTop: 16 }}><label style={labelStyle}>Nội dung</label><textarea name="storyContent" value={form.storyContent} onChange={handleChange} rows={4} style={{ ...fieldStyle, resize: 'vertical' }} /></div>
                </div>

                <div style={sectionStyle}>
                  <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#9A7520', marginBottom: 16, marginTop: 0 }}>Thông số kỹ thuật</h3>
                  <div style={grid3}>
                    <div><label style={labelStyle}>Nhiệt độ nung</label><input name="specsTemperature" type="number" value={form.specsTemperature} onChange={handleChange} style={fieldStyle} /></div>
                    <div><label style={labelStyle}>Thời gian nung (giờ)</label><input name="specsFiringTime" type="number" value={form.specsFiringTime} onChange={handleChange} style={fieldStyle} /></div>
                    <div><label style={labelStyle}>Kỹ thuật</label><input name="specsTechnique" value={form.specsTechnique} onChange={handleChange} placeholder="Tạo hình thủ công, phủ men, vẽ họa tiết" style={fieldStyle} /></div>
                  </div>
                </div>

                <div style={sectionStyle}>
                  <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#9A7520', marginBottom: 16, marginTop: 0 }}>SEO</h3>
                  <div style={grid2}>
                    <div><label style={labelStyle}>Meta title</label><input name="seoTitle" value={form.seoTitle} onChange={handleChange} style={fieldStyle} /></div>
                    <div><label style={labelStyle}>Meta description</label><input name="seoDescription" value={form.seoDescription} onChange={handleChange} style={fieldStyle} /></div>
                  </div>
                </div>

                <div style={sectionStyle}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#9A7520', margin: 0 }}>Biến thể</h3>
                    <Button className="ghs-btn ghs-btn-ghost" type="button" variant="secondary" size="sm" onClick={() => updateField('variants', [...form.variants, makeVariant(form.variants.length)])}>Thêm biến thể</Button>
                  </div>
                  <div style={{ display: 'grid', gap: 12 }}>
                    {form.variants.map((variant, index) => (
                      <div key={variant.id} style={{ border: '1px solid #eee', borderRadius: 10, padding: 14 }}>
                        <div style={grid3}>
                          <div><label style={labelStyle}>Tên</label><input value={variant.name} onChange={(e) => updateVariant(index, { name: e.target.value })} style={fieldStyle} /></div>
                          <div><label style={labelStyle}>Men</label><input value={variant.glaze} onChange={(e) => updateVariant(index, { glaze: e.target.value })} style={fieldStyle} /></div>
                          <div><label style={labelStyle}>Size</label><input value={variant.size} onChange={(e) => updateVariant(index, { size: e.target.value })} style={fieldStyle} /></div>
                          <div><label style={labelStyle}>Màu swatch</label><input value={variant.swatchColor} onChange={(e) => updateVariant(index, { swatchColor: e.target.value })} style={fieldStyle} /></div>
                          <div><label style={labelStyle}>Giá</label><input type="number" value={variant.referencePrice} onChange={(e) => updateVariant(index, { referencePrice: e.target.value === '' ? '' : Number(e.target.value) })} style={fieldStyle} /></div>
                          <div><label style={labelStyle}>Trạng thái</label><select value={variant.status} onChange={(e) => updateVariant(index, { status: e.target.value as ProductVariantStatus })} style={fieldStyle}><option value={PRODUCT_VARIANT_STATUSES.ACTIVE}>Đang có</option><option value={PRODUCT_VARIANT_STATUSES.SOLD_OUT}>Đã bán</option></select></div>
                          <div>
                            <UploadField
                              label="Ảnh"
                              value={variant.image ? [variant.image] : []}
                              accept="image/png,image/jpeg,image/webp"
                              maxSizeMb={5}
                              uploadContext={{ moduleRef: FILE_ASSET_MODULE_REFS.CATALOG_PRODUCT, fieldRef: FILE_ASSET_FIELD_REFS.VARIANT_IMAGE, entityRef: id }}
                              onChange={(v) => updateVariant(index, { image: readFirstString(v) })}
                            />
                          </div>
                          <div>
                            <UploadField
                              label="Model riêng"
                              value={variant.modelUrl ? [variant.modelUrl] : []}
                              accept=".glb,.gltf,model/gltf-binary,model/gltf+json"
                              maxSizeMb={50}
                              uploadContext={{ moduleRef: FILE_ASSET_MODULE_REFS.CATALOG_PRODUCT, fieldRef: FILE_ASSET_FIELD_REFS.VARIANT_MODEL_URL, entityRef: id }}
                              onChange={(v) => updateVariant(index, { modelUrl: readFirstString(v) })}
                            />
                          </div>
                          <div style={{ display: 'flex', alignItems: 'end' }}><Button className="ghs-btn ghs-btn-danger" type="button" variant="destructive" size="sm" onClick={() => updateField('variants', form.variants.filter((_, i) => i !== index))}>Xóa</Button></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div style={sectionStyle}>
                  <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#9A7520', marginBottom: 16, marginTop: 0 }}>Chứng nhận & gốc tích</h3>
                  {!isEdit ? (
                    <div style={{ fontSize: '0.86rem', color: '#8a8178' }}>Lưu sản phẩm trước, sau đó quay lại để upload chứng nhận PDF.</div>
                  ) : (
                    <div style={{ display: 'grid', gap: 16 }}>
                      {provenanceLoadError && (
                        <div role="alert" style={{ color: '#b45309', fontSize: '0.82rem' }}>
                          {provenanceLoadError}.{' '}
                          <button type="button" onClick={loadProvenance} style={{ border: 0, padding: 0, background: 'none', color: '#9A7520', fontWeight: 700, cursor: 'pointer' }}>
                            Thử lại
                          </button>
                        </div>
                      )}
                      <div style={grid2}>
                        <div><label style={labelStyle}>Loại chứng nhận</label>
                          <select value={provenanceDraft.type} onChange={(e) => setProvenanceDraft(prev => ({ ...prev, type: e.target.value as ProvenanceType }))} style={fieldStyle}>
                            {PROVENANCE_TYPE_OPTIONS.map((option) => (
                              <option key={option.value} value={option.value}>{option.label}</option>
                            ))}
                          </select>
                        </div>
                        <div><label style={labelStyle}>Tiêu đề</label><input value={provenanceDraft.title} onChange={(e) => setProvenanceDraft(prev => ({ ...prev, title: e.target.value }))} style={fieldStyle} /></div>
                        <div><label style={labelStyle}>Ngày cấp</label><input type="date" value={provenanceDraft.issuedDate} onChange={(e) => setProvenanceDraft(prev => ({ ...prev, issuedDate: e.target.value }))} style={fieldStyle} /></div>
                        <div><label style={labelStyle}>Đơn vị cấp</label><input value={provenanceDraft.issuedBy} onChange={(e) => setProvenanceDraft(prev => ({ ...prev, issuedBy: e.target.value }))} style={fieldStyle} /></div>
                      </div>
                      <UploadField
                        label="Upload PDF chứng nhận"
                        value={[]}
                        accept="application/pdf,.pdf"
                        maxSizeMb={10}
                        onChange={() => undefined}
                        onUploadFile={uploadProvenance}
                      />
                      {provenance.length > 0 && (
                        <div style={{ display: 'grid', gap: 8 }}>
                          {provenance.map(record => (
                            <div key={record.id} style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 12, alignItems: 'center', border: '1px solid #eee', borderRadius: 12, padding: 14, background: '#fffdf8' }}>
                              <div>
                                <div style={{ fontWeight: 700, color: '#191714' }}>{record.title}</div>
                                <div style={{ fontSize: '0.78rem', color: '#8a8178' }}>
                                  {PROVENANCE_TYPE_LABELS[record.type]} · {readDisplayText(record.issuedBy, 'Không rõ đơn vị')} · {formatOptionalDate(record.issuedDate, 'Không ngày cấp')}
                                </div>
                                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginTop: 8 }}>
                                  <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#7b5e18', background: '#fff6dd', border: '1px solid #ead8a4', borderRadius: 999, padding: '4px 8px' }}>
                                    PDF
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => setPreviewProvenance(record)}
                                    style={{ fontSize: '0.78rem', color: '#9A7520', fontWeight: 600, border: 0, background: 'none', padding: 0, cursor: 'pointer' }}
                                  >
                                    {fileNameFromPath(record.fileUrl)}
                                  </button>
                                </div>
                              </div>
                              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                <Button className="ghs-btn ghs-btn-ghost" type="button" variant="secondary" size="sm" onClick={() => setPreviewProvenance(record)}>
                                  Xem trước
                                </Button>
                                <Button className="ghs-btn ghs-btn-danger" type="button" variant="destructive" size="sm" onClick={() => requestDeleteProvenance(record.id, record.title)}>Xóa</Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {hasModel && (
                  <div style={sectionStyle}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                      <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#9A7520', margin: 0 }}>3D view sections và hotspots</h3>
                      <Button className="ghs-btn ghs-btn-ghost" type="button" variant="secondary" size="sm" onClick={() => updateField('viewSections', [...form.viewSections, makeSection(form.viewSections.length)])}>Thêm góc nhìn</Button>
                    </div>
                    <div style={{ display: 'grid', gap: 14 }}>
                      {form.viewSections.map((section, sectionIndex) => (
                        <div key={section.id} style={{ border: '1px solid #eee', borderRadius: 10, padding: 14 }}>
                          <div style={grid3}>
                            <div><label style={labelStyle}>ID</label><input value={section.id} onChange={(e) => updateSection(sectionIndex, { id: e.target.value })} style={fieldStyle} /></div>
                            <div><label style={labelStyle}>Tên góc nhìn</label><input value={section.name} onChange={(e) => updateSection(sectionIndex, { name: e.target.value })} style={fieldStyle} /></div>
                            <div><label style={labelStyle}>Icon key</label><input value={section.icon} onChange={(e) => updateSection(sectionIndex, { icon: e.target.value })} style={fieldStyle} /></div>
                            <div><label style={labelStyle}>Camera orbit</label><input value={section.cameraOrbit} onChange={(e) => updateSection(sectionIndex, { cameraOrbit: e.target.value })} style={fieldStyle} /></div>
                            <div><label style={labelStyle}>Camera target</label><input value={section.cameraTarget} onChange={(e) => updateSection(sectionIndex, { cameraTarget: e.target.value })} style={fieldStyle} /></div>
                            <div style={{ display: 'flex', alignItems: 'end', gap: 8 }}>
                              <Button className="ghs-btn ghs-btn-ghost" type="button" variant="secondary" size="sm" onClick={() => updateSection(sectionIndex, { hotspots: [...section.hotspots, makeHotspot(section.hotspots.length)] })}>Thêm hotspot</Button>
                              {form.viewSections.length > 1 && <Button className="ghs-btn ghs-btn-danger" type="button" variant="destructive" size="sm" onClick={() => updateField('viewSections', form.viewSections.filter((_, i) => i !== sectionIndex))}>Xóa góc</Button>}
                            </div>
                          </div>
                          <div style={{ marginTop: 12 }}><label style={labelStyle}>Mô tả góc nhìn</label><input value={section.description} onChange={(e) => updateSection(sectionIndex, { description: e.target.value })} style={fieldStyle} /></div>
                          {section.hotspots.map((hotspot, hotspotIndex) => (
                            <div key={hotspot.id} style={{ marginTop: 12, borderTop: '1px solid #f0ede6', paddingTop: 12 }}>
                              <div style={grid3}>
                                <div><label style={labelStyle}>Hotspot ID</label><input value={hotspot.id} onChange={(e) => updateHotspot(sectionIndex, hotspotIndex, { id: e.target.value })} style={fieldStyle} /></div>
                                <div><label style={labelStyle}>Position</label><input value={hotspot.position} onChange={(e) => updateHotspot(sectionIndex, hotspotIndex, { position: e.target.value })} style={fieldStyle} /></div>
                                <div><label style={labelStyle}>Normal</label><input value={hotspot.normal} onChange={(e) => updateHotspot(sectionIndex, hotspotIndex, { normal: e.target.value })} style={fieldStyle} /></div>
                                <div><label style={labelStyle}>Label</label><input value={hotspot.label} onChange={(e) => updateHotspot(sectionIndex, hotspotIndex, { label: e.target.value })} style={fieldStyle} /></div>
                                <div><label style={labelStyle}>Tiêu đề panel</label><input value={hotspot.panelTitle} onChange={(e) => updateHotspot(sectionIndex, hotspotIndex, { panelTitle: e.target.value })} style={fieldStyle} /></div>
                                <div>
                                  <UploadField
                                    label="Ảnh panel"
                                    value={hotspot.panelImage ? [hotspot.panelImage] : []}
                                    accept="image/png,image/jpeg,image/webp"
                                    maxSizeMb={5}
                                    uploadContext={{ moduleRef: FILE_ASSET_MODULE_REFS.CATALOG_PRODUCT, fieldRef: FILE_ASSET_FIELD_REFS.HOTSPOT_PANEL_IMAGE, entityRef: id }}
                                    onChange={(v) => updateHotspot(sectionIndex, hotspotIndex, { panelImage: readFirstString(v) })}
                                  />
                                </div>
                              </div>
                              <div style={{ marginTop: 10 }}><label style={labelStyle}>Nội dung panel</label><textarea value={hotspot.panelContent} onChange={(e) => updateHotspot(sectionIndex, hotspotIndex, { panelContent: e.target.value })} rows={2} style={{ ...fieldStyle, resize: 'vertical' }} /></div>
                              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}><Button className="ghs-btn ghs-btn-danger" type="button" variant="destructive" size="sm" onClick={() => updateSection(sectionIndex, { hotspots: section.hotspots.filter((_, i) => i !== hotspotIndex) })}>Xóa hotspot</Button></div>
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {error && <div role="alert" style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 12, padding: '10px 14px', fontSize: '0.85rem', color: '#b91c1c', marginBottom: 16 }}>{error}</div>}
          </div>

          <aside className="ghs-product-preview ghs-card">
            <div className="ghs-preview-title">Xem trước</div>
            <div className="ghs-preview-cover">
              {previewCover
                ? <img src={apiAssetUrl(previewCover)} alt={readDisplayText(form.name, 'Ảnh sản phẩm')} />
                : <span>Chưa có ảnh</span>}
            </div>
            <div className="ghs-preview-name">{readDisplayText(form.name, 'Sản phẩm chưa đặt tên')}</div>
            <div className="ghs-preview-price">{previewPrice}</div>
            <div className="ghs-preview-badges">
              <span className="ghs-badge ghs-badge-accent">{STATUS_LABEL[form.status]}</span>
              <span className="ghs-badge">{form.images.length} ảnh</span>
              {hasModel && <span className="ghs-badge">3D</span>}
            </div>
          </aside>
        </div>

        <div className="ghs-sticky-actions">
          <button type="button" className="ghs-btn ghs-btn-ghost" onClick={() => navigate('/admin/products')}>Hủy</button>
          <button type="submit" className="ghs-btn ghs-btn-primary" disabled={saving}>{saving ? 'Đang lưu…' : 'Lưu sản phẩm'}</button>
        </div>
      </form>
    </div>
  );
}
