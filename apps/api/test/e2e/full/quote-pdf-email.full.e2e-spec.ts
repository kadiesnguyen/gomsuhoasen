import { createRequire } from 'node:module';
import { NestExpressApplication } from '@nestjs/platform-express';
import { GHS_API, PRODUCT_STATUSES, QUOTE_STATUSES, RFQ_SOURCES, type QuoteStatus } from '@gomhoasen/contracts';
import { createApiTestApp } from '../../helpers/app.factory';
import { bearer, loginAsE2eAdmin } from '../../helpers/auth.helper';
import { expectSuccessObject } from '../../helpers/asserts.helper';
import { describeIfE2eMongo, resolveE2eMongoUri } from '../../helpers/db.helper';
import { resetAndSeedE2E } from '../../helpers/seed.helper';
import { QuoteEmailService } from '../../../../../libs/modules/quote/src/lib/services/quote-email.service';
import { QuotePdfService } from '../../../../../libs/modules/quote/src/lib/services/quote-pdf.service';

const require = createRequire(import.meta.url);
const request = require('supertest') as typeof import('supertest');

interface EntityPayload {
  id: string;
  name: string;
}

interface RfqPayload {
  id: string;
}

interface QuotePayload {
  id: string;
  status: QuoteStatus;
  pdfUrl?: string;
}

describeIfE2eMongo('API Full - Quote PDF + email', () => {
  const mongoUri = resolveE2eMongoUri('quote_pdf_email');
  const generatePdf = jest.fn<Promise<string>, Parameters<QuotePdfService['generate']>>()
    .mockResolvedValue('uploads/quotes/e2e-quote.pdf');
  const sendQuote = jest.fn<Promise<void>, Parameters<QuoteEmailService['sendQuote']>>()
    .mockResolvedValue(undefined);
  let app: NestExpressApplication;
  let adminToken: string;
  let product: EntityPayload;
  let quote: QuotePayload;

  beforeAll(async () => {
    await resetAndSeedE2E(mongoUri);
    app = await createApiTestApp(mongoUri, {
      pdf: { generate: generatePdf },
      email: { sendQuote },
    });
    const login = await loginAsE2eAdmin(app);
    adminToken = login.accessToken;
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  it('[E2E-API-006] generates quote PDF and sends email through stubbed providers', async () => {
    const productResponse = await request(app.getHttpServer())
      .post(GHS_API.CATALOG.PRODUCTS)
      .set('Authorization', bearer(adminToken))
      .send({
        name: 'PDF Email Product',
        status: PRODUCT_STATUSES.ACTIVE,
        referencePrice: 1800000,
      });
    product = expectSuccessObject<EntityPayload>(productResponse, 'PDF create product', 201);

    const rfqResponse = await request(app.getHttpServer())
      .post(GHS_API.RFQ.PUBLIC_SUBMIT)
      .send({
        customerName: 'PDF Customer',
        customerPhone: '0900000003',
        customerEmail: 'pdf.customer@example.com',
        source: RFQ_SOURCES.PRODUCT_DETAIL,
        lineItems: [{ productId: product.id, productName: product.name, quantity: 1 }],
      });
    const rfq = expectSuccessObject<RfqPayload>(rfqResponse, 'PDF submit RFQ', 201);

    const quoteResponse = await request(app.getHttpServer())
      .post(GHS_API.QUOTE.CREATE)
      .set('Authorization', bearer(adminToken))
      .send({
        rfqId: rfq.id,
        items: [{ productId: product.id, productName: product.name, quantity: 1, unitPrice: 1800000 }],
      });
    quote = expectSuccessObject<QuotePayload>(quoteResponse, 'PDF create quote', 201);

    const pdfResponse = await request(app.getHttpServer())
      .post(GHS_API.QUOTE.PDF(quote.id))
      .set('Authorization', bearer(adminToken));
    const quoteWithPdf = expectSuccessObject<QuotePayload>(pdfResponse, 'PDF generate', 201);
    expect(quoteWithPdf.pdfUrl).toBe('uploads/quotes/e2e-quote.pdf');
    expect(generatePdf).toHaveBeenCalledTimes(1);

    const sendResponse = await request(app.getHttpServer())
      .post(GHS_API.QUOTE.SEND(quote.id))
      .set('Authorization', bearer(adminToken));
    const sentQuote = expectSuccessObject<QuotePayload>(sendResponse, 'Quote send', 201);
    expect(sentQuote.status).toBe(QUOTE_STATUSES.SENT);
    expect(sentQuote.pdfUrl).toBe('uploads/quotes/e2e-quote.pdf');
    expect(sendQuote).toHaveBeenCalledTimes(1);
  });
});
