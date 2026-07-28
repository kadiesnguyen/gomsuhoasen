# Admin News CMS — Design

Date: 2026-07-28  
Status: Approved (approach A; user: menu riêng + danh mục quản lý được + ẩn tab Tin tức Showroom V2)

## Goal

Cho admin đăng/sửa tin tức và quản lý danh mục tin tức qua menu riêng, không phải vào editor Showroom V2. Vẫn lưu trong `newsLanding` của Showroom V2 content.

## Non-goals

- Module Mongo/API tin tức độc lập
- Rich-text editor (giữ textarea, đoạn cách bằng dòng trống — như hiện tại)
- Đổi public showroom filter logic (vẫn filter theo `newsCards[].category` string)

## Information architecture

Sidebar **Content**:
- Tin tức → `/admin/news`
- Danh mục tin tức → `/admin/news-categories`

Ẩn tab **Tin tức** trong `/admin/showroom-v2-content`.

## Screens

### `/admin/news`
- List: search, filter theo danh mục, thumbnail, title, category, date, Sửa/Xóa
- CTA “+ Đăng tin”
- Card **Cài đặt trang Tin tức**: hero labels, allCategoryLabel, featuredId, empty/read/back/related/notFound labels (thay tab cũ)

### `/admin/news/new`, `/admin/news/:id`
Fields: title, slug (auto từ title khi tạo mới), category (select từ danh mục), date, excerpt, image (UploadField), author, readingTime, content (textarea), featured toggle (`featuredId === id`)

Validation: title, slug (lowercase slug), category thuộc danh mục, image, content non-empty; slug unique trong newsCards.

### `/admin/news-categories`
CRUD name + slug. Không xóa nếu còn bài dùng `category === name` (bắt đổi/xóa bài trước). Rename cập nhật `newsCards[].category` cũ → tên mới.

## Data model

Extend `newsLanding`:

```ts
categories?: { id: string; name: string; slug: string }[];
// newsCards unchanged — category stores display name
```

Touches: `ShowroomV2ContentContract`, mongoose schema, DTO, defaults, `normalizeContent` (ensure array; seed from unique card categories when empty), contentVersion bump + migrate seed.

## Persistence

Portal pages: `api.site.getV2Content()` → mutate `newsLanding` → `api.site.updateV2Content(fullDocument)`.

Shared helper: `libs/ui/portal/src/lib/services/news-content.ts`.

## UI

Reuse `ghs-*` chrome (page-header, card, table, input, btn). Vietnamese copy.

## Success criteria

1. Sidebar có Tin tức + Danh mục tin tức  
2. Đăng bài photo + chọn danh mục → hiện trên `/tin-tuc`  
3. CRUD danh mục; không xóa khi còn bài  
4. Tab Tin tức Showroom V2 ẩn  
5. Portal typecheck pass  
