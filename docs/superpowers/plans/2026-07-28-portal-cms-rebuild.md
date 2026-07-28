# Portal CMS Rebuild Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild Gốm Hoa Sen admin portal chrome + product form into a professional CMS (light content, charcoal sidebar, gold accent) with photo-first product tabs and a ready 3D/360 upload path.

**Architecture:** Keep all `/admin/*` routes and API payloads. Expand `apps/portal/src/styles.css` with design tokens + `ghs-*` primitives. Refactor `MainLayout` nav groups + mobile drawer. Restructure `product-form.tsx` JSX into tabs + sticky preview without changing `handleSubmit` payload shape. Polish list/login/other pages onto the same tokens.

**Tech Stack:** React, React Router, Vite portal app, existing `@vt/ui-components` Button where useful, Lucide icons, portal `api` client, no new npm deps.

**Spec:** `docs/superpowers/specs/2026-07-28-portal-cms-rebuild-design.md`

## Global Constraints

- No catalog API / Mongo schema changes
- No in-admin 3D model-viewer / hotspot placement UI
- Showroom public site out of scope
- Control height 44–48px; spacing 4/8/12/16/20/24/32; no page horizontal scroll at 375px
- Prefer global `ghs-*` classes over page inline styles
- Preserve existing submit validation (≥1 image) and Vietnamese error copy
- Local verify: `http://127.0.0.1:4311/admin/login`

## File map

| File | Responsibility |
|---|---|
| `apps/portal/src/styles.css` | Tokens + primitives + shell layout |
| `libs/ui/portal/src/lib/layout/main-layout.tsx` | Grouped nav, drawer, header slot |
| `libs/ui/portal/src/lib/pages/product-form.tsx` | Tabbed form + sticky preview |
| `libs/ui/portal/src/lib/pages/product-list.tsx` | Table / toolbar polish |
| `libs/ui/portal/src/lib/pages/login.tsx` | Login visual pass |
| `libs/ui/portal/src/lib/pages/dashboard.tsx` | Dashboard cards pass |
| Other `pages/*.tsx` | Light `ghs-page-header` / `ghs-card` wrapper pass |

---

### Task 1: Design tokens + CSS primitives

**Files:**
- Modify: `apps/portal/src/styles.css`

**Interfaces:**
- Produces: CSS variables and utility classes used by Tasks 2–5

- [ ] **Step 1:** Replace `:root` tokens with spec values:

```css
:root {
  --ghs-bg: #f6f7f9;
  --ghs-surface: #ffffff;
  --ghs-surface-muted: #f3f4f6;
  --ghs-text: #111827;
  --ghs-text-muted: #6b7280;
  --ghs-border: #e6e8ec;
  --ghs-primary: #b8923a;
  --ghs-primary-hover: #9a7520;
  --ghs-primary-soft: rgba(184, 146, 58, 0.14);
  --ghs-danger: #dc2626;
  --ghs-sidebar-bg: #111318;
  --ghs-sidebar-border: #222428;
  --ghs-sidebar-text: #d1d5db;
  --ghs-sidebar-text-muted: #8b8f97;
  --ghs-sidebar-active-bg: rgba(255, 255, 255, 0.08);
  --ghs-sidebar-active-text: #ffffff;
  --ghs-radius: 10px;
  --ghs-control-h: 44px;
}
```

- [ ] **Step 2:** Add primitives (abbreviated — expand fully in file):

