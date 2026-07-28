import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { slugifyVi as slugify } from '@gomhoasen/contracts';
import { readTrimmedString } from '@vt/common-utils';
import { LoadErrorState } from '../components/load-error-state';
import { UploadField } from '../components/upload-field';
import { useToast } from '../components/toast';
import { mergeApiErrorMessage } from '../services/api-error';
import {
  listNewsCards,
  listNewsCategories,
  loadV2News,
  saveV2NewsLanding,
  type NewsCard,
  type NewsLanding,
} from '../services/news-content';
import type { ShowroomV2ContentContract } from '@gomhoasen/contracts';
import { readStringInput } from '../utils/form-normalization';

interface NewsFormData {
  id: string;
  title: string;
  slug: string;
  category: string;
  date: string;
  excerpt: string;
  image: string;
  author: string;
  readingTime: string;
  content: string;
  featured: boolean;
}

const EMPTY: NewsFormData = {
  id: '',
  title: '',
  slug: '',
  category: '',
  date: '',
  excerpt: '',
  image: '',
  author: '',
  readingTime: '3 phút đọc',
  content: '',
  featured: false,
};

function createArticleId(): string {
  return `n-${Date.now().toString(36)}`;
}

export function NewsFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const isEdit = !!id;
  const [content, setContent] = useState<ShowroomV2ContentContract | null>(null);
  const [newsLanding, setNewsLanding] = useState<NewsLanding | null>(null);
  const [form, setForm] = useState<NewsFormData>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const categories = useMemo(
    () => (newsLanding ? listNewsCategories(newsLanding) : []),
    [newsLanding],
  );

  useEffect(() => {
    setLoading(true);
    setLoadError('');
    loadV2News()
      .then(({ content: nextContent, newsLanding: nextLanding }) => {
        setContent(nextContent);
        setNewsLanding(nextLanding);
        const cards = listNewsCards(nextLanding);
        const cats = listNewsCategories(nextLanding);
        if (isEdit && id) {
          const article = cards.find((item) => item.id === id);
          if (!article) {
            setLoadError('Không tìm thấy bài viết.');
            return;
          }
          setForm({
            id: article.id,
            title: readStringInput(article.title),
            slug: readStringInput(article.slug),
            category: readStringInput(article.category),
            date: readStringInput(article.date),
            excerpt: readStringInput(article.excerpt),
            image: readStringInput(article.image),
            author: readStringInput(article.author),
            readingTime: readStringInput(article.readingTime) || '3 phút đọc',
            content: readStringInput(article.content),
            featured: nextLanding.featuredId === article.id,
          });
          return;
        }
        setForm({
          ...EMPTY,
          id: createArticleId(),
          category: cats[0]?.name ?? '',
          author: nextContent.brand?.name?.trim() || 'Ban biên tập Gốm Hoa Sen',
        });
      })
      .catch((err) => setLoadError(mergeApiErrorMessage('Không tải được bài viết', err)))
      .finally(() => setLoading(false));
  }, [id, isEdit, reloadKey]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = type === 'checkbox' ? (e.target as HTMLInputElement).checked : undefined;
    setForm((prev) => {
      const next = {
        ...prev,
        [name]: type === 'checkbox' ? Boolean(checked) : value,
      };
      if (name === 'title' && !isEdit) {
        next.slug = slugify(value);
      }
      return next;
    });
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!content || !newsLanding) return;
    setSaving(true);
    setError(null);

    const title = readTrimmedString(form.title);
    const slug = readTrimmedString(form.slug);
    const category = readTrimmedString(form.category);
    const image = readTrimmedString(form.image);
    const articleContent = readTrimmedString(form.content);

    if (!title || !slug || !category || !image || !articleContent) {
      const message = 'Vui lòng nhập đủ tiêu đề, slug, danh mục, hình ảnh và nội dung.';
      setError(message);
      toast(message, 'error');
      setSaving(false);
      return;
    }
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
      const message = 'Slug chỉ dùng chữ thường không dấu, số và dấu gạch ngang.';
      setError(message);
      toast(message, 'error');
      setSaving(false);
      return;
    }
    if (!categories.some((item) => item.name === category)) {
      const message = 'Danh mục không hợp lệ. Tạo danh mục trước khi đăng bài.';
      setError(message);
      toast(message, 'error');
      setSaving(false);
      return;
    }

    const cards = listNewsCards(newsLanding);
    if (cards.some((item) => item.id !== form.id && item.slug === slug)) {
      const message = `Slug "${slug}" đang được dùng bởi bài khác.`;
      setError(message);
      toast(message, 'error');
      setSaving(false);
      return;
    }

    const article: NewsCard = {
      id: form.id || createArticleId(),
      title,
      slug,
      category,
      date: readTrimmedString(form.date) || '',
      excerpt: readTrimmedString(form.excerpt) || '',
      image,
      author: readTrimmedString(form.author) || content.brand?.name || 'Gốm Hoa Sen',
      readingTime: readTrimmedString(form.readingTime) || '3 phút đọc',
      content: form.content.trim(),
    };

    const nextCards = isEdit
      ? cards.map((item) => (item.id === article.id ? article : item))
      : [article, ...cards];

    let featuredId = newsLanding.featuredId ?? '';
    if (form.featured) {
      featuredId = article.id;
    } else if (featuredId === article.id) {
      featuredId = '';
    }

    try {
      await saveV2NewsLanding(content, {
        ...newsLanding,
        featuredId,
        newsCards: nextCards,
      });
      toast(isEdit ? 'Đã cập nhật bài viết.' : 'Đã đăng bài viết.', 'success');
      navigate('/admin/news');
    } catch (err) {
      const message = mergeApiErrorMessage('Lưu bài viết thất bại', err);
      setError(message);
      toast(message, 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div style={{ textAlign: 'center', padding: 48, color: 'var(--ghs-text-muted)' }}>Đang tải...</div>;
  }
  if (loadError) {
    return <LoadErrorState message={loadError} onRetry={() => setReloadKey((value) => value + 1)} />;
  }

  return (
    <div>
      <div className="ghs-page-header">
        <div>
          <h1>{isEdit ? 'Sửa bài viết' : 'Đăng tin tức'}</h1>
          <p>Nội dung lưu vào trang Tin tức trên website.</p>
        </div>
      </div>

      {categories.length === 0 ? (
        <div className="ghs-card ghs-empty">
          <h3 style={{ margin: '0 0 8px' }}>Chưa có danh mục tin tức</h3>
          <p style={{ margin: '0 0 16px', color: 'var(--ghs-text-muted)' }}>
            Tạo ít nhất một danh mục trước khi đăng bài.
          </p>
          <button type="button" className="ghs-btn ghs-btn-primary" onClick={() => navigate('/admin/news-categories')}>
            Đi tới danh mục tin tức
          </button>
        </div>
      ) : (
        <form className="ghs-card" onSubmit={handleSubmit}>
          {error ? (
            <div style={{ marginBottom: 16, color: 'var(--ghs-danger)', fontSize: '0.9rem' }}>{error}</div>
          ) : null}

          <label style={{ display: 'block', marginBottom: 16 }}>
            <span className="ghs-label">Tiêu đề</span>
            <input className="ghs-input" name="title" value={form.title} onChange={handleChange} required />
          </label>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 16 }}>
            <label>
              <span className="ghs-label">Slug URL</span>
              <input className="ghs-input" name="slug" value={form.slug} onChange={handleChange} required />
            </label>
            <label>
              <span className="ghs-label">Danh mục</span>
              <select className="ghs-select ghs-input" name="category" value={form.category} onChange={handleChange} required>
                {categories.map((category) => (
                  <option key={category.id} value={category.name}>
                    {category.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span className="ghs-label">Ngày hiển thị</span>
              <input
                className="ghs-input"
                name="date"
                value={form.date}
                onChange={handleChange}
                placeholder="VD: 10 THG 11, 2026"
              />
            </label>
          </div>

          <label style={{ display: 'block', marginBottom: 16 }}>
            <span className="ghs-label">Tóm tắt</span>
            <textarea className="ghs-textarea" name="excerpt" value={form.excerpt} onChange={handleChange} rows={3} />
          </label>

          <div style={{ marginBottom: 16 }}>
            <UploadField
              label="Hình ảnh"
              value={form.image ? [form.image] : []}
              accept="image/*"
              maxFiles={1}
              maxSizeMb={10}
              uploadContext={{
                moduleRef: 'showroom-v2-content',
                fieldRef: `newsLanding.newsCards.${form.id}.image`,
                autoCommit: true,
              }}
              onChange={(paths) => setForm((prev) => ({ ...prev, image: paths[0] ?? '' }))}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 16 }}>
            <label>
              <span className="ghs-label">Tác giả</span>
              <input className="ghs-input" name="author" value={form.author} onChange={handleChange} />
            </label>
            <label>
              <span className="ghs-label">Thời lượng đọc</span>
              <input className="ghs-input" name="readingTime" value={form.readingTime} onChange={handleChange} />
            </label>
          </div>

          <label style={{ display: 'block', marginBottom: 16 }}>
            <span className="ghs-label">Nội dung chi tiết</span>
            <textarea
              className="ghs-textarea"
              name="content"
              value={form.content}
              onChange={handleChange}
              rows={12}
              required
              placeholder="Cách đoạn bằng một dòng trống"
            />
          </label>

          <label style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
            <input type="checkbox" name="featured" checked={form.featured} onChange={handleChange} />
            <span>Đặt làm bài nổi bật (Hero)</span>
          </label>

          <div className="ghs-sticky-actions">
            <button type="button" className="ghs-btn ghs-btn-ghost" onClick={() => navigate('/admin/news')} disabled={saving}>
              Hủy
            </button>
            <button type="submit" className="ghs-btn ghs-btn-primary" disabled={saving}>
              {saving ? 'Đang lưu...' : isEdit ? 'Cập nhật' : 'Đăng bài'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
