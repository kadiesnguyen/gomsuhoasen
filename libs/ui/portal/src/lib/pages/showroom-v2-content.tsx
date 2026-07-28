import { useEffect, useState } from 'react';
import { createShowroomV2DefaultContent, type ShowroomV2ContentContract } from '@gomhoasen/contracts';
import { api } from '../services/api';
import { mergeApiErrorMessage } from '../services/api-error';
import { useToast } from '../components/toast';
import { RichTextEditor } from '../components/rich-text-editor';
import { UploadField } from '../components/upload-field';
import { ArrowDown, ArrowUp, Trash2, Plus } from 'lucide-react';
import { sanitizeRichHtml } from '../utils/rich-html';

type EditorRecord = Record<string, unknown>;
type EditorFieldType = 'text' | 'number' | 'checkbox' | 'image' | 'textarea' | 'richtext';
type InputKind = boolean | 'richtext';

function isEditorRecord(value: unknown): value is EditorRecord {
  return Boolean(value) && !Array.isArray(value) && typeof value === 'object';
}

function hasText(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isValidActionHref(value: unknown): value is string {
  if (!hasText(value)) return false;
  return /^(\/|#|https?:\/\/|mailto:|tel:)/.test(value.trim());
}

function readPath(source: unknown, path: string[]): unknown {
  let current = source;
  for (const segment of path) {
    if (!isEditorRecord(current)) return undefined;
    current = current[segment];
  }
  return current;
}

function writePath(
  source: ShowroomV2ContentContract,
  path: string[],
  value: unknown,
): ShowroomV2ContentContract {
  const next = structuredClone(source) as unknown as EditorRecord;
  let current = next;
  for (let index = 0; index < path.length - 1; index += 1) {
    const segment = path[index];
    const child = current[segment];
    if (!isEditorRecord(child)) current[segment] = {};
    current = current[segment] as EditorRecord;
  }
  current[path[path.length - 1]] = value;
  return next as unknown as ShowroomV2ContentContract;
}

function validateContent(content: ShowroomV2ContentContract): string | null {
  if (content.navigation.items.length === 0) {
    return 'Điều hướng: cần ít nhất một mục menu.';
  }
  if (content.navigation.items.some((item) => !item.label.trim() || !item.href.trim())) {
    return 'Điều hướng: mỗi mục cần đủ nhãn và đường dẫn.';
  }

  if (content.navigation.items.some((item) => !isValidActionHref(item.href))) {
    return 'Điều hướng: đường dẫn menu phải bắt đầu bằng /, #, http(s)://, mailto: hoặc tel:.';
  }

  const idGroups = [
    { label: 'Ngũ hành', items: content.about.elements },
    { label: 'Bộ sưu tập hàng 1', items: content.collections.rows.row1 },
    { label: 'Bộ sưu tập hàng 2', items: content.collections.rows.row2 },
    { label: 'Bộ sưu tập hàng 3', items: content.collections.rows.row3 },
    { label: 'Danh mục sản phẩm', items: content.productsLanding.categories },
    { label: 'Tin tức', items: ensureArray(content.newsLanding.newsCards) },
  ];

  for (const group of idGroups) {
    const seen = new Set<string>();
    for (const item of group.items) {
      const id = item.id?.trim();
      if (!id) return `${group.label}: mỗi mục cần có ID.`;
      if (seen.has(id)) return `${group.label}: ID "${id}" đang bị trùng.`;
      seen.add(id);
    }
  }

  const collectionItems = [
    ...content.collections.rows.row1,
    ...content.collections.rows.row2,
    ...content.collections.rows.row3,
  ];
  if (collectionItems.some((item) => !Number.isInteger(item.span) || item.span < 1 || item.span > 10)) {
    return 'Bộ sưu tập: độ rộng cột phải là số nguyên từ 1 đến 10.';
  }
  if (collectionItems.some((item) => !hasText(item.title) || !hasText(item.desc) || !hasText(item.img))) {
    return 'Bộ sưu tập: mỗi tile cần đủ tiêu đề, mô tả và hình ảnh.';
  }
  if (collectionItems.some((item) => !item.href?.trim())) {
    return 'Bộ sưu tập: mỗi mục cần có đường dẫn khi bấm Khám phá.';
  }
  if (collectionItems.some((item) => !isValidActionHref(item.href))) {
    return 'Bộ sưu tập: mỗi tile cần có đường dẫn hợp lệ khi bấm Khám phá.';
  }
  if (content.about.elements.some((item) => !hasText(item.title) || !hasText(item.desc) || !hasText(item.img))) {
    return 'Ngũ hành: mỗi khối cần đủ tiêu đề, mô tả và hình ảnh.';
  }
  if (content.productsLanding.categories.some((item) => !hasText(item.title) || !hasText(item.img))) {
    return 'Sản phẩm: mỗi danh mục nổi bật cần có tiêu đề và hình ảnh.';
  }
  if (content.productsLanding.categories.some((item) => !item.href?.trim())) {
    return 'Sản phẩm: mỗi danh mục nổi bật cần có đường dẫn.';
  }
  if (content.productsLanding.categories.some((item) => !isValidActionHref(item.href))) {
    return 'Sản phẩm: mỗi danh mục nổi bật cần có đường dẫn hợp lệ.';
  }

  const ctaChecks = [
    { label: 'Trang chủ: nút hero', href: content.home.heroCtaHref },
    { label: 'Trang chủ: nút Di sản', href: content.home.heritageCtaHref },
    { label: 'Trang chủ: nút Bộ sưu tập', href: content.home.collectionCtaHref },
    { label: 'Giới thiệu: nút hero', href: content.about.heroCtaHref },
    { label: 'Bộ sưu tập: nút hero', href: content.collections.heroCtaHref },
    { label: 'Liên hệ: nút Chỉ đường', href: content.contact.mapCtaHref },
  ];

  for (const item of ctaChecks) {
    if (!isValidActionHref(item.href)) {
      return `${item.label}: vui lòng nhập liên kết hợp lệ (/, #, https://, mailto: hoặc tel:).`;
    }
  }

  const featuredId = content.newsLanding.featuredId?.trim();
  if (
    featuredId &&
    !ensureArray(content.newsLanding.newsCards).some((item) => item.id === featuredId)
  ) {
    return 'Tin tức: bài nổi bật phải thuộc danh sách bài viết hiện có.';
  }

  const newsSlugs = new Set<string>();
  for (const article of ensureArray(content.newsLanding.newsCards)) {
    const slug = article.slug?.trim();
    if (!slug) return `Tin tức: bài "${article.title || article.id}" cần có slug.`;
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
      return `Tin tức: slug "${slug}" chỉ được dùng chữ thường không dấu, số và dấu gạch ngang.`;
    }
    if (newsSlugs.has(slug)) return `Tin tức: slug "${slug}" đang bị trùng.`;
    newsSlugs.add(slug);
    if (!article.title?.trim() || !article.category?.trim() || !article.image?.trim()) {
      return `Tin tức: bài "${article.id}" cần đủ tiêu đề, danh mục và hình ảnh.`;
    }
    if (!article.content?.trim()) {
      return `Tin tức: bài "${article.title || article.id}" chưa có nội dung chi tiết.`;
    }
  }

  return null;
}

function ensureArray<T>(value: T[] | undefined | null): T[] {
  return Array.isArray(value) ? value : [];
}

function stripSystemFields<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => stripSystemFields(item)) as T;
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([key]) => !['_id', '__v', 'isDeleted', 'deletedAt', 'deletedBy'].includes(key))
        .map(([key, nestedValue]) => [key, stripSystemFields(nestedValue)]),
    ) as T;
  }

  return value;
}