```css
.ghs-page-header { display:flex; align-items:flex-start; justify-content:space-between; gap:16px; margin-bottom:20px; }
.ghs-page-header h1 { margin:0; font-size:1.5rem; font-weight:700; color:var(--ghs-text); letter-spacing:-0.02em; }
.ghs-page-header p { margin:6px 0 0; color:var(--ghs-text-muted); font-size:0.9rem; }
.ghs-card { background:var(--ghs-surface); border:1px solid var(--ghs-border); border-radius:var(--ghs-radius); padding:20px; }
.ghs-label { display:block; font-size:12px; font-weight:600; color:var(--ghs-text-muted); margin-bottom:6px; }
.ghs-input, .ghs-select, .ghs-textarea {
  width:100%; min-height:var(--ghs-control-h); box-sizing:border-box;
  border:1px solid var(--ghs-border); border-radius:8px; padding:0 12px;
  background:#fff; color:var(--ghs-text); font:inherit;
}
.ghs-textarea { min-height:96px; padding:10px 12px; resize:vertical; }
.ghs-btn { min-height:var(--ghs-control-h); padding:0 16px; border-radius:8px; border:1px solid var(--ghs-border); background:#fff; cursor:pointer; font-weight:600; font-size:0.875rem; display:inline-flex; align-items:center; justify-content:center; gap:8px; }
.ghs-btn-primary { background:var(--ghs-primary); border-color:var(--ghs-primary); color:#fff; }
.ghs-btn-primary:hover { background:var(--ghs-primary-hover); }
.ghs-btn-ghost { background:transparent; }
.ghs-btn-danger { background:#fff; border-color:#fecaca; color:var(--ghs-danger); }
.ghs-tabs { display:flex; gap:4px; flex-wrap:wrap; border-bottom:1px solid var(--ghs-border); margin-bottom:16px; }
.ghs-tab { min-height:40px; padding:0 14px; border:0; background:transparent; color:var(--ghs-text-muted); font-weight:600; cursor:pointer; border-bottom:2px solid transparent; }
.ghs-tab.active { color:var(--ghs-primary); border-bottom-color:var(--ghs-primary); }
.ghs-badge { display:inline-flex; align-items:center; min-height:24px; padding:0 8px; border-radius:999px; font-size:11px; font-weight:700; }
.ghs-table { width:100%; border-collapse:collapse; }
.ghs-table th, .ghs-table td { padding:12px 10px; border-bottom:1px solid var(--ghs-border); text-align:left; font-size:0.875rem; }
.ghs-sticky-actions {
  position:sticky; bottom:0; z-index:20; display:flex; justify-content:flex-end; gap:8px;
  padding:12px 16px; background:rgba(255,255,255,0.92); border-top:1px solid var(--ghs-border); backdrop-filter:blur(8px);
}
.ghs-empty { text-align:center; padding:40px 16px; color:var(--ghs-text-muted); }
```

- [ ] **Step 3:** Keep existing `.ghs-shell` / sidebar base; update colors to new tokens. Verify portal still loads (no layout break).

- [ ] **Step 4:** Commit

```bash
git add apps/portal/src/styles.css
git commit -m "style(portal): add CMS design tokens and primitives"
```

---

### Task 2: Shell — grouped nav + mobile drawer

**Files:**
- Modify: `libs/ui/portal/src/lib/layout/main-layout.tsx`
- Modify: `apps/portal/src/styles.css` (drawer styles)

**Interfaces:**
- Consumes: `NAV_ITEMS` paths unchanged
- Produces: Grouped sidebar; `drawerOpen` state; hamburger visible ≤992px

- [ ] **Step 1:** Restructure nav data:

```tsx
const NAV_GROUPS: Array<{ title: string; items: NavItem[] }> = [
  {
    title: 'Catalog',
    items: [
      { to: '/admin/products', label: 'Sản phẩm', icon: Package },
      { to: '/admin/categories', label: 'Danh mục', icon: Tags },
      { to: '/admin/artisans', label: 'Nghệ nhân', icon: Users },
      { to: '/admin/files', label: 'Thư viện tệp', icon: FolderOpen },
    ],
  },
  {
    title: 'Sales',
    items: [
      { to: '/admin/rfq', label: 'Yêu cầu báo giá', icon: ClipboardList },
      { to: '/admin/quotes', label: 'Báo giá', icon: ScrollText },
    ],
  },
  {
    title: 'Content',
    items: [
      { to: '/admin/showroom-v2-content', label: 'Nội dung website', icon: LayoutDashboard },
    ],
  },
  {
    title: 'System',
    items: [
      { to: '/admin/', label: 'Tổng quan', icon: LayoutDashboard },
      { to: '/admin/audit', label: 'Nhật ký hệ thống', icon: ScrollText },
      { to: '/admin/settings', label: 'Cài đặt', icon: Settings },
    ],
  },
];
```

- [ ] **Step 2:** Add `useState` drawer + header menu button; overlay closes drawer. CSS:

