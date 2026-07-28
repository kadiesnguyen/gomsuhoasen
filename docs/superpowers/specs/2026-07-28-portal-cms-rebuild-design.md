# Gốm Hoa Sen — Portal CMS rebuild (design)

Date: 2026-07-28  
Status: approved in conversation; awaiting final spec review before implementation plan

## Goal

Rebuild the admin portal (`apps/portal` + `libs/ui/portal`) so it looks and works like a professional CMS:

1. Shared design tokens and UI primitives (no cream-sloppy inline styles).
2. Shell navigation grouped and usable on desktop + mobile drawer.
3. Product create/edit form restructured for **photo-first ceramic products today**, with a clear **3D / 360** path for later.
4. List/login/dashboard and other admin pages adopt the same visual system.

Local entry: `http://127.0.0.1:4311/admin/login` (portal default port 4311).

## Decisions locked

| Topic | Choice |
|---|---|
| Approach | Full portal visual + product-form rebuild (option 3) |
| Theme | Light content canvas + charcoal sidebar + gold accent |
| Product form layout | Tabs + sticky media preview (desktop 2-column) |
| 3D | Upload fields ready now; advanced 3D viewer controls stay collapsed / gated |
| API / schema | No catalog API or Mongo schema changes in this work |
| Showroom public site | Out of scope |

## Non-goals

- In-admin interactive 3D model viewer / hotspot editor UI
- New product fields beyond what API already supports
- Showroom redesign
- Rewriting RFQ/quote business logic (visual pass only)
- Dark-mode content canvas (sidebar stays dark; content stays light)

## Visual system

### Tokens (`apps/portal/src/styles.css`)

| Token | Value | Use |
|---|---|---|
| `--ghs-bg` | `#F6F7F9` | Page canvas |
| `--ghs-surface` | `#FFFFFF` | Cards |
| `--ghs-border` | `#E6E8EC` | Dividers / inputs |
| `--ghs-text` | `#111827` | Primary text |
| `--ghs-text-muted` | `#6B7280` | Secondary |
| `--ghs-primary` | `#B8923A` | Brand gold CTA / active |
| `--ghs-primary-hover` | `#9A7520` | Hover |
| `--ghs-sidebar-bg` | `#111318` | Sidebar |
| `--ghs-sidebar-text` | `#D1D5DB` | Nav labels |
| `--ghs-danger` | `#DC2626` | Destructive |
| `--ghs-radius` | `10px` | Cards / controls |
| Spacing | 4 / 8 / 12 / 16 / 20 / 24 / 32 | Layout rhythm |
| Control height | 44–48px | Buttons / inputs |

Typography: system / Inter for UI. Page titles slightly larger, weight 650–700. No decorative serif in admin (keep showroom brand identity out of CMS chrome).

### Primitives (CSS classes first; extract React wrappers only if reused ≥3 times)

- `ghs-page-header` — title, subtitle, actions
- `ghs-card` — padded surface + border
- `ghs-field` / `ghs-label` / `ghs-input` / `ghs-select` / `ghs-textarea`
- `ghs-btn` / `ghs-btn-primary` / `ghs-btn-ghost` / `ghs-btn-danger`
- `ghs-table` + status `ghs-badge`
- `ghs-tabs` / `ghs-tab`
- `ghs-sticky-actions` — bottom bar for forms
- `ghs-empty` — empty states

Inline `style={{...}}` on product/list pages is migrated to these classes as pages are touched.

## Shell

### Files

- `libs/ui/portal/src/lib/layout/main-layout.tsx`
- `apps/portal/src/styles.css`

### Nav groups

1. **Catalog** — Sản phẩm, Danh mục, Nghệ nhân, Thư viện tệp  
2. **Sales** — Yêu cầu báo giá, Báo giá  
3. **Content** — Nội dung website  
4. **System** — Tổng quan, Nhật ký hệ thống, Cài đặt  

Routes stay under `/admin/...` (no route renames).

### Header

- Left: page context / short breadcrumb (e.g. `Sản phẩm / Tạo mới`)
- Right: role badge + optional page CTA slot (via layout context or page-owned header actions)

### Mobile (≤992px)

- Sidebar becomes a drawer; hamburger in header opens/closes it
- Current “sidebar display:none with no alternative” is a bug to fix

## Product form

### Files