function normalizeContent(value: unknown): ShowroomV2ContentContract {
  const source = stripSystemFields((value ?? {}) as Partial<ShowroomV2ContentContract>);
  const defaults = createShowroomV2DefaultContent();
  const brand = (source.brand ?? {}) as Partial<ShowroomV2ContentContract['brand']>;
  const navigation = (source.navigation ?? {}) as Partial<ShowroomV2ContentContract['navigation']>;
  const notFound = (source.notFound ?? {}) as Partial<ShowroomV2ContentContract['notFound']>;
  const home = (source.home ?? {}) as Partial<ShowroomV2ContentContract['home']>;
  const about = (source.about ?? {}) as Partial<ShowroomV2ContentContract['about']>;
  const collections = (source.collections ?? {}) as Partial<ShowroomV2ContentContract['collections']>;
  const rows = (collections.rows ?? {}) as Partial<ShowroomV2ContentContract['collections']['rows']>;
  const productsLanding = (source.productsLanding ?? {}) as Partial<ShowroomV2ContentContract['productsLanding']>;
  const newsLanding = (source.newsLanding ?? {}) as Partial<ShowroomV2ContentContract['newsLanding']>;
  const artisans = (source.artisans ?? {}) as Partial<ShowroomV2ContentContract['artisans']>;
  const contact = (source.contact ?? {}) as Partial<ShowroomV2ContentContract['contact']>;
  const catalog = (source.catalog ?? {}) as Partial<ShowroomV2ContentContract['catalog']>;

  return {
    brand: {
      ...defaults.brand,
      ...brand,
    },
    navigation: {
      ...defaults.navigation,
      ...navigation,
      items: ensureArray(navigation.items ?? defaults.navigation.items),
    },
    notFound: {
      ...defaults.notFound,
      ...notFound,
    },
    home: {
      ...defaults.home,
      ...home,
      interactionFeatures: ensureArray(home.interactionFeatures ?? defaults.home.interactionFeatures),
      collections: ensureArray(home.collections ?? defaults.home.collections),
      process: ensureArray(home.process ?? defaults.home.process),
      promises: ensureArray(home.promises ?? defaults.home.promises),
    },
    about: {
      ...defaults.about,
      ...about,
      elements: ensureArray(about.elements ?? defaults.about.elements),
    },
    collections: {
      ...defaults.collections,
      ...collections,
      rows: {
        ...defaults.collections.rows,
        ...rows,
        row1: ensureArray(rows.row1 ?? defaults.collections.rows.row1),
        row2: ensureArray(rows.row2 ?? defaults.collections.rows.row2),
        row3: ensureArray(rows.row3 ?? defaults.collections.rows.row3),
      },
    },
    productsLanding: {
      ...defaults.productsLanding,
      ...productsLanding,
      categories: ensureArray(productsLanding.categories ?? defaults.productsLanding.categories),
      productFeatures: ensureArray(productsLanding.productFeatures ?? defaults.productsLanding.productFeatures),
      trustBadges: ensureArray(productsLanding.trustBadges ?? defaults.productsLanding.trustBadges),
    },
    newsLanding: {
      ...defaults.newsLanding,
      ...newsLanding,
      categories: ensureArray(newsLanding.categories ?? defaults.newsLanding.categories),
      newsCards: ensureArray(newsLanding.newsCards ?? defaults.newsLanding.newsCards),
    },
    artisans: {
      ...defaults.artisans,
      ...artisans,
    },
    contact: {
      ...defaults.contact,
      ...contact,
    },
    catalog: {
      ...defaults.catalog,
      ...catalog,
      listingLabels: {
        ...defaults.catalog.listingLabels,
        ...catalog.listingLabels,
      },
      detailLabels: {
        ...defaults.catalog.detailLabels,
        ...catalog.detailLabels,
      },
    },
  };
}

