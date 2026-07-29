import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiAssetUrl } from '../services/api';
import { mergeApiErrorMessage } from '../services/api-error';
import { useConfirm } from '../components/confirm-dialog';
import { LoadErrorState } from '../components/load-error-state';
import { useToast } from '../components/toast';
import {
  listNewsCards,
  listNewsCategories,
  loadV2News,
  saveV2NewsLanding,
  type NewsCard,
  type NewsLanding,
} from '../services/news-content';
import type { ShowroomV2ContentContract } from '@gomhoasen/contracts';

export function NewsListPage() {
  const navigate = useNavigate();
  const { confirm } = useConfirm();
  const { toast } = useToast();
  const [content, setContent] = useState<ShowroomV2ContentContract | null>(null);
  const [newsLanding, setNewsLanding] = useState<NewsLanding | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [savingSettings, setSavingSettings] = useState(false);

  const articles = useMemo(
    () => (newsLanding ? listNewsCards(newsLanding) : []),
    [newsLanding],
  );
  const categories = useMemo(
    () => (newsLanding ? listNewsCategories(newsLanding) : []),
    [newsLanding],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLocaleLowerCase('vi');
    return articles.filter((item) => {
      if (categoryFilter !== 'all' && item.category !== categoryFilter) return false;
      if (!q) return true;
      return (
        item.title.toLocaleLowerCase('vi').includes(q) ||
        item.slug.toLocaleLowerCase('vi').includes(q) ||
        item.category.toLocaleLowerCase('vi').includes(q)
      );
    });
  }, [articles, categoryFilter, search]);

  const load = () => {
    setLoading(true);
    setLoadError('');
    loadV2News()
      .then(({ content: nextContent, newsLanding: nextLanding }) => {
        setContent(nextContent);
        setNewsLanding(nextLanding);
      })
      .catch((err) => setLoadError(mergeApiErrorMessage('Không tải được danh sách tin tức', err)))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const requestDelete = (article: NewsCard) => {
    confirm({
      title: 'Xóa bài viết?',
      description: `"${article.title}" sẽ bị xóa khỏi trang Tin tức.`,
      confirmLabel: 'Xóa',
      variant: 'danger',
      onConfirm: async () => {
        if (!content || !newsLanding) return;
        try {
          const nextCards = articles.filter((item) => item.id !== article.id);
          const featuredId =
            newsLanding.featuredId === article.id ? '' : newsLanding.featuredId;
          const saved = await saveV2NewsLanding(content, {
            ...newsLanding,
            featuredId,
            newsCards: nextCards,
          });
          setContent(saved);
          setNewsLanding(saved.newsLanding);
          toast('Đã xóa bài viết.', 'success');
        } catch (err) {
          toast(mergeApiErrorMessage('Xóa bài viết thất bại', err), 'error');
          throw err;
        }
      },
    });
  };

  const handleSettingsSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!content || !newsLanding) return;
    const formData = new FormData(e.currentTarget);
    const nextLanding: NewsLanding = {
      ...newsLanding,
      heroEyebrow: String(formData.get('heroEyebrow') ?? ''),
      heroTitle: String(formData.get('heroTitle') ?? ''),
      heroDesc: String(formData.get('heroDesc') ?? ''),
      featuredLabel: String(formData.get('featuredLabel') ?? ''),
      allCategoryLabel: String(formData.get('allCategoryLabel') ?? ''),
      emptyStateLabel: String(formData.get('emptyStateLabel') ?? ''),
      readArticleLabel: String(formData.get('readArticleLabel') ?? ''),
      backToNewsLabel: String(formData.get('backToNewsLabel') ?? ''),
      relatedTitle: String(formData.get('relatedTitle') ?? ''),
      notFoundTitle: String(formData.get('notFoundTitle') ?? ''),
      notFoundBody: String(formData.get('notFoundBody') ?? ''),
      featuredId: String(formData.get('featuredId') ?? ''),
    };
    setSavingSettings(true);
    try {
      const saved = await saveV2NewsLanding(content, nextLanding);
      setContent(saved);
      setNewsLanding(saved.newsLanding);
      toast('Đã lưu cài đặt trang Tin tức.', 'success');
    } catch (err) {
      toast(mergeApiErrorMessage('Lưu cài đặt thất bại', err), 'error');
    } finally {
      setSavingSettings(false);
    }
  };

  if (loading) {
    return <div style={{ textAlign: 'center', padding: 48, color: 'var(--ghs-text-muted)' }}>Đang tải...</div>;
  }
  if (loadError) {
    return <LoadErrorState message={loadError} onRetry={load} />;
  }

  return (
    <div>
      <div className="ghs-page-header">
        <div>
          <h1>Tin tức</h1>
          <p>{articles.length} bài viết</p>
        </div>
        <button type="button" className="ghs-btn ghs-btn-primary" onClick={() => navigate('/admin/news/new')}>
          + Đăng tin
        </button>
      </div>

      <div className="ghs-card" style={{ marginBottom: 20, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          className="ghs-input"
          style={{ maxWidth: 320 }}
          placeholder="Tìm tiêu đề, slug, danh mục..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div role="group" aria-label="Lọc danh mục" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button
            type="button"
            className={`ghs-btn ghs-btn-ghost ghs-btn-sm${categoryFilter === 'all' ? ' active' : ''}`}
            aria-pressed={categoryFilter === 'all'}
            onClick={() => setCategoryFilter('all')}
          >
            Tất cả
          </button>
          {categories.map((category) => (
            <button
              key={category.id}
              type="button"
              className={`ghs-btn ghs-btn-ghost ghs-btn-sm${categoryFilter === category.name ? ' active' : ''}`}
              aria-pressed={categoryFilter === category.name}
              onClick={() => setCategoryFilter(category.name)}
            >
              {category.name}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="ghs-card ghs-empty" style={{ marginBottom: 20 }}>
          <h3 style={{ margin: '0 0 8px' }}>Chưa có bài viết</h3>
          <p style={{ margin: '0 0 16px', color: 'var(--ghs-text-muted)' }}>
            Đăng bài đầu tiên để hiện trên trang /tin-tuc.
          </p>
          <button type="button" className="ghs-btn ghs-btn-primary" onClick={() => navigate('/admin/news/new')}>
            + Đăng tin
          </button>
        </div>
      ) : (
        <div className="ghs-card" style={{ padding: 0, overflow: 'hidden', marginBottom: 20 }}>
          <table className="ghs-table">
            <thead>
              <tr>
                <th>Ảnh</th>
                <th>Tiêu đề</th>
                <th>Danh mục</th>
                <th>Ngày</th>
                <th style={{ width: 160 }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((article) => (
                <tr key={article.id}>
                  <td>
                    {article.image ? (
                      <img
                        src={apiAssetUrl(article.image)}
                        alt=""
                        style={{ width: 56, height: 40, objectFit: 'cover', borderRadius: 6 }}
                      />
                    ) : (
                      <span style={{ color: 'var(--ghs-text-muted)' }}>—</span>
                    )}
                  </td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{article.title}</div>
                    <div style={{ color: 'var(--ghs-text-muted)', fontSize: '0.85rem' }}>/{article.slug}</div>
                    {newsLanding?.featuredId === article.id ? (
                      <span className="ghs-badge" style={{ marginTop: 4 }}>Nổi bật</span>
                    ) : null}
                  </td>
                  <td>{article.category}</td>
                  <td>{article.date || '—'}</td>
                  <td>
                    <div className="ghs-table-actions">
                      <button
                        type="button"
                        className="ghs-btn ghs-btn-ghost ghs-btn-sm"
                        onClick={() => navigate(`/admin/news/${article.id}`)}
                      >
                        Sửa
                      </button>
                      <button
                        type="button"
                        className="ghs-btn ghs-btn-danger ghs-btn-sm"
                        onClick={() => requestDelete(article)}
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

      {newsLanding ? (
        <form className="ghs-card" onSubmit={handleSettingsSubmit}>
          <h2 style={{ margin: '0 0 8px', fontSize: '1.05rem' }}>Cài đặt trang Tin tức</h2>
          <p style={{ margin: '0 0 16px', color: 'var(--ghs-text-muted)', fontSize: '0.9rem' }}>
            Nhãn hero và thông báo trên trang công khai (thay tab Tin tức trong Nội dung website).
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
            <label>
              <span className="ghs-label">Nhãn phụ Hero</span>
              <input className="ghs-input" name="heroEyebrow" defaultValue={newsLanding.heroEyebrow ?? ''} />
            </label>
            <label>
              <span className="ghs-label">Tiêu đề Hero</span>
              <input className="ghs-input" name="heroTitle" defaultValue={newsLanding.heroTitle ?? ''} />
            </label>
            <label>
              <span className="ghs-label">Nhãn bài nổi bật</span>
              <input className="ghs-input" name="featuredLabel" defaultValue={newsLanding.featuredLabel ?? ''} />
            </label>
            <label>
              <span className="ghs-label">Nhãn tab tất cả</span>
              <input className="ghs-input" name="allCategoryLabel" defaultValue={newsLanding.allCategoryLabel ?? ''} />
            </label>
            <label>
              <span className="ghs-label">Nhãn đọc bài</span>
              <input className="ghs-input" name="readArticleLabel" defaultValue={newsLanding.readArticleLabel ?? ''} />
            </label>
            <label>
              <span className="ghs-label">Nhãn quay lại</span>
              <input className="ghs-input" name="backToNewsLabel" defaultValue={newsLanding.backToNewsLabel ?? ''} />
            </label>
            <label>
              <span className="ghs-label">Tiêu đề bài liên quan</span>
              <input className="ghs-input" name="relatedTitle" defaultValue={newsLanding.relatedTitle ?? ''} />
            </label>
            <label>
              <span className="ghs-label">Thông điệp khi trống</span>
              <input className="ghs-input" name="emptyStateLabel" defaultValue={newsLanding.emptyStateLabel ?? ''} />
            </label>
            <label>
              <span className="ghs-label">Tiêu đề không tìm thấy</span>
              <input className="ghs-input" name="notFoundTitle" defaultValue={newsLanding.notFoundTitle ?? ''} />
            </label>
            <label>
              <span className="ghs-label">Bài nổi bật (ID)</span>
              <select className="ghs-select ghs-input" name="featuredId" defaultValue={newsLanding.featuredId ?? ''}>
                <option value="">— Không chọn —</option>
                {articles.map((article) => (
                  <option key={article.id} value={article.id}>
                    {article.title}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label style={{ display: 'block', marginTop: 16 }}>
            <span className="ghs-label">Mô tả Hero</span>
            <textarea className="ghs-textarea" name="heroDesc" rows={3} defaultValue={newsLanding.heroDesc ?? ''} />
          </label>
          <label style={{ display: 'block', marginTop: 16 }}>
            <span className="ghs-label">Mô tả không tìm thấy</span>
            <textarea className="ghs-textarea" name="notFoundBody" rows={2} defaultValue={newsLanding.notFoundBody ?? ''} />
          </label>
          <div style={{ marginTop: 16 }}>
            <button type="submit" className="ghs-btn ghs-btn-primary" disabled={savingSettings}>
              {savingSettings ? 'Đang lưu...' : 'Lưu cài đặt trang'}
            </button>
          </div>
        </form>
      ) : null}
    </div>
  );
}
