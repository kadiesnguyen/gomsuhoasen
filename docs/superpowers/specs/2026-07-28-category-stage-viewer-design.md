# Gốm Hoa Sen — Category gallery + Stage viewer (design)

Date: 2026-07-28  
Status: approved in conversation; awaiting final spec review before implementation plan

## Goal

Refactor showroom catalog UX so:

1. Clicking a product category lands on `/danh-muc` with the category-responsive gallery layout (from `Hinhanhdemo/gom-hoa-sen-category-responsive`).
2. Clicking a product opens `/san-pham/:slug` with the stage-viewer layout (from `Hinhanhdemo/gom-hoa-sen-stage-viewer-responsive`).
3. The **home site Header** stays available on both pages for navigation.
4. Data comes from the **real catalog API** (not hardcoded demo payloads).

## Decisions locked

| Topic | Choice |
|---|---|
| Category click target | `/danh-muc` (option A), with collection filter when available |
| UI depth | Category UI from HTML demo; product page is full stage-viewer demo UX |
| Data | Real API catalog |
| Implementation approach | Refactor shared `@gomhoasen/ui-showroom` (`ListingScreen`, `ProductDetailViewer`) — approach 3 |

## Non-goals

- No iframe / static HTML embedding of demo files
- No new routes or catalog API contract changes
- No redesign of home Header itself
- No hard-coded demo product list as primary data source

## Architecture

### Existing routes (unchanged)

- `/san-pham` → `ProductsPage` (category strip landing)
- Category card → `/danh-muc?collection=...` (already mapped in showroom adapter)
- `/danh-muc` → `CatalogListingPage` → `ListingScreen`
- Product card → `/san-pham/:slug` → `ProductDetailPage` → `ProductDetailViewer`

### Primary change surfaces

1. `source/libs/ui/showroom/src/lib/listing-screen.tsx` + `listing-screen.module.css`  
   Rebuild layout/interaction to match category-responsive demo.
2. `source/libs/ui/showroom/src/lib/product-detail-viewer.tsx` + `product-detail-viewer.module.css`  
   Rebuild layout/interaction to match stage-viewer-responsive demo.
3. `source/apps/showroom_v2/src/app/App.tsx`  
   Stop hiding the home Header on `/danh-muc` and `/san-pham/:slug`. Hide Footer on those immersive pages so 100dvh layouts are not broken. Keep `MobileBottomNav` unless it collides with fixed CTA; if collision, offset content/CTA for bottom-nav height.

### Chrome rules

- Always render home `Header` on category + product detail.
- Do **not** render the demo’s own mini-header brand/actions as the primary nav.
- Content area offsets below home header height.
- Footer hidden on `/danh-muc` and `/san-pham/:slug`.

## Components & interactions

### ListingScreen (category gallery)

- Desktop: intro column + horizontal snap gallery.
- Filters: chip row from API collections/types; sync with `?collection=` both ways.
- Cards: image, index, type, name; **click navigates to `/san-pham/:slug`** (not the demo drawer-as-destination).
- Prev/next controls + scroll progress indicator.
- Mobile (README parity): compact intro, horizontally scrollable filters, near-full-width snap cards, 100dvh + safe-area, no page-level horizontal scroll.

### ProductDetailViewer (stage viewer)

- Stage with product image on pedestal lighting treatment.
- Pointer drag to rotate; wheel / pinch zoom; double-tap or reset control to restore.
- View modes `hero` / `space` / `macro` mapped from `images` and/or `viewSections`; hide unavailable modes.
- Hotspots (when product has them) open info drawer panels; always expose overview panel from specs/story/CTA.
- Drawer: meta, story, CTA (Zalo/hotline/RFQ using existing copy/cta props).
- Mobile: full-screen bottom drawer, sticky CTA + `safe-area-inset-bottom`, 100dvh experience, no page-level horizontal scroll.

## Data flow

- Listing continues to use `getListingSiteData()`.
- Filtering remains client-side; URL query is source of truth for selected collection.
- Detail continues to use `getProduct(slug)` and map into existing `ProductDetailViewer` props (`images`, `viewSections`/`hotspots`, `specs`, `story`, `cta`, copy).
- Missing optional fields hide secondary UI; stage still works with poster/first image.

## Error & empty states

- Listing loading/error: keep existing status blocks; home Header remains visible.
- Detail 404/error: keep existing messaging + link back to `/danh-muc`.
- Empty filter result: empty state + reset filters action.
- No hotspots / single image: stage still interactive with available media.

## Verification checklist

- Desktop 1440, tablet, mobile 375: `/danh-muc`, `/danh-muc?collection=...`, `/san-pham/:slug`
- Home Header usable (logo, menu, primary nav)
- No whole-page horizontal scroll
- Drawer CTA not covering content on iPhone safe-area
- Drag / zoom / reset work on stage
- Product card click lands on correct slug

## Reference demos

- `Hinhanhdemo/gom-hoa-sen-category-responsive/gom-hoa-sen-category-responsive.html`
- `Hinhanhdemo/gom-hoa-sen-category-responsive/README-gom-hoa-sen-category-responsive.txt`
- `Hinhanhdemo/gom-hoa-sen-stage-viewer-responsive/gom-hoa-sen-stage-viewer-responsive.html`
- `Hinhanhdemo/gom-hoa-sen-stage-viewer-responsive/README-gom-hoa-sen-stage-responsive.txt`
