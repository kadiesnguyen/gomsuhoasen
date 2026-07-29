# Checkout + Admin Orders — Design

**Date:** 2026-07-29  
**Approved:** A (Tỉnh/TP + Phường/Xã) + admin đơn hàng đổi trạng thái thủ công

## Showroom
Modal checkout on “Đặt mua”: name, phone, street address, province, ward, qty=1, product summary + total → `POST /api/public/orders`.

## Backend
`orders` collection + statuses: NEW → CONFIRMED → SHIPPING → COMPLETED | CANCELLED. Public create; admin list/get/patch status.

## Portal
Orders list + detail with manual status transition.

## Geo
Static Datatinhthanh JSON in showroom `public/geo/` (2-level).
