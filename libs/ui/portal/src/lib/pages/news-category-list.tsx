import { FormEvent, useEffect, useMemo, useState } from 'react';
import { slugifyVi as slugify, type ShowroomV2ContentContract } from '@gomhoasen/contracts';
import { readTrimmedString } from '@vt/common-utils';
import { useConfirm } from '../components/confirm-dialog';
import { LoadErrorState } from '../components/load-error-state';
import { useToast } from '../components/toast';
import { mergeApiErrorMessage } from '../services/api-error';
import {
  listNewsCards,
  listNewsCategories,
  loadV2News,
  saveV2NewsLanding,
  type NewsCategory,
  type NewsLanding,
} from '../services/news-content';

interface CategoryForm {
  id: string;
  name: string;
  slug: string;
}

const EMPTY: CategoryForm = { id: '', name: '', slug: '' };

export function NewsCategoryListPage() {
  const { confirm } = useConfirm();
  const { toast } = useToast();
  const [content, setContent] = useState<ShowroomV2ContentContract | null>(null);
  const [newsLanding, setNewsLanding] = useState<NewsLanding | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<CategoryForm>(EMPTY);
  const [editingId, setEditingId] = useState<string | null>(null);

  const categories = useMemo(
    () => (newsLanding ? listNewsCategories(newsLanding) : []),
    [newsLanding],
  );
  const articles = useMemo(
    () => (newsLanding ? listNewsCards(newsLanding) : []),
    [newsLanding],
  );

  const load = () => {
    setLoading(true);
    setLoadError('');
    loadV2News()
      .then(({ content: nextContent, newsLanding: nextLanding }) => {
        setContent(nextContent);
        setNewsLanding(nextLanding);
      })
      .catch((err) => setLoadError(mergeApiErrorMessage('Không tải được danh mục tin tức', err)))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const resetForm = () => {
    setForm(EMPTY);
    setEditingId(null);
  };

  const startEdit = (category: NewsCategory) => {
    setEditingId(category.id);
    setForm({ id: category.id, name: category.name, slug: category.slug });
  };

  const persist = async (nextLanding: NewsLanding, successMessage: string) => {
    if (!content) return;
    setSaving(true);
    try {
      const saved = await saveV2NewsLanding(content, nextLanding);
      setContent(saved);
      setNewsLanding(saved.newsLanding);
      toast(successMessage, 'success');
      resetForm();
    } catch (err) {
      toast(mergeApiErrorMessage('Lưu danh mục thất bại', err), 'error');
      throw err;
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!newsLanding) return;
    const name = readTrimmedString(form.name);
    const slug = readTrimmedString(form.slug) || slugify(name || '');
    if (!name) {
      toast('Vui lòng nhập tên danh mục.', 'error');
      return;
    }
    if (!slug || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
      toast('Slug chỉ dùng chữ thường không dấu, số và dấu gạch ngang.', 'error');
      return;
    }
    const duplicateName = categories.some(
      (item) => item.id !== editingId && item.name.toLocaleLowerCase('vi') === name.toLocaleLowerCase('vi'),
    );
    if (duplicateName) {
      toast('Tên danh mục đã tồn tại.', 'error');
      return;
    }
    const duplicateSlug = categories.some(
      (item) => item.id !== editingId && item.slug === slug,
    );
    if (duplicateSlug) {
      toast('Slug danh mục đã tồn tại.', 'error');
      return;
    }

    const previous = editingId
      ? categories.find((item) => item.id === editingId)
      : null;
    const nextCategory: NewsCategory = {
      id: editingId || `nc-${slug}-${Date.now().toString(36)}`,
      name,
      slug,
    };
    const nextCategories = editingId
      ? categories.map((item) => (item.id === editingId ? nextCategory : item))
      : [...categories, nextCategory];

    let nextCards = listNewsCards(newsLanding);
    if (previous && previous.name !== name) {
      nextCards = nextCards.map((card) =>
        card.category === previous.name ? { ...card, category: name } : card,
      );
    }

    await persist(
      {
        ...newsLanding,
        categories: nextCategories,
        newsCards: nextCards,
      },
      editingId ? 'Đã cập nhật danh mục tin tức.' : 'Đã tạo danh mục tin tức.',
    );
  };

  const requestDelete = (category: NewsCategory) => {
    const inUse = articles.filter((item) => item.category === category.name).length;
    if (inUse > 0) {
      toast(`Không thể xóa: còn ${inUse} bài đang dùng danh mục này.`, 'error');
      return;
    }
    confirm({
      title: 'Xóa danh mục tin tức?',
      description: `Danh mục "${category.name}" sẽ bị xóa khỏi hệ thống.`,
      confirmLabel: 'Xóa',
      variant: 'danger',
      onConfirm: async () => {
        if (!newsLanding) return;
        await persist(
          {
            ...newsLanding,
            categories: categories.filter((item) => item.id !== category.id),
          },
          'Đã xóa danh mục tin tức.',
        );
      },
    });
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
          <h1>Danh mục tin tức</h1>
          <p>Quản lý chuyên mục dùng khi đăng bài viết.</p>
        </div>
      </div>

      <form className="ghs-card" onSubmit={handleSubmit} style={{ marginBottom: 20 }}>
        <h2 style={{ margin: '0 0 16px', fontSize: '1.05rem' }}>
          {editingId ? 'Sửa danh mục' : 'Thêm danh mục'}
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
          <label>
            <span className="ghs-label">Tên danh mục</span>
            <input
              className="ghs-input"
              value={form.name}
              onChange={(e) => {
                const name = e.target.value;
                setForm((prev) => ({
                  ...prev,
                  name,
                  slug: editingId ? prev.slug : slugify(name),
                }));
              }}
              required
            />
          </label>
          <label>
            <span className="ghs-label">Slug</span>
            <input
              className="ghs-input"
              value={form.slug}
              onChange={(e) => setForm((prev) => ({ ...prev, slug: e.target.value }))}
              required
            />
          </label>
        </div>
        <div style={{ display: 'flex', gap: 12, marginTop: 16, flexWrap: 'wrap' }}>
          <button type="submit" className="ghs-btn ghs-btn-primary" disabled={saving}>
            {saving ? 'Đang lưu...' : editingId ? 'Cập nhật' : 'Thêm danh mục'}
          </button>
          {editingId ? (
            <button type="button" className="ghs-btn ghs-btn-ghost" onClick={resetForm} disabled={saving}>
              Hủy
            </button>
          ) : null}
        </div>
      </form>

      {categories.length === 0 ? (
        <div className="ghs-card ghs-empty">
          <h3 style={{ margin: '0 0 8px' }}>Chưa có danh mục</h3>
          <p style={{ margin: 0, color: 'var(--ghs-text-muted)' }}>
            Tạo danh mục trước khi đăng tin tức.
          </p>
        </div>
      ) : (
        <div className="ghs-card" style={{ padding: 0, overflow: 'hidden' }}>
          <table className="ghs-table">
            <thead>
              <tr>
                <th>Tên</th>
                <th>Slug</th>
                <th>Số bài</th>
                <th style={{ width: 160 }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((category) => {
                const count = articles.filter((item) => item.category === category.name).length;
                return (
                  <tr key={category.id}>
                    <td>{category.name}</td>
                    <td>{category.slug}</td>
                    <td>{count}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button
                          type="button"
                          className="ghs-btn ghs-btn-ghost ghs-btn-sm"
                          onClick={() => startEdit(category)}
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
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
