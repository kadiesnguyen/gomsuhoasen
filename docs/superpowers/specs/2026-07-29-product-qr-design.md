# Product QR (client-side) — Design

**Date:** 2026-07-29  
**Approach:** A — generate QR in browser from public product URL. No DB/API.

## Behavior

- Canonical URL: `{window.location.origin}/san-pham/{slug}`
- QR image: client `qrcode` → PNG data URL
- Actions: Download PNG · Copy link

## Surfaces

1. **Showroom** `ProductDetailViewer`: QR icon by title block → popover (preview + 2 buttons)
2. **Portal** product form: panel when `slug` non-empty (create/edit)

## Out of scope

Mongo fields, stored QR files, listing-grid QR.