```css
.ghs-nav-group-title {
  margin: 14px 12px 6px; font-size:10px; letter-spacing:0.14em; text-transform:uppercase; color:var(--ghs-sidebar-text-muted);
}
.ghs-menu-btn { display:none; min-height:44px; min-width:44px; border:1px solid var(--ghs-border); border-radius:8px; background:#fff; }
@media (max-width:992px) {
  .ghs-menu-btn { display:inline-flex; align-items:center; justify-content:center; }
  .ghs-sidebar {
    position:fixed; inset:0 auto 0 0; width:min(288px,88vw); z-index:40;
    transform:translateX(-105%); transition:transform .25s ease; display:flex;
  }
  .ghs-sidebar.open { transform:none; }
  .ghs-sidebar-backdrop {
    position:fixed; inset:0; background:rgba(0,0,0,.45); z-index:30;
  }
}
```

- [ ] **Step 3:** Manual — desktop groups visible; 375px hamburger opens drawer; nav links still work.

- [ ] **Step 4:** Commit

```bash
git add libs/ui/portal/src/lib/layout/main-layout.tsx apps/portal/src/styles.css
git commit -m "feat(portal): group admin nav and add mobile drawer"
```

---

### Task 3: Product form — tabs, preview, sticky actions, 3D gate

**Files:**
- Modify: `libs/ui/portal/src/lib/pages/product-form.tsx`
- Modify: `apps/portal/src/styles.css` (form layout helpers if needed)

**Interfaces:**
- Consumes: existing `ProductFormData`, `handleSubmit`, `UploadField`, `updateField`
- Produces: `activeTab` state; sticky preview bound to `form`; hotspot/viewSections UI only when `form.modelUrl` is non-empty

- [ ] **Step 1:** Add tab state near other hooks:

```tsx
type ProductFormTab = 'basic' | 'ceramic' | 'media' | 'spatial' | 'advanced';
const [activeTab, setActiveTab] = useState<ProductFormTab>('basic');
const hasModel = Boolean(form.modelUrl?.trim());
```

Tab labels (VI): `Cơ bản` | `Chi tiết gốm` | `Media` | `3D / 360` | `Nâng cao`

- [ ] **Step 2:** Replace page chrome with:

```tsx
<div className="ghs-page-header">
  <div>
    <h1>{isEdit ? 'Chỉnh sửa sản phẩm' : 'Tạo sản phẩm mới'}</h1>
    <p>Ảnh và thông tin gốm trước — model 3D / 360 bổ sung khi sẵn sàng.</p>
  </div>
  <button type="button" className="ghs-btn ghs-btn-ghost" onClick={() => navigate('/admin/products')}>Quay lại</button>
</div>
```

- [ ] **Step 3:** Wrap form body in layout:

```tsx
<form onSubmit={handleSubmit} className="ghs-product-form">
  <div className="ghs-product-form-grid">
    <div className="ghs-product-form-main">
      <div className="ghs-tabs" role="tablist">...</div>
      {/* render only active tab panel; keep all field bindings */}
    </div>
    <aside className="ghs-product-preview ghs-card">
      {/* cover = form.poster || form.images[0]; name; priceLabel/referencePrice; status badge; image count; 3D badge if hasModel */}
    </aside>
  </div>
  <div className="ghs-sticky-actions">
    <button type="button" className="ghs-btn ghs-btn-ghost" onClick={() => navigate('/admin/products')}>Hủy</button>
    <button type="submit" className="ghs-btn ghs-btn-primary" disabled={saving}>{saving ? 'Đang lưu…' : 'Lưu sản phẩm'}</button>
  </div>
</form>
```

CSS:

```css
.ghs-product-form-grid { display:grid; grid-template-columns:minmax(0,1fr) 300px; gap:20px; align-items:start; }
.ghs-product-preview { position:sticky; top:12px; }
@media (max-width:992px) {
  .ghs-product-form-grid { grid-template-columns:1fr; }
  .ghs-product-preview { position:relative; top:auto; order:-1; }
}
```

- [ ] **Step 4:** Move existing sections into tabs without changing field `name`s / handlers:
  - `basic` ← Thông tin cơ bản
  - `ceramic` ← Chi tiết gốm sứ
  - `media` ← images + poster only
  - `spatial` ← modelUrl + video360Url + empty hint when no model
  - `advanced` ← story, specs, seo, variants, provenance; **viewSections/hotspots block wrapped in `{hasModel && (...)}`**