export function ShowroomV2ContentPage() {
  const [content, setContent] = useState<ShowroomV2ContentContract | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [dirty, setDirty] = useState(false);
  const [activeTab, setActiveTab] = useState<'brand' | 'home' | 'about' | 'collections' | 'products' | 'artisans' | 'contact' | 'catalog'>('brand');
  const { toast } = useToast();

  useEffect(() => {
    loadContent();
  }, []);

  useEffect(() => {
    const warnBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!dirty) return;
      event.preventDefault();
    };
    window.addEventListener('beforeunload', warnBeforeUnload);
    return () => window.removeEventListener('beforeunload', warnBeforeUnload);
  }, [dirty]);

  async function loadContent() {
    setLoading(true);
    setLoadError('');
    try {
      const data = await api.site.getV2Content();
      setContent(normalizeContent(data));
      setDirty(false);
    } catch (err) {
      const message = mergeApiErrorMessage('Lỗi khi tải dữ liệu', err);
      setLoadError(message);
      toast(message, 'error');
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    if (!content) return;
    const validationError = validateContent(content);
    if (validationError) {
      toast(validationError, 'error');
      return;
    }
    setSaving(true);
    try {
      const payload = normalizeContent(content);
      const saved = await api.site.updateV2Content(payload);
      setContent(normalizeContent(saved));
      setDirty(false);
      toast('Đã lưu dữ liệu thành công', 'success');
    } catch (err) {
      toast(mergeApiErrorMessage('Lỗi khi lưu dữ liệu', err), 'error');
    } finally {
      setSaving(false);
    }
  }

  function handleChange(path: string[], value: unknown) {
    setContent((previous) => previous ? writePath(previous, path, value) : previous);
    setDirty(true);
  }

  function handleArrayChange(path: string[], index: number, field: string, value: unknown) {
    if (!content) return;
    const current = readPath(content, path);
    const items = Array.isArray(current) ? [...current] : [];
    const item = isEditorRecord(items[index]) ? items[index] : {};
    items[index] = { ...item, [field]: value };
    handleChange(path, items);
  }

  function addArrayItem(path: string[], emptyItem: unknown) {
    if (!content) return;
    const current = readPath(content, path);
    handleChange(path, [...(Array.isArray(current) ? current : []), emptyItem]);
  }

  function removeArrayItem(path: string[], index: number) {
    if (!content) return;
    const current = readPath(content, path);
    handleChange(path, (Array.isArray(current) ? current : []).filter((_, itemIndex) => itemIndex !== index));
  }

  function moveArrayItem(path: string[], from: number, to: number) {
    if (!content || to < 0) return;
    const current = readPath(content, path);
    const items = Array.isArray(current) ? [...current] : [];
    if (from >= items.length || to >= items.length) return;
    const [moved] = items.splice(from, 1);
    items.splice(to, 0, moved);
    handleChange(path, items);
  }

  if (loading) return <div className="page-section">Đang tải dữ liệu...</div>;
  if (!content) {
    return (
      <div className="page-section" role="alert">
        <h2>Không thể tải nội dung Showroom V2</h2>
        <p>{loadError || 'Vui lòng kiểm tra kết nối và thử lại.'}</p>
        <button type="button" className="ghs-btn ghs-btn-primary" onClick={loadContent}>
          Thử lại
        </button>
      </div>
    );
  }

  const renderInput = (label: string, path: string[], kind: InputKind = false) => {
    const rawValue = readPath(content, path);
    const val = typeof rawValue === 'string' ? rawValue : '';
    const inputId = `showroom-v2-${path.join('-')}`;
    if (kind === 'richtext') {
      return (
        <div style={{ marginBottom: 16 }}>
          <RichTextEditor
            label={label}
            value={val}
            moduleRef="showroom-v2-content"
            fieldRef={path.join('.')}
            minHeight={160}
            onChange={(html) => handleChange(path, sanitizeRichHtml(html))}
          />
        </div>
      );
    }
    return (
      <div style={{ marginBottom: 16 }}>
        <label htmlFor={inputId} style={{ display: 'block', marginBottom: 6, fontWeight: 500, fontSize: 13 }}>{label}</label>
        {kind ? (
          <textarea
            id={inputId}
            className="ghs-input"
            value={val}
            onChange={e => handleChange(path, e.target.value)}
            style={{ width: '100%', minHeight: 80 }}
          />
        ) : (
          <input
            id={inputId}
            type="text"
            className="ghs-input"
            value={val}
            onChange={e => handleChange(path, e.target.value)}
            style={{ width: '100%' }}
          />
        )}
      </div>
    );
  };

  const renderTextFieldGroup = (
    title: string,
    basePath: string[],
    fields: Array<{ key: string; label: string; multiline?: boolean }>,
  ) => (
    <fieldset style={{ margin: '24px 0', padding: 16, border: '1px solid #e6dfd2', borderRadius: 10 }}>
      <legend style={{ padding: '0 8px', fontWeight: 700, color: '#7b5e18' }}>{title}</legend>
      {fields.map((field) => (
        <div key={field.key}>{renderInput(field.label, [...basePath, field.key], field.multiline)}</div>
      ))}
    </fieldset>
  );

  const renderImageInput = (label: string, path: string[]) => {
    const rawValue = readPath(content, path);
    const value = typeof rawValue === 'string' && rawValue ? [rawValue] : [];
    return (
      <div style={{ marginBottom: 16 }}>
        <UploadField
          label={label}
          value={value}
          accept="image/*"
          maxFiles={1}
          maxSizeMb={10}
          uploadContext={{
            moduleRef: 'showroom-v2-content',
            fieldRef: path.join('.'),
            autoCommit: true,
          }}
          onChange={(paths) => handleChange(path, paths[0] ?? '')}
        />
      </div>
    );
  };

  const renderArrayEditor = (
    title: string,
    path: string[],
    fields: { key: string; label: string; type?: EditorFieldType }[],
    emptyItem: EditorRecord,
  ) => {
    const rawArray = readPath(content, path);
    const arr = Array.isArray(rawArray) ? rawArray.filter(isEditorRecord) : [];

    return (
      <div style={{ marginBottom: 24, border: '1px solid #eee', padding: 16, borderRadius: 8 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ margin: 0, fontSize: 15 }}>{title}</h3>
          <button type="button" onClick={() => addArrayItem(path, emptyItem)} className="ghs-btn ghs-btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <Plus size={14} /> Thêm
          </button>
        </div>
        {arr.map((item, i) => (
          <div key={i} style={{ display: 'flex', gap: 12, marginBottom: 12, alignItems: 'flex-start', paddingBottom: 12, borderBottom: '1px dashed #eee' }}>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {fields.map(f => {
                if (f.type === 'checkbox') {
                  return (
                    <label key={f.key} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                      <input
                        type="checkbox"
                        checked={!!item[f.key]}
                        onChange={e => handleArrayChange(path, i, f.key, e.target.checked)}
                      />
                      {f.label}
                    </label>
                  );
                }
                if (f.type === 'image') {
                  const rawImage = item[f.key];
                  const imageValue = typeof rawImage === 'string' && rawImage ? [rawImage] : [];
                  return (
                    <UploadField
                      key={f.key}
                      label={f.label}
                      value={imageValue}
                      accept="image/*"
                      maxFiles={1}
                      maxSizeMb={10}
                      uploadContext={{
                        moduleRef: 'showroom-v2-content',
                        fieldRef: [...path, String(i), f.key].join('.'),
                        autoCommit: true,
                      }}
                      onChange={(paths) => handleArrayChange(path, i, f.key, paths[0] ?? '')}
                    />
                  );
                }
                const fieldValue = item[f.key];
                if (f.type === 'richtext') {
                  return (
                    <RichTextEditor
                      key={f.key}
                      label={f.label}
                      value={typeof fieldValue === 'string' ? fieldValue : ''}
                      moduleRef="showroom-v2-content"
                      fieldRef={[...path, String(i), f.key].join('.')}
                      minHeight={140}
                      onChange={(html) => handleArrayChange(path, i, f.key, sanitizeRichHtml(html))}
                    />
                  );
                }
                if (f.type === 'textarea') {
                  return (
                    <textarea
                      key={f.key}
                      rows={6}
                      placeholder={f.label}
                      className="ghs-input"
                      value={typeof fieldValue === 'string' ? fieldValue : ''}
                      onChange={(e) => handleArrayChange(path, i, f.key, e.target.value)}
                      style={{ resize: 'vertical', minHeight: 140 }}
                    />
                  );
                }
                return (
                  <input
                    key={f.key}
                    type={f.type || 'text'}
                    min={f.type === 'number' ? 1 : undefined}
                    max={f.type === 'number' ? 10 : undefined}
                    placeholder={f.label}
                    className="ghs-input"
                    value={
                      typeof fieldValue === 'string' || typeof fieldValue === 'number'
                        ? fieldValue
                        : ''
                    }
                    onChange={e => {
                      const val: string | number = f.type === 'number' && e.target.value !== ''
                        ? Number(e.target.value)
                        : e.target.value;
                      handleArrayChange(path, i, f.key, val);
                    }}
                  />
                );
              })}
            </div>
            <button
              type="button"
              aria-label={`Xóa mục ${i + 1} khỏi ${title}`}
              onClick={() => removeArrayItem(path, i)}
              className="ghs-btn ghs-btn-danger"
              style={{ padding: 8, color: '#ff4d4f' }}
            >
              <Trash2 size={16} />
            </button>
          </div>
        ))}
      </div>
    );
  };

  const renderStringArrayEditor = (title: string, path: string[], placeholder: string) => {
    const rawArray = readPath(content, path);
    const arr = Array.isArray(rawArray)
      ? rawArray.filter((item): item is string => typeof item === 'string')
      : [];

    return (
      <div style={{ marginBottom: 24, border: '1px solid #eee', padding: 16, borderRadius: 8 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ margin: 0, fontSize: 15 }}>{title}</h3>
          <button
            type="button"
            onClick={() => addArrayItem(path, '')}
            className="ghs-btn ghs-btn-secondary"
            style={{ display: 'flex', alignItems: 'center', gap: 4 }}
          >
            <Plus size={14} /> Thêm
          </button>
        </div>
        {arr.map((item: string, i: number) => (
          <div
            key={i}
            style={{ display: 'flex', gap: 12, marginBottom: 12, alignItems: 'center', paddingBottom: 12, borderBottom: '1px dashed #eee' }}
          >
            <input
              type="text"
              className="ghs-input"
              placeholder={placeholder}
              value={item ?? ''}
              onChange={(e) => {
                const next = [...arr];
                next[i] = e.target.value;
                handleChange(path, next);
              }}
              style={{ flex: 1 }}
            />
            <div style={{ display: 'grid', gap: 6 }}>
              <button
                type="button"
                aria-label={`Đưa mục ${i + 1} lên trên`}
                disabled={i === 0}
                onClick={() => moveArrayItem(path, i, i - 1)}
                className="ghs-btn ghs-btn-secondary"
                style={{ padding: 8 }}
              >
                <ArrowUp size={16} />
              </button>
              <button
                type="button"
                aria-label={`Đưa mục ${i + 1} xuống dưới`}
                disabled={i === arr.length - 1}
                onClick={() => moveArrayItem(path, i, i + 1)}
                className="ghs-btn ghs-btn-secondary"
                style={{ padding: 8 }}
              >
                <ArrowDown size={16} />
              </button>
              <button
                type="button"
                aria-label={`Xóa mục ${i + 1} khỏi ${title}`}
                onClick={() => removeArrayItem(path, i)}
                className="ghs-btn ghs-btn-danger"
                style={{ padding: 8, color: '#ff4d4f' }}
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderSelectInput = (label: string, path: string[], options: { value: string; label: string }[]) => {
    const rawValue = readPath(content, path);
    const val = typeof rawValue === 'string' ? rawValue : '';
    const inputId = `showroom-v2-${path.join('-')}`;
    return (
      <div style={{ marginBottom: 16 }}>
        <label htmlFor={inputId} style={{ display: 'block', marginBottom: 6, fontWeight: 500, fontSize: 13 }}>{label}</label>
        <select
          id={inputId}
          className="ghs-input"
          value={val}
          onChange={(e) => handleChange(path, e.target.value)}
          style={{ width: '100%' }}
        >
          <option value="">-- Chọn bài viết --</option>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
    );
  };

  return (
    <div className="page-container" style={{ maxWidth: 800 }}>
      <div className="ghs-page-header">
        <div>
          <h1>Nội dung website</h1>
          <p>Quản lý nội dung Showroom V2. Tin tức chuyển sang menu Tin tức / Danh mục tin tức.</p>
        </div>
        <button
          type="button"
          className="ghs-btn ghs-btn-primary"
          onClick={handleSave}
          disabled={saving || !dirty}
          style={{ opacity: dirty ? 1 : 0.6 }}
        >
          {saving ? 'Đang lưu...' : dirty ? 'Lưu thay đổi' : 'Đã lưu'}
        </button>
      </div>

      <div className="ghs-tabs" style={{ marginBottom: 24 }}>
        <button className={`ghs-tab-item ${activeTab === 'brand' ? 'active' : ''}`} onClick={() => setActiveTab('brand')}>Thương hiệu</button>
        <button className={`ghs-tab-item ${activeTab === 'home' ? 'active' : ''}`} onClick={() => setActiveTab('home')}>Trang chủ</button>
        <button className={`ghs-tab-item ${activeTab === 'about' ? 'active' : ''}`} onClick={() => setActiveTab('about')}>Giới thiệu</button>
        <button className={`ghs-tab-item ${activeTab === 'collections' ? 'active' : ''}`} onClick={() => setActiveTab('collections')}>Bộ sưu tập</button>
        <button className={`ghs-tab-item ${activeTab === 'products' ? 'active' : ''}`} onClick={() => setActiveTab('products')}>Sản phẩm</button>
        <button className={`ghs-tab-item ${activeTab === 'artisans' ? 'active' : ''}`} onClick={() => setActiveTab('artisans')}>Nghệ nhân</button>
        <button className={`ghs-tab-item ${activeTab === 'contact' ? 'active' : ''}`} onClick={() => setActiveTab('contact')}>Liên hệ</button>
        <button className={`ghs-tab-item ${activeTab === 'catalog' ? 'active' : ''}`} onClick={() => setActiveTab('catalog')}>Danh mục & chi tiết</button>
      </div>

      <div className="ghs-card">
        {activeTab === 'brand' && (
          <div>
            {renderInput('Tên thương hiệu', ['brand', 'name'])}
            {renderInput('Tagline ngắn', ['brand', 'tagline'])}
            {renderInput('Mô tả thương hiệu', ['brand', 'subtitle'], 'richtext')}
            {renderInput('Địa chỉ showroom', ['brand', 'location'], true)}
            {renderInput('Số hotline', ['brand', 'phone'])}
            {renderInput('Email liên hệ', ['brand', 'email'])}
            {renderInput('Facebook URL', ['brand', 'facebookHref'])}
            {renderArrayEditor('Menu điều hướng', ['navigation', 'items'], [
              { key: 'label', label: 'Nhãn' },
              { key: 'href', label: 'Đường dẫn' },
            ], { label: '', href: '' })}
            {renderInput('404 Nhãn phụ', ['notFound', 'eyebrow'])}
            {renderInput('404 Tiêu đề', ['notFound', 'title'])}
            {renderInput('404 Nội dung', ['notFound', 'body'], 'richtext')}
            {renderInput('404 Nút về trang chủ', ['notFound', 'backLabel'])}
          </div>
        )}

        {activeTab === 'home' && (
          <div>
            {renderInput('Tiêu đề Hero', ['home', 'heroTitle'])}
            {renderInput('Phụ đề Hero', ['home', 'heroSubtitle'])}
            {renderInput('Nội dung Hero', ['home', 'heroBody'], 'richtext')}
            {renderInput('Tệp model 3D Hero (.glb)', ['home', 'heroModelUrl'])}
            {renderImageInput('Poster dự phòng của model', ['home', 'heroModelPoster'])}
            {renderImageInput('Ảnh bóng tham chiếu Hero', ['home', 'heroReferenceImage'])}
            {renderInput('Nhãn bỏ qua Intro', ['home', 'introSkipLabel'])}
            {renderInput('Nhãn nút Hero', ['home', 'heroCtaLabel'])}
            {renderInput('Liên kết nút Hero', ['home', 'heroCtaHref'])}
            {renderInput('Dòng phụ dưới logo', ['home', 'logoSubtext'])}
            {renderInput('Nhãn ngôn ngữ', ['home', 'languageLabel'])}
            {renderInput('Nhãn gợi ý cuộn', ['home', 'scrollHintLabel'])}
            {renderInput('Alt text model 3D', ['home', 'heroModelAlt'])}
            {renderInput('Gợi ý thao tác 3D', ['home', 'interactionHint'])}
            {renderStringArrayEditor('Danh sách tính năng tương tác', ['home', 'interactionFeatures'], 'Ví dụ: Xoay mô hình 360 độ')}
            {renderInput('Nhãn phụ Di sản', ['home', 'heritageEyebrow'])}
            {renderInput('Tiêu đề Di sản', ['home', 'heritageTitle'])}
            {renderInput('Nội dung Di sản', ['home', 'heritageBody'], 'richtext')}
            {renderInput('Nhãn nút Di sản', ['home', 'heritageCtaLabel'])}
            {renderInput('Liên kết nút Di sản', ['home', 'heritageCtaHref'])}
            {renderInput('Nhãn phụ Bộ sưu tập', ['home', 'collectionEyebrow'])}
            {renderInput('Tiêu đề Bộ sưu tập', ['home', 'collectionTitle'])}
            {renderInput('Nhãn nút Bộ sưu tập', ['home', 'collectionCtaLabel'])}
            {renderInput('Liên kết nút Bộ sưu tập', ['home', 'collectionCtaHref'])}
            {renderInput('Dòng bản quyền chân trang', ['home', 'footerCopyright'])}

            {renderArrayEditor('Thẻ bộ sưu tập', ['home', 'collections'], [
              { key: 'img', label: 'Hình ảnh', type: 'image' },
              { key: 'title', label: 'Tiêu đề' },
              { key: 'sub', label: 'Phụ đề' },
              { key: 'href', label: 'Đường dẫn (URL)' }
            ], { img: '', title: '', sub: '', href: '' })}

            {renderArrayEditor('Quy trình', ['home', 'process'], [
              { key: 'img', label: 'Hình ảnh', type: 'image' },
              { key: 'title', label: 'Tiêu đề' },
              { key: 'desc', label: 'Mô tả', type: 'richtext' },
              { key: 'position', label: 'Vị trí background (vd: 50% 50%)' }
            ], { img: '', title: '', desc: '', position: '50% 50%' })}

            {renderArrayEditor('Cam kết', ['home', 'promises'], [
              { key: 'title', label: 'Tiêu đề' },
              { key: 'desc', label: 'Mô tả', type: 'richtext' }
            ], { title: '', desc: '' })}
          </div>
        )}
        
        {activeTab === 'about' && (
          <div>
            {renderInput('Nhãn phụ Hero', ['about', 'heroEyebrow'])}
            {renderInput('Tiêu đề Hero', ['about', 'heroTitle'])}
            {renderInput('Mô tả Hero', ['about', 'heroDesc'], 'richtext')}
            {renderImageInput('Ảnh nền Hero', ['about', 'heroBg'])}
            {renderInput('Nhãn nút Hero', ['about', 'heroCtaLabel'])}
            {renderInput('Liên kết nút Hero', ['about', 'heroCtaHref'])}
            {renderInput('Mô tả ảnh Hero', ['about', 'heroImageAlt'])}
            {renderInput('Nội dung trích dẫn', ['about', 'quoteText'], 'richtext')}
            {renderInput('Tác giả trích dẫn', ['about', 'quoteAuthor'])}
            {renderImageInput('Ảnh nền trích dẫn', ['about', 'quoteBg'])}

            {renderArrayEditor('Thành tố Ngũ hành', ['about', 'elements'], [
              { key: 'id', label: 'ID' },
              { key: 'title', label: 'Tiêu đề' },
              { key: 'desc', label: 'Mô tả', type: 'richtext' },
              { key: 'img', label: 'Hình ảnh', type: 'image' },
              { key: 'iconType', label: 'Tên icon (vd: lotus, leaf, flame)' },
              { key: 'isActive', label: 'Đang nổi bật', type: 'checkbox' }
            ], { id: '', title: '', desc: '', img: '', iconType: '', isActive: false })}
          </div>
        )}

        {activeTab === 'collections' && (
          <div>
            <div style={{ marginBottom: 20, padding: 14, borderRadius: 12, background: '#f8f3e8', color: '#7b5e18', fontSize: 13, lineHeight: 1.6 }}>
              Hàng 1 và Hàng 3 là bố cục 2 ô theo tỷ lệ 6/4. Hàng 2 là bố cục 3 ô với tỷ lệ 3/3/4.
              Vùng chữ nên ưu tiên nằm trong khoảng 50% bên trái của ảnh để không che chủ thể.
            </div>
            {renderInput('Nhãn phụ Hero', ['collections', 'heroEyebrow'])}
            {renderInput('Tiêu đề Hero', ['collections', 'heroTitle'])}
            {renderInput('Mô tả Hero', ['collections', 'heroDesc'], 'richtext')}
            {renderImageInput('Ảnh nền Hero', ['collections', 'heroBg'])}
            {renderInput('Nhãn nút Hero', ['collections', 'heroCtaLabel'])}
            {renderInput('Liên kết nút Hero', ['collections', 'heroCtaHref'])}
            {renderInput('Nhãn nút Khám phá', ['collections', 'tileCtaLabel'])}

            {renderArrayEditor('Hàng 1 (2 ô lớn)', ['collections', 'rows', 'row1'], [
              { key: 'id', label: 'ID' },
              { key: 'title', label: 'Tiêu đề' },
              { key: 'desc', label: 'Mô tả', type: 'richtext' },
              { key: 'img', label: 'Hình ảnh', type: 'image' },
              { key: 'href', label: 'Đường dẫn khi bấm Khám phá' },
              { key: 'span', label: 'Độ rộng cột (1-10)', type: 'number' }
            ], { id: '', title: '', desc: '', img: '', href: '', span: 1 })}

            {renderArrayEditor('Hàng 2 (3 ô)', ['collections', 'rows', 'row2'], [
              { key: 'id', label: 'ID' },
              { key: 'title', label: 'Tiêu đề' },
              { key: 'desc', label: 'Mô tả', type: 'richtext' },
              { key: 'img', label: 'Hình ảnh', type: 'image' },
              { key: 'href', label: 'Đường dẫn khi bấm Khám phá' },
              { key: 'span', label: 'Độ rộng cột (1-10)', type: 'number' }
            ], { id: '', title: '', desc: '', img: '', href: '', span: 1 })}

            {renderArrayEditor('Hàng 3 (2 ô)', ['collections', 'rows', 'row3'], [
              { key: 'id', label: 'ID' },
              { key: 'title', label: 'Tiêu đề' },
              { key: 'desc', label: 'Mô tả', type: 'richtext' },
              { key: 'img', label: 'Hình ảnh', type: 'image' },
              { key: 'href', label: 'Đường dẫn khi bấm Khám phá' },
              { key: 'span', label: 'Độ rộng cột (1-10)', type: 'number' }
            ], { id: '', title: '', desc: '', img: '', href: '', span: 1 })}
          </div>
        )}

        {activeTab === 'products' && (
          <div>
            {renderInput('Tiêu đề Hero', ['productsLanding', 'heroTitle'])}
            {renderInput('Phụ đề Hero', ['productsLanding', 'heroSubtitle'])}
            {renderInput('Mô tả Hero', ['productsLanding', 'heroDesc'], 'richtext')}
            {renderInput('Nội dung badge', ['productsLanding', 'badgeText'], 'richtext')}
            {renderImageInput('Ảnh nền Hero', ['productsLanding', 'heroBg'])}
            {renderInput('Nhãn khu nổi bật', ['productsLanding', 'featuredSectionLabel'])}
            
            {renderArrayEditor('Danh mục nổi bật', ['productsLanding', 'categories'], [
              { key: 'id', label: 'ID' },
              { key: 'title', label: 'Tiêu đề' },
              { key: 'desc', label: 'Mô tả', type: 'richtext' },
              { key: 'img', label: 'Hình ảnh', type: 'image' },
              { key: 'href', label: 'Đường dẫn (URL)' }
            ], { id: '', title: '', desc: '', img: '', href: '' })}

            {renderArrayEditor('Điểm nhấn sản phẩm', ['productsLanding', 'productFeatures'], [
              { key: 'iconType', label: 'Tên icon (vd: lotus, wind)' },
              { key: 'title', label: 'Tiêu đề' },
              { key: 'desc', label: 'Mô tả', type: 'richtext' }
            ], { iconType: '', title: '', desc: '' })}

            {renderArrayEditor('Cam kết dịch vụ', ['productsLanding', 'trustBadges'], [
              { key: 'iconType', label: 'Tên icon (vd: check, package)' },
              { key: 'title', label: 'Tiêu đề' },
              { key: 'desc', label: 'Mô tả', type: 'richtext' }
            ], { iconType: '', title: '', desc: '' })}
          </div>
        )}

        {activeTab === 'artisans' && (
          <div>
            {renderInput('Nhãn phụ', ['artisans', 'eyebrow'])}
            {renderInput('Tiêu đề trang', ['artisans', 'title'])}
            {renderInput('Mô tả trang', ['artisans', 'desc'], 'richtext')}
            {renderInput('Đang tải', ['artisans', 'loadingText'])}
            {renderInput('Tiêu đề lỗi tải', ['artisans', 'errorTitle'])}
            {renderInput('Nội dung lỗi tải', ['artisans', 'errorText'], true)}
            {renderInput('Nhãn thử lại', ['artisans', 'retryLabel'])}
            {renderInput('Danh sách trống', ['artisans', 'emptyText'])}
            {renderInput('Tiêu đề không tìm thấy', ['artisans', 'notFoundTitle'])}
            {renderInput('Mô tả không tìm thấy', ['artisans', 'notFoundBody'], 'richtext')}
            {renderInput('Nhãn quay lại', ['artisans', 'backLabel'])}
            {renderInput('Nhãn xem hồ sơ', ['artisans', 'profileCtaLabel'])}
            {renderInput('Nhãn số năm kinh nghiệm', ['artisans', 'experienceLabel'])}
            {renderInput('Tiêu đề Tiểu sử', ['artisans', 'bioTitle'])}
            {renderInput('Tiêu đề Dòng nghề', ['artisans', 'lineageTitle'])}
            {renderInput('Tiêu đề Xưởng gốm', ['artisans', 'workshopTitle'])}
            {renderInput('Tiêu đề Chứng nhận', ['artisans', 'certificationsTitle'])}
            {renderInput('Tiêu đề Liên hệ', ['artisans', 'contactTitle'])}
            {renderInput('Nội dung Liên hệ', ['artisans', 'contactBody'], 'richtext')}
            {renderInput('Nhãn gọi điện', ['artisans', 'phoneCtaLabel'])}
            {renderInput('Nhãn gửi email', ['artisans', 'emailCtaLabel'])}
          </div>
        )}

        {activeTab === 'contact' && (
          <div>
            {renderInput('Tiêu đề Hero', ['contact', 'heroTitle'])}
            {renderInput('Mô tả Hero', ['contact', 'heroDesc'], 'richtext')}
            {renderImageInput('Ảnh nền Hero', ['contact', 'heroBg'])}
            {renderInput('Tiêu đề biểu mẫu', ['contact', 'formTitle'])}
            {renderInput('Nhãn nút gửi', ['contact', 'submitLabel'])}
            {renderInput('Nhãn đang gửi', ['contact', 'submittingLabel'])}
            {renderInput('Thông báo thành công', ['contact', 'successMessage'])}
            {renderInput('Nhãn gửi yêu cầu mới', ['contact', 'successResetLabel'])}
            {renderInput('Thông báo lỗi', ['contact', 'errorMessage'])}
            {renderInput('Gợi ý nhập họ tên', ['contact', 'namePlaceholder'])}
            {renderInput('Gợi ý nhập số điện thoại', ['contact', 'phonePlaceholder'])}
            {renderInput('Gợi ý nhập email', ['contact', 'emailPlaceholder'])}
            {renderInput('Gợi ý nhập ghi chú', ['contact', 'notePlaceholder'])}
            {renderInput('Nhãn showroom', ['contact', 'showroomLabel'])}
            {renderInput('Nhãn hotline', ['contact', 'hotlineLabel'])}
            {renderInput('Nhãn giờ mở cửa', ['contact', 'openingHoursLabel'])}
            {renderInput('Nhãn email', ['contact', 'emailLabel'])}
            {renderInput('Giờ mở cửa', ['contact', 'openingHours'], true)}
            {renderImageInput('Ảnh khu vực chỉ đường', ['contact', 'locationBandImage'])}
            {renderInput('Mô tả ảnh chỉ đường', ['contact', 'locationImageAlt'])}
            {renderInput('Link Chỉ đường', ['contact', 'mapCtaHref'])}
            {renderInput('Nhãn nút Chỉ đường', ['contact', 'mapCtaLabel'])}
          </div>
        )}

        {activeTab === 'catalog' && (
          <div>
            {renderInput('Nhãn phụ danh mục', ['catalog', 'listingEyebrow'])}
            {renderInput('Tiêu đề danh mục', ['catalog', 'listingTitle'])}
            {renderInput('Mô tả danh mục', ['catalog', 'listingSubtitle'], 'richtext')}
            {renderInput('Tiêu đề tư vấn', ['catalog', 'listingAdvisorTitle'])}
            {renderInput('Nội dung tư vấn', ['catalog', 'listingAdvisorBody'], 'richtext')}
            {renderInput('Nội dung đang tải danh mục', ['catalog', 'listingLoadingText'])}
            {renderInput('Nội dung lỗi danh mục', ['catalog', 'listingErrorText'])}
            {renderInput('Nhãn thử lại danh mục', ['catalog', 'listingRetryLabel'])}
            {renderInput('Nội dung đang tải chi tiết', ['catalog', 'detailLoadingText'])}
            {renderInput('Nội dung lỗi chi tiết', ['catalog', 'detailErrorText'])}
            {renderInput('Nội dung không tìm thấy', ['catalog', 'detailNotFoundText'])}
            {renderInput('Nhãn nút chi tiết', ['catalog', 'detailCtaLabel'])}
            {renderInput('Nhãn quay lại', ['catalog', 'detailBackLabel'])}
            {renderTextFieldGroup('Nhãn màn danh mục', ['catalog', 'listingLabels'], [
              { key: 'featured360Label', label: 'Nhãn nút sản phẩm 360°' },
              { key: 'exploreLabel', label: 'Nhãn nút khám phá' },
              { key: 'productCountLabel', label: 'Đơn vị số sản phẩm' },
              { key: 'collectionCountLabel', label: 'Đơn vị số bộ sưu tập' },
              { key: 'glazeCountLabel', label: 'Đơn vị số dòng men' },
              { key: 'filterTitle', label: 'Tiêu đề bộ lọc' },
              { key: 'resetLabel', label: 'Nhãn đặt lại' },
              { key: 'collectionFilterLabel', label: 'Nhóm lọc bộ sưu tập' },
              { key: 'typeFilterLabel', label: 'Nhóm lọc loại sản phẩm' },
              { key: 'glazeFilterLabel', label: 'Nhóm lọc dòng men' },
              { key: 'priceFilterLabel', label: 'Nhóm lọc khoảng giá' },
              { key: 'statusFilterLabel', label: 'Nhóm lọc trạng thái' },
              { key: 'status360Label', label: 'Trạng thái có 360°' },
              { key: 'statusNewLabel', label: 'Trạng thái sản phẩm mới' },
              { key: 'statusLimitedLabel', label: 'Trạng thái giới hạn' },
              { key: 'statusBestSellerLabel', label: 'Trạng thái bán chạy' },
              { key: 'sortLabel', label: 'Nhãn sắp xếp' },
              { key: 'sortFeaturedLabel', label: 'Sắp xếp nổi bật' },
              { key: 'sortNewestLabel', label: 'Sắp xếp mới nhất' },
              { key: 'sortPriceAscLabel', label: 'Sắp xếp giá tăng' },
              { key: 'sortPriceDescLabel', label: 'Sắp xếp giá giảm' },
              { key: 'sort360Label', label: 'Sắp xếp ưu tiên 360°' },
              { key: 'badgeNewLabel', label: 'Badge mới' },
              { key: 'badgeLimitedLabel', label: 'Badge giới hạn' },
              { key: 'badgeBestSellerLabel', label: 'Badge bán chạy' },
              { key: 'quickViewLabel', label: 'Nhãn xem nhanh' },
              { key: 'experience360Label', label: 'Nhãn trải nghiệm 360°' },
              { key: 'detailLabel', label: 'Nhãn xem chi tiết' },
              { key: 'emptyTitle', label: 'Tiêu đề danh sách trống' },
              { key: 'emptyBody', label: 'Nội dung danh sách trống' },
              { key: 'emptyResetLabel', label: 'Nhãn đặt lại khi trống' },
              { key: 'advisorCtaLabel', label: 'Nhãn nút tư vấn' },
              { key: 'applyFilterLabel', label: 'Nhãn áp dụng bộ lọc' },
              { key: 'consultationLabel', label: 'Nhãn tư vấn nhanh' },
              { key: 'footerTemplate', label: 'Mẫu bản quyền ({year}, {brand})' },
            ])}
            {renderTextFieldGroup('Nhãn màn chi tiết sản phẩm', ['catalog', 'detailLabels'], [
              { key: 'loadingSubtitle', label: 'Nội dung đang tải 3D' },
              { key: 'specsTitle', label: 'Tiêu đề thông số' },
              { key: 'contactTitle', label: 'Tiêu đề tư vấn' },
              { key: 'directChatLabel', label: 'Nhãn chat trực tiếp' },
              { key: 'namePlaceholder', label: 'Gợi ý nhập họ tên' },
              { key: 'phonePlaceholder', label: 'Gợi ý nhập số điện thoại' },
              { key: 'emailPlaceholder', label: 'Gợi ý nhập email' },
              { key: 'notePlaceholder', label: 'Gợi ý nhập ghi chú' },
              { key: 'submitLabel', label: 'Nhãn gửi RFQ' },
              { key: 'submittingLabel', label: 'Nhãn đang gửi RFQ' },
              { key: 'successTemplate', label: 'Thông báo thành công ({name})' },
              { key: 'errorMessage', label: 'Thông báo lỗi RFQ' },
              { key: 'view360Title', label: 'Tiêu đề trải nghiệm 360°' },
              { key: 'view360Note', label: 'Ghi chú trải nghiệm 360°', multiline: true },
              { key: 'exit3dLabel', label: 'Nhãn thoát 3D' },
              { key: 'fullscreen3dLabel', label: 'Nhãn xem 3D toàn màn hình' },
              { key: 'productInfoLabel', label: 'Nhãn xem thông tin tác phẩm' },
              { key: 'imageUpdatingLabel', label: 'Nội dung ảnh đang cập nhật' },
              { key: 'imageLabel', label: 'Nhãn thứ tự hình' },
              { key: 'viewLabel', label: 'Nhãn góc nhìn' },
              { key: 'interact3dLabel', label: 'Nhãn tương tác 3D' },
              { key: 'video360Label', label: 'Nhãn video 360°' },
              { key: 'variantsTitle', label: 'Tiêu đề biến thể' },
              { key: 'storyTitle', label: 'Tiêu đề câu chuyện' },
              { key: 'zaloLabel', label: 'Nhãn Zalo' },
              { key: 'hotlineLabel', label: 'Nhãn Hotline' },
              { key: 'emailLabel', label: 'Nhãn Email' },
              { key: 'rfqTitle', label: 'Tiêu đề yêu cầu báo giá' },
              { key: 'shortcutVariantLabel', label: 'Gợi ý nhanh biến thể' },
              { key: 'shortcutStoryLabel', label: 'Gợi ý nhanh câu chuyện' },
              { key: 'shortcutSpecsLabel', label: 'Gợi ý nhanh thông số' },
              { key: 'shortcutContactLabel', label: 'Gợi ý nhanh tư vấn' },
            ])}
          </div>
        )}
      </div>
    </div>
  );
}