- Primary: `libs/ui/portal/src/lib/pages/product-form.tsx` (~960 lines today — restructure JSX; keep submit/payload logic)
- Shared upload: existing `UploadField`, media preview components
- Styles: portal `styles.css` (+ optional `product-form.module.css` if CSS modules preferred; default = global `ghs-*` for consistency with shell)

### Layout

Desktop (≥992px):

```
┌──────────────────────────────────────────────────────────┐
│ PageHeader: Tạo / Chỉnh sửa · Quay lại                   │
├─────────────────────────────┬────────────────────────────┤
│ Tabs + active panel         │ Sticky preview card        │
│                             │  - cover image             │
│                             │  - name / price / status   │
│                             │  - media count / 3D badge  │
├─────────────────────────────┴────────────────────────────┤
│ StickyActionBar: Hủy · Lưu                               │
└──────────────────────────────────────────────────────────┘
```

Mobile: single column; preview collapses under header or first tab.

### Tabs (order)

| Tab | Fields | Notes |
|---|---|---|
| Cơ bản | name*, slug, sku, status, collectionId, artisanId, description | Slug auto from name on create |
| Chi tiết gốm | glaze, type, size, referencePrice, priceLabel, weight, tags | Matches showroom listing metadata |
| Media | images* (multi), poster | Require ≥1 image on submit (existing rule) |
| 3D / 360 | modelUrl (.glb/.gltf), video360Url | Always visible; helper copy that this powers future stage viewer |
| Nâng cao | story, seo, variants, provenance (edit only) | `viewSections` / hotspots only if `modelUrl` is set |

### 3D readiness (no viewer yet)

- Keep upload accept/size limits already in form
- When `modelUrl` empty: show short empty state (“Chưa có model — có thể bổ sung sau”)
- When `modelUrl` set: show filename + clear action + unlock Nâng cao hotspot/viewSections editors
- Do **not** build model-viewer / orbit UI in this milestone

### Validation / UX

- Preserve existing API payload shape in `handleSubmit`
- Surface load/save errors with existing toast + alert patterns
- Sticky bar disables while `saving`
- Unsaved navigation: best-effort `beforeunload` only if already present; no new router blocker required

## Product list + other pages

### Product list

- PageHeader with “Thêm sản phẩm”
- Toolbar: search + status filter chips (client filter OK)
- Table: thumb, name, collection, price label, status badge, actions
- Empty / error states use `ghs-empty` / existing `LoadErrorState` styled to tokens

### Soft visual pass (same tokens, no logic rewrite)

- Login
- Dashboard
- Category list/form
- Artisan list/form
- Files, RFQ, quotes, audit, settings, showroom-v2-content shell chrome

Depth: replace page-level inline colors/spacing with `ghs-*` cards/headers. Deep editors inside showroom-v2-content can stay functional with light wrapper polish.

## Architecture notes

```
apps/portal
  src/styles.css          ← tokens + primitives
  src/main.tsx            ← routes unchanged

libs/ui/portal
  layout/main-layout.tsx  ← grouped nav + drawer
  pages/product-form.tsx  ← tabbed form + preview
  pages/product-list.tsx  ← table polish
  pages/*                 ← header/card token pass
```

No new packages. Prefer CSS over new UI libraries.

## Error handling

- Keep `mergeApiErrorMessage` + toast/confirm dialogs
- Category/artisan load failures remain inline retry links inside Cơ bản tab
- Image validation message stays Vietnamese, shown near Media tab + sticky bar

## Testing / verification

1. Login at `:4311/admin/login` with seed admin  
2. Create product with images only → appears on list + showroom  
3. Edit product: switch tabs, sticky preview updates  
4. Upload `.glb` on 3D tab → saved; Nâng cao hotspot section appears  
5. Desktop 1440: 2-column form; Mobile 375: stacked, drawer nav, no horizontal page scroll  
6. Existing list delete / search still works  

## Implementation phases (for plan)

1. Tokens + primitives + shell (nav groups, drawer)  
2. Product form restructure (tabs, preview, sticky actions, 3D gate)  
3. Product list polish  
4. Remaining pages visual pass  
5. Smoke checklist above  

## Risks

| Risk | Mitigation |
|---|---|
| `product-form.tsx` stays huge | Restructure by tab components in same file or small colocated files; do not rewrite API mapping blindly |
| CSS modules vs global clash | Prefer global `ghs-*` for shell/forms consistency |
| Scope creep into 3D editor | Explicitly gated in Non-goals |

## Out of scope follow-ups (later)

- Admin model-viewer + hotspot placement UI  
- Bulk product import  
- Role-based nav permissions UI  
