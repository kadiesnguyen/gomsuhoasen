# Admin News CMS Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dedicated admin Tin tức + Danh mục tin tức pages that read/write `newsLanding` in Showroom V2 content, with managed categories and the Showroom V2 news tab hidden.

**Architecture:** Extend `newsLanding.categories`; portal helper loads/saves full V2 content via existing `api.site.getV2Content` / `updateV2Content`; new list/form pages mirror product/category chrome; hide news tab in showroom-v2-content.

**Tech Stack:** React portal, Nest site module, existing contracts/DTO/mongoose Showroom V2 content, `slugifyVi`, UploadField, ghs-* CSS. No new npm deps.

**Spec:** `docs/superpowers/specs/2026-07-28-admin-news-cms-design.md`

## Global Constraints

- No separate news Mongo collection / REST module
- Public site keeps filtering by `newsCards[].category` display name
- Content body remains plain textarea (blank-line paragraphs)
- Control height 44–48px; ghs-* chrome; Vietnamese copy
- Hide Showroom V2 news tab entirely
- Local verify: `http://127.0.0.1:4311/admin/news`

## File map

| File | Responsibility |
|---|---|
| `libs/contracts/src/lib/site.ts` | Add `categories` to newsLanding type |
| `libs/contracts/src/lib/showroom-v2-default-content.ts` | Default categories from seed cards |
| `libs/modules/site/.../showroom-v2-content.schema.ts` | Mongoose categories array |
| `libs/modules/site/.../showroom-v2-content.dto.ts` | DTO + validation |
| `libs/modules/site/.../showroom-v2-content.service.ts` | normalize + migrate seed categories; bump version |
| `libs/ui/portal/.../services/news-content.ts` | Load/save helpers + types |
| `libs/ui/portal/.../pages/news-list.tsx` | List + page settings |
| `libs/ui/portal/.../pages/news-form.tsx` | Create/edit article |
| `libs/ui/portal/.../pages/news-category-list.tsx` | Category CRUD |
| `libs/ui/portal/.../layout/main-layout.tsx` | Nav items |
| `libs/ui/portal/.../portal-shell.tsx` | Routes |
| `libs/ui/portal/.../pages/showroom-v2-content.tsx` | Remove news tab UI |

---

### Task 1: Schema + defaults + normalize categories

**Files:**
- Modify: contracts site + default-content, site schema/dto/service

**Interfaces:**
- Produces: `newsLanding.categories: { id, name, slug }[]` on get/put

- [ ] **Step 1:** Add `categories` to contract + default content (seed unique names from default newsCards with stable ids `nc-su-kien`, etc.)
- [ ] **Step 2:** Add mongoose + DTO nested type; `IsOptional` array
- [ ] **Step 3:** In `normalizeContent`, ensure `categories` array; if empty, derive from unique `newsCards[].category` via slugifyVi
- [ ] **Step 4:** Bump `CURRENT_CONTENT_VERSION` to 5; migrate seeds categories when missing
- [ ] **Step 5:** Commit `feat(site): add managed news categories to showroom v2 content`

---

### Task 2: Portal news helper + category page + nav/routes

**Files:**
- Create: `news-content.ts`, `news-category-list.tsx`
- Modify: `main-layout.tsx`, `portal-shell.tsx`

- [ ] **Step 1:** Helper: `loadV2News()`, `saveV2NewsLanding(content, newsLanding)`
- [ ] **Step 2:** Category list page with create/edit/delete; block delete if articles use name; rename rewrites card categories
- [ ] **Step 3:** Wire nav + routes `/admin/news-categories`
- [ ] **Step 4:** Commit `feat(portal): add news category admin page`

---

### Task 3: News list + form + hide Showroom tab

**Files:**
- Create: `news-list.tsx`, `news-form.tsx`
- Modify: `portal-shell.tsx`, `showroom-v2-content.tsx`

- [ ] **Step 1:** News list + page settings card
- [ ] **Step 2:** News form create/edit with UploadField image, category select, featured toggle
- [ ] **Step 3:** Routes `/admin/news`, `/new`, `/:id`
- [ ] **Step 4:** Remove news tab button + news panel from showroom-v2-content (keep validation helpers if still used elsewhere or drop news-only validation that only ran on that tab — validation moves to news form)
- [ ] **Step 5:** `npx nx typecheck portal` (+ api/site if practical)
- [ ] **Step 6:** Commit `feat(portal): add news list/form and hide showroom news tab`

---

### Task 4: Smoke

- [ ] Login → Danh mục tin tức CRUD
- [ ] Đăng tin → list → public `/tin-tuc` shows category filter
- [ ] Showroom V2 has no Tin tức tab
- [ ] Fix P0 only; commit if needed

---

## Spec coverage

| Spec | Task |
|---|---|
| categories field | 1 |
| Category CRUD page | 2 |
| News list/form + settings | 3 |
| Hide Showroom tab | 3 |
| Smoke | 4 |
