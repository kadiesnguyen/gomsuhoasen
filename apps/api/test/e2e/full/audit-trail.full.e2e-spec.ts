import { createRequire } from 'node:module';
import { NestExpressApplication } from '@nestjs/platform-express';
import {
  ARTISAN_STATUSES,
  GHS_API,
  GHS_AUDIT_ACTIONS,
  GHS_AUDIT_ENTITIES,
  PRODUCT_STATUSES,
  RFQ_SOURCES,
  type GhsAuditAction,
  type GhsAuditEntity,
} from '@gomhoasen/contracts';
import { createApiTestApp } from '../../helpers/app.factory';
import { bearer, loginAsE2eAdmin } from '../../helpers/auth.helper';
import { expectSuccessObject, expectSuccessPaginated } from '../../helpers/asserts.helper';
import { describeIfE2eMongo, resolveE2eMongoUri } from '../../helpers/db.helper';
import { resetAndSeedE2E } from '../../helpers/seed.helper';

const require = createRequire(import.meta.url);
const request = require('supertest') as typeof import('supertest');

interface EntityPayload {
  id: string;
  name: string;
  slug: string;
}

interface RfqPayload {
  id: string;
  status: string;
}

interface QuotePayload {
  id: string;
  status: string;
}

interface AuditLogPayload {
  id: string;
  action: GhsAuditAction;
  entity?: GhsAuditEntity;
  entityId?: string;
  userId?: string;
}

async function pollAuditAction(
  app: NestExpressApplication,
  token: string,
  action: GhsAuditAction,
): Promise<AuditLogPayload[]> {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const response = await request(app.getHttpServer())
      .get(GHS_API.DASHBOARD.AUDIT_LOGS)
      .query({ action, limit: '20' })
      .set('Authorization', bearer(token));
    const page = expectSuccessPaginated<AuditLogPayload>(response, `E2E audit ${action}`);
    if (page.items.length > 0) return page.items;
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  return [];
}

describeIfE2eMongo('API Full - Audit trail', () => {
  const mongoUri = resolveE2eMongoUri('audit');
  let app: NestExpressApplication;
  let adminToken: string;
  let product: EntityPayload;
  let rfq: RfqPayload;
  let quote: QuotePayload;

  beforeAll(async () => {
    await resetAndSeedE2E(mongoUri);
    app = await createApiTestApp(mongoUri);
    const login = await loginAsE2eAdmin(app);
    adminToken = login.accessToken;
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  it('[E2E-API-007] records product and quote mutation audit events', async () => {
    const artisanResponse = await request(app.getHttpServer())
      .post(GHS_API.ARTISAN.CREATE)
      .set('Authorization', bearer(adminToken))
      .send({ name: 'Audit Artisan', status: ARTISAN_STATUSES.ACTIVE });
    const artisan = expectSuccessObject<EntityPayload>(artisanResponse, 'Audit create artisan', 201);

    const productResponse = await request(app.getHttpServer())
      .post(GHS_API.CATALOG.PRODUCTS)
      .set('Authorization', bearer(adminToken))
      .send({
        name: 'Audit Product',
        status: PRODUCT_STATUSES.ACTIVE,
        artisanId: artisan.id,
        referencePrice: 1200000,
      });
    product = expectSuccessObject<EntityPayload>(productResponse, 'Audit create product', 201);

    const rfqResponse = await request(app.getHttpServer())
      .post(GHS_API.RFQ.PUBLIC_SUBMIT)
      .send({
        customerName: 'Audit Customer',
        customerPhone: '0900000002',
        customerEmail: 'audit.customer@example.com',
        source: RFQ_SOURCES.PRODUCT_DETAIL,
        lineItems: [{ productId: product.id, productName: product.name, quantity: 1 }],
      });
    rfq = expectSuccessObject<RfqPayload>(rfqResponse, 'Audit submit RFQ', 201);

    const quoteResponse = await request(app.getHttpServer())
      .post(GHS_API.QUOTE.CREATE)
      .set('Authorization', bearer(adminToken))
      .send({
        rfqId: rfq.id,
        items: [{ productId: product.id, productName: product.name, quantity: 1, unitPrice: 1200000 }],
      });
    quote = expectSuccessObject<QuotePayload>(quoteResponse, 'Audit create quote', 201);

    const productLogs = await pollAuditAction(app, adminToken, GHS_AUDIT_ACTIONS.CREATE_PRODUCT);
    expect(productLogs.some((item) => item.entity === GHS_AUDIT_ENTITIES.PRODUCT && item.entityId === product.id)).toBe(true);

    const quoteLogs = await pollAuditAction(app, adminToken, GHS_AUDIT_ACTIONS.CREATE_QUOTE);
    expect(quoteLogs.some((item) => item.entity === GHS_AUDIT_ENTITIES.QUOTE && item.entityId === quote.id)).toBe(true);
  });
});
