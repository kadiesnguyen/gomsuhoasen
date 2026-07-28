export const E2E_ADMIN_FIXTURE = {
  email: 'e2e-admin@gomhoasen.vn',
  password: 'E2EAdmin123!',
  fullName: 'E2E Admin',
} as const;

export const E2E_COLLECTION_FIXTURE = {
  name: 'E2E Collection',
} as const;

export const E2E_PUBLIC_PRODUCT_FIXTURE = {
  name: 'E2E Product 1',
  slug: 'e2e-product-1',
} as const;

export const E2E_VIDEO360_PRODUCT_FIXTURE = {
  name: 'E2E Product 2',
  slug: 'e2e-product-2',
  fixturePath: '/assets/product/lotus-360-viewer.html',
} as const;

export const E2E_SEEDED_RFQ_FIXTURE = {
  customerName: 'E2E Customer',
  customerPhone: '0900000002',
  customerEmail: 'e2e@example.com',
  message: 'E2E smoke RFQ seed',
} as const;
