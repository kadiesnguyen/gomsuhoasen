import { createRequire } from 'node:module';
import { NestExpressApplication } from '@nestjs/platform-express';
import {
  ARTISAN_STATUSES,
  GHS_API,
  PRODUCT_STATUSES,
  RFQ_SOURCES,
  RFQ_STATUSES,
  USER_ROLES,
  type ProductStatus,
  type RfqSource,
} from '@gomhoasen/contracts';
import { createApiTestApp } from '../../helpers/app.factory';
import { bearer, loginAsE2eAdmin } from '../../helpers/auth.helper';
import { expectSuccessArray, expectSuccessObject } from '../../helpers/asserts.helper';
import { describeIfE2eMongo, resolveE2eMongoUri } from '../../helpers/db.helper';
import { resetAndSeedE2E } from '../../helpers/seed.helper';
import { E2E_ADMIN_FIXTURE } from '../../../src/seed/e2e-fixtures';

const require = createRequire(import.meta.url);
const request = require('supertest') as typeof import('supertest');

interface NamedEntityPayload {
  id: string;
  name: string;
  slug: string;
}

interface ProductPayload extends NamedEntityPayload {
  status: ProductStatus;
  referencePrice?: number;
}

interface RfqPayload {
  id: string;
  customerName: string;
  customerPhone: string;
  status: string;
  source: RfqSource;
}

interface QuotePayload {
  id: string;
  code: string;
  rfqId: string;
  subtotal: number;
  total: number;
  status: string;
}

describeIfE2eMongo('API Smoke - Auth -> RFQ -> Quote', () => {
  const mongoUri = resolveE2eMongoUri('smoke');
  let app: NestExpressApplication;
  let adminToken: string;
  let artisan: NamedEntityPayload;
  let product: ProductPayload;
  let rfq: RfqPayload;

  beforeAll(async () => {
    await resetAndSeedE2E(mongoUri);
    app = await createApiTestApp(mongoUri);
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  it('[E2E-API-001] admin login returns token', async () => {
    const login = await loginAsE2eAdmin(app);
    adminToken = login.accessToken;

    expect(login.user.email).toBe(E2E_ADMIN_FIXTURE.email);
    expect(login.user.role).toBe(USER_ROLES.ADMIN);
    expect(adminToken.length).toBeGreaterThan(20);
  });

  it('[E2E-API-002] admin create artisan + product', async () => {
    const artisanResponse = await request(app.getHttpServer())
      .post(GHS_API.ARTISAN.CREATE)
      .set('Authorization', bearer(adminToken))
      .send({
        name: 'Nghệ nhân Smoke',
        title: 'Nghệ nhân kiểm thử',
        status: ARTISAN_STATUSES.ACTIVE,
        yearsExperience: 12,
      });
    artisan = expectSuccessObject<NamedEntityPayload>(artisanResponse, 'E2E create artisan', 201);
    expect(artisan.slug).toBe('nghe-nhan-smoke');

    const productResponse = await request(app.getHttpServer())
      .post(GHS_API.CATALOG.PRODUCTS)
      .set('Authorization', bearer(adminToken))
      .send({
        name: 'Bình Smoke E2E',
        status: PRODUCT_STATUSES.ACTIVE,
        artisanId: artisan.id,
        referencePrice: 2500000,
        description: 'Sản phẩm smoke e2e',
        images: ['uploads/e2e/product-smoke.jpg'],
      });
    product = expectSuccessObject<ProductPayload>(productResponse, 'E2E create product', 201);
    expect(product.slug).toBe('binh-smoke-e2e');
    expect(product.status).toBe(PRODUCT_STATUSES.ACTIVE);
  });

  it('[E2E-API-003] public fetch product by slug', async () => {
    const response = await request(app.getHttpServer())
      .get(GHS_API.CATALOG.PUBLIC_PRODUCT_BY_SLUG(product.slug));

    const publicProduct = expectSuccessObject<ProductPayload>(response, 'E2E public product fetch');
    expect(publicProduct.id).toBe(product.id);
    expect(publicProduct.name).toBe(product.name);
  });

  it('[E2E-API-004] public submit RFQ', async () => {
    const response = await request(app.getHttpServer())
      .post(GHS_API.RFQ.PUBLIC_SUBMIT)
      .send({
        customerName: 'Khách Smoke',
        customerPhone: '0900000001',
        customerEmail: 'smoke.customer@example.com',
        message: 'Cần báo giá smoke e2e',
        source: RFQ_SOURCES.PRODUCT_DETAIL,
        lineItems: [
          {
            productId: product.id,
            productName: product.name,
            quantity: 2,
          },
        ],
      });

    rfq = expectSuccessObject<RfqPayload>(response, 'E2E public RFQ submit', 201);
    expect(rfq.customerName).toBe('Khách Smoke');
    expect(rfq.status).toBe(RFQ_STATUSES.NEW);
    expect(rfq.source).toBe(RFQ_SOURCES.PRODUCT_DETAIL);

    const listResponse = await request(app.getHttpServer())
      .get(GHS_API.RFQ.LIST)
      .set('Authorization', bearer(adminToken));
    const rfqs = expectSuccessArray<RfqPayload>(listResponse, 'E2E RFQ inbox');
    expect(rfqs.some((item) => item.id === rfq.id)).toBe(true);
  });

  it('[E2E-API-005] admin create quote from RFQ', async () => {
    const response = await request(app.getHttpServer())
      .post(GHS_API.QUOTE.CREATE)
      .set('Authorization', bearer(adminToken))
      .send({
        rfqId: rfq.id,
        discount: 100000,
        items: [
          {
            productId: product.id,
            productName: product.name,
            quantity: 2,
            unitPrice: 2500000,
          },
        ],
      });

    const quote = expectSuccessObject<QuotePayload>(response, 'E2E quote create', 201);
    expect(quote.code).toMatch(/^QUO-/);
    expect(quote.subtotal).toBe(5000000);
    expect(quote.total).toBe(4900000);

    const updatedRfqResponse = await request(app.getHttpServer())
      .get(GHS_API.RFQ.BY_ID(rfq.id))
      .set('Authorization', bearer(adminToken));
    const updatedRfq = expectSuccessObject<RfqPayload>(updatedRfqResponse, 'E2E RFQ quoted');
    expect(updatedRfq.status).toBe('QUOTED');
  });
});
