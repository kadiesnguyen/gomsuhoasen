# Plan: Product QR

1. Add `qrcode` (+ `@types/qrcode`) dependency
2. `libs/ui/rich-html` or small `libs/ui/product-qr` helpers: `productPublicUrl(slug)`, `generateProductQrDataUrl(slug)`, download/copy helpers — prefer put under `libs/ui/showroom` + shared util in contracts or a tiny module both apps can import. Use `@gomhoasen/ui-rich-html` pattern → `libs/ui/product-qr` with alias `@gomhoasen/ui-product-qr`.
3. Showroom: pass `productSlug` into `ProductDetailViewer`; QR icon + popover CSS
4. Portal: QR panel on product-form when slug present
5. Run `dev:api`, `dev:showroom_v2`, `dev:portal` for local smoke