- [ ] **Step 5:** On submit validation failure for images, `setActiveTab('media')` before `setSaving(false)`.

- [ ] **Step 6:** Manual verify:
  - Create product with images only
  - Upload glb → Nâng cao shows hotspot/sections
  - 1440 two-column; 375 stacked; sticky save works

- [ ] **Step 7:** Commit

```bash
git add libs/ui/portal/src/lib/pages/product-form.tsx apps/portal/src/styles.css
git commit -m "feat(portal): rebuild product form with tabs and 3D gate"
```

---

### Task 4: Product list polish

**Files:**
- Modify: `libs/ui/portal/src/lib/pages/product-list.tsx`

**Interfaces:**
- Consumes: existing `api.catalog.list` / delete / STATUS_MAP
- Produces: `ghs-page-header`, toolbar, `ghs-table`, badge classes

- [ ] **Step 1:** Replace top header with `ghs-page-header` + primary “Thêm sản phẩm” → `/admin/products/new`.

- [ ] **Step 2:** Toolbar card: search input (`ghs-input`) + status filter buttons (All + keys of `STATUS_MAP`). Filter client-side with existing search filter ANDed with status.

- [ ] **Step 3:** Table uses `ghs-table`; status pill uses `ghs-badge` with STATUS_MAP colors via style or data attributes. Keep preview lightbox + delete confirm.

- [ ] **Step 4:** Manual — search/filter/delete/open edit still work.

- [ ] **Step 5:** Commit

```bash
git add libs/ui/portal/src/lib/pages/product-list.tsx
git commit -m "feat(portal): polish product list for new CMS chrome"
```

---

### Task 5: Login + dashboard + remaining pages visual pass

**Files:**
- Modify: `libs/ui/portal/src/lib/pages/login.tsx`
- Modify: `libs/ui/portal/src/lib/pages/dashboard.tsx`
- Modify: `libs/ui/portal/src/lib/pages/category-list.tsx`, `category-form.tsx`, `artisan-list.tsx`, `artisan-form.tsx`, `file-library.tsx`, `rfq-inbox.tsx`, `quote-list.tsx`, `quote-form.tsx`, `quote-detail.tsx`, `audit-log.tsx`, `site-config.tsx`, `showroom-v2-content.tsx` (chrome only)

**Interfaces:**
- Produces: consistent headers/cards; no logic changes

- [ ] **Step 1:** Login — light card on `#F6F7F9`, gold brand wordmark, `ghs-input` / `ghs-btn-primary` min-height 44px. Keep auth logic identical.

- [ ] **Step 2:** Dashboard — wrap KPI/sections in `ghs-card` + `ghs-page-header`.

- [ ] **Step 3:** For each remaining page: swap page title row → `ghs-page-header`; outer panels → `ghs-card`; primary buttons → `ghs-btn-primary`. Do not rewrite showroom-v2 nested field editors beyond outer chrome.

- [ ] **Step 4:** Smoke:
  - Login → dashboard
  - Products list → new → save
  - Categories / artisans open
  - 375px drawer + no horizontal scroll on form

- [ ] **Step 5:** Commit

```bash
git add libs/ui/portal/src/lib/pages
git commit -m "style(portal): align remaining admin pages to CMS tokens"
```

---

### Task 6: Final verification checklist

- [ ] **Step 1:** Run portal + API locally (`nx serve portal` :4311, API :4310).
- [ ] **Step 2:** Checklist from spec:
  1. Login works  
  2. Create photo-only product  
  3. Edit tabs + preview update  
  4. Upload `.glb` unlocks advanced spatial editors  
  5. Desktop 1440 / mobile 375 layouts  
  6. List search/delete OK  
- [ ] **Step 3:** Fix any P0 polish gaps found in smoke.
- [ ] **Step 4:** Commit any fixes; push only if user asks to ship.

---

## Spec coverage (self-review)

| Spec section | Task |
|---|---|
| Visual tokens / primitives | Task 1 |
| Shell groups + mobile drawer | Task 2 |
| Product form tabs / preview / sticky / 3D gate | Task 3 |
| Product list | Task 4 |
| Login / dashboard / other pages | Task 5 |
| Verification | Task 6 |
| Non-goals (no API/viewer) | Honored in Task 3 notes |

No TBD placeholders in task steps.
