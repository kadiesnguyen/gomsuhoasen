# Category Gallery + Stage Viewer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor `ListingScreen` and `ProductDetailViewer` to match Hinhanhdemo category + stage-viewer layouts while keeping the home Header and real catalog API.

**Architecture:** Keep routes `/danh-muc` and `/san-pham/:slug`. Rebuild UI inside `@gomhoasen/ui-showroom`. `App.tsx` always shows site Header on those routes; hide Footer. Category cards navigate to product detail (no demo drawer-as-destination). Stage viewer is image pedestal + drag/zoom/drawer per demo.

**Tech Stack:** React, CSS Modules, showroom_v2 client router, existing `getListingSiteData` / `getProduct`.

## Global Constraints

- Home Header always visible on `/danh-muc` and `/san-pham/:slug`
- Real API data only (no hardcoded demo product list as primary source)
- No iframe of HTML demos
- No page-level horizontal scroll; mobile 100dvh + safe-area
- Product card click → `/san-pham/:slug`
- Category click → `/danh-muc?collection=<collectionId>`

---

### Task 1: Site chrome — show Header, hide Footer on immersive catalog routes

**Files:**
- Modify: `apps/showroom_v2/src/app/App.tsx` (usesStandaloneLayout / Header / Footer)
- Modify: `apps/showroom_v2/src/app/data/adapter.ts` (`mapCatalogCategoriesToStrip` href)

**Interfaces:**
- Consumes: `path` route string
- Produces: Header rendered; Footer omitted when `path === '/danh-muc' || path.startsWith('/san-pham/')`; category href uses collection id

- [ ] **Step 1:** Change chrome logic so Header always renders; only Footer is suppressed on immersive routes:

```tsx
const hideSiteFooter = path === "/danh-muc" || path.startsWith("/san-pham/");
// ...
{<Header />}
// main unchanged
{!hideSiteFooter && <Footer />}
```

Remove `usesStandaloneLayout` that currently hides Header for `/danh-muc` and `/san-pham/*`. Keep Header on `/san-pham` landing too (already true if we always show Header).

- [ ] **Step 2:** Fix category strip href to pass collection id (matches listing filter keys):

```ts
href: `/danh-muc?collection=${encodeURIComponent(
  category.slug || category.id || category._id || category.name,
)}`,
```

(In `mapCatalogCategoriesToStrip`, use the same `id` already computed for the strip item.)

- [ ] **Step 3:** Manual check — open `/danh-muc` and `/san-pham/<slug>`: site logo/menu visible; no site Footer.

---

### Task 2: Rebuild ListingScreen gallery UI

**Files:**
- Modify: `libs/ui/showroom/src/lib/listing-screen.tsx`
- Modify: `libs/ui/showroom/src/lib/listing-screen.module.css`
- Reference: `Hinhanhdemo/gom-hoa-sen-category-responsive/*`

**Interfaces:**
- Consumes: `ListingScreenProps.siteData` (unchanged)
- Produces: gallery filter chips + horizontal snap cards; card navigates via `Link` to `/san-pham/${product.id}`

- [ ] **Step 1:** Replace page chrome: remove internal `nav`, mobile menu overlay, listing footer, floating/quick-view-as-primary. Keep filter state + URL sync (`collection` query).

- [ ] **Step 2:** Accept collection query by id **or** name (case-insensitive) so older links still work:

```ts
// when reading collection query values, also resolve names → ids via collections.find
```

- [ ] **Step 3:** Render structure:
  - root fills `calc(100dvh - var(--site-header-offset, 72px))`
  - intro column (eyebrow, title from copy, visible count)
  - filter chips: `Tất cả` + collections (and types if useful)
  - horizontal `#gallery` snap cards
  - prev/next + progress bar
  - empty state + reset when filtered length 0

- [ ] **Step 4:** Port demo CSS into CSS module (camelCase classes), including `@media` for 980/760/470/380 and short-height. Set `--site-header-offset` to clear home header. Do not use `position:fixed; inset:0` covering the site header.

- [ ] **Step 5:** Card click / keyboard → navigate to detail (`Link` wrapping card or `href` on card). Do not open quick-view drawer as the primary path.

- [ ] **Step 6:** Verify `/danh-muc?collection=...` preselects chip and filters; mobile 375 has no horizontal page scroll.

---

### Task 3: Rebuild ProductDetailViewer as stage viewer

**Files:**
- Modify: `libs/ui/showroom/src/lib/product-detail-viewer.tsx`
- Modify: `libs/ui/showroom/src/lib/product-detail-viewer.module.css`
- Reference: `Hinhanhdemo/gom-hoa-sen-stage-viewer-responsive/*`
- Keep props interface `ProductDetailViewerProps` stable for `ProductDetailPage`

**Interfaces:**
- Consumes: `productName`, `posterUrl`, `images`, `viewSections`, `specs`, `story`, `cta`, `copy`
- Produces: stage interaction (rotate/zoom/reset), drawer panels, CTA row

- [ ] **Step 1:** Replace immersive model-viewer-first layout with stage layout:
  - pedestal + product `<img>` (poster or images[0])
  - CSS vars `--ry --rx --zoom` driven by pointer drag / wheel / pinch
  - controls: zoomIn/Out, autoRotate, reset, fullscreen
  - view-mode buttons when ≥2 images (map first three to hero/space/macro)

- [ ] **Step 2:** Hotspots: if `viewSections[].hotspots` exist, render up to 3 buttons; open drawer with hotspot label/description/image. Always provide overview open control.

- [ ] **Step 3:** Drawer content overview: lead/description, specs dl, story blocks, CTA (primary link from `cta`, phone icon if available). Mobile: bottom sheet + sticky CTA + safe-area.

- [ ] **Step 4:** Port stage-viewer CSS into module; offset below site header; 100dvh content; no own brand header competing with site Header.

- [ ] **Step 5:** Verify drag/zoom/reset; product from listing opens correct slug; drawer CTA visible on 375px.

---

### Task 4: Smoke verification

**Files:** none (manual / local preview)

- [ ] **Step 1:** From `/san-pham`, click category → `/danh-muc?collection=...` with gallery UI + Header
- [ ] **Step 2:** Click product → `/san-pham/:slug` stage UI + Header
- [ ] **Step 3:** Desktop 1440 / mobile 375: no page horizontal scroll; Header usable

---

## Self-review vs spec

| Spec requirement | Task |
|---|---|
| Category → `/danh-muc` + gallery | Task 2 |
| Product → stage viewer | Task 3 |
| Keep home Header | Task 1 |
| Real API | Tasks 2–3 (existing data hooks) |
| Approach 3 shared lib | Tasks 2–3 |
| Hide footer on immersive | Task 1 |
| Mobile README constraints | Tasks 2–3 CSS |
