import * as mongoose from 'mongoose';
import { QUOTE_STATUSES, RFQ_SOURCES, RFQ_STATUSES } from '@gomhoasen/contracts';
import { SEED_MODEL_NAMES } from '../seed.shared';
import { seedBase } from './base.profile';

type SeedProductLookup = {
  _id: mongoose.Types.ObjectId;
  name: string;
  glaze?: string;
  size?: string;
};

type SeedRfqLineItem = {
  productId: string;
  productName: string;
  quantity: number;
  variant: string;
  note: string;
};

type SeedQuoteItem = {
  productId: mongoose.Types.ObjectId;
  productName: string;
  glaze?: string;
  size?: string;
  quantity: number;
  unitPrice: number;
  customization: string;
  lineTotal: number;
};

const UAT_PROFILE_FIXTURE = {
  auditAction: 'SEED_UAT',
  auditEntity: 'system',
  auditEntityId: 'uat-profile',
  customerEmail: 'uat@example.com',
  customerName: '[UAT] Showroom RFQ',
  customerPhone: '0900000001',
  profile: 'uat',
  quoteCode: 'Q-2026-UAT-001',
} as const;

function isDefined<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
}

function isSeedProductLookup(value: unknown): value is SeedProductLookup {
  if (!value || Array.isArray(value) || typeof value !== 'object') {
    return false;
  }
  const candidate = value as {
    _id?: unknown;
    name?: unknown;
    glaze?: unknown;
    size?: unknown;
  };
  return candidate._id instanceof mongoose.Types.ObjectId && typeof candidate.name === 'string';
}

export async function seedUat() {
  await seedBase(); // UAT builds on base

  const Rfq = mongoose.model(SEED_MODEL_NAMES.RFQ);
  const Quote = mongoose.model(SEED_MODEL_NAMES.QUOTE);
  const AuditLog = mongoose.model(SEED_MODEL_NAMES.AUDIT_LOG);
  const Product = mongoose.model(SEED_MODEL_NAMES.PRODUCT);

  const heroProductResult = await Product.findOne({ slug: 'binh-hoa-sen-vang' }).lean().exec();
  const videoProductResult = await Product.findOne({ slug: 'to-canh-rong' }).lean().exec();
  const heroProduct = isSeedProductLookup(heroProductResult) ? heroProductResult : null;
  const videoProduct = isSeedProductLookup(videoProductResult) ? videoProductResult : null;
  const lineItems: SeedRfqLineItem[] = [
    heroProduct
      ? {
          productId: String(heroProduct._id),
          productName: heroProduct.name,
          quantity: 2,
          variant: 'Men Cobalt',
          note: 'Ưu tiên men sâu và hoa văn rõ nét',
        }
      : undefined,
    videoProduct
      ? {
          productId: String(videoProduct._id),
          productName: videoProduct.name,
          quantity: 1,
          variant: 'Decor 24cm',
          note: 'Trưng bày khu vực tiếp khách',
        }
      : undefined,
  ].filter(isDefined);

  // 1. RFQ mẫu — đủ dữ liệu để portal dashboard / inbox có giá trị UAT
  const rfq = await Rfq.findOneAndUpdate(
    {
      customerEmail: UAT_PROFILE_FIXTURE.customerEmail,
      customerName: UAT_PROFILE_FIXTURE.customerName,
    },
    {
      $set: {
        customerName: UAT_PROFILE_FIXTURE.customerName,
        customerPhone: UAT_PROFILE_FIXTURE.customerPhone,
        customerEmail: UAT_PROFILE_FIXTURE.customerEmail,
        customerCompany: 'GHS Manual UAT',
        message: 'Cần báo giá và thời gian hoàn thiện cho khu vực trưng bày phòng khách.',
        source: RFQ_SOURCES.PRODUCT_DETAIL,
        status: RFQ_STATUSES.NEW,
        lineItems,
      },
    },
    { upsert: true, returnDocument: 'after' }
  );

  const subtotal = 34450000;
  const quoteItems: SeedQuoteItem[] = [
    heroProduct
      ? {
          productId: heroProduct._id,
          productName: heroProduct.name,
          glaze: heroProduct.glaze,
          size: heroProduct.size,
          quantity: 2,
          unitPrice: 15800000,
          customization: 'Đóng hộp quà cao cấp',
          lineTotal: 31600000,
        }
      : undefined,
    videoProduct
      ? {
          productId: videoProduct._id,
          productName: videoProduct.name,
          glaze: videoProduct.glaze,
          size: videoProduct.size,
          quantity: 1,
          unitPrice: 2850000,
          customization: 'Gắn plaque tên phòng khách',
          lineTotal: 2850000,
        }
      : undefined,
  ].filter(isDefined);

  // 2. Quote mẫu — có line items và totals thật để test dashboard / quote screens
  await Quote.findOneAndUpdate(
    { code: UAT_PROFILE_FIXTURE.quoteCode },
    {
      $set: {
        code: UAT_PROFILE_FIXTURE.quoteCode,
        rfqId: rfq._id,
        customerName: UAT_PROFILE_FIXTURE.customerName,
        customerPhone: UAT_PROFILE_FIXTURE.customerPhone,
        customerEmail: UAT_PROFILE_FIXTURE.customerEmail,
        status: QUOTE_STATUSES.DRAFT,
        items: quoteItems,
        subtotal,
        discount: 1500000,
        total: subtotal - 1500000,
        terms: 'Báo giá có hiệu lực 15 ngày. Thời gian hoàn thiện dự kiến 12 ngày làm việc.',
        validUntil: new Date('2026-06-15T00:00:00.000Z'),
      },
    },
    { upsert: true }
  );

  // 3. Audit Logs
  await AuditLog.findOneAndUpdate(
    { action: UAT_PROFILE_FIXTURE.auditAction },
    {
      $set: {
        userId: UAT_PROFILE_FIXTURE.auditEntity,
        action: UAT_PROFILE_FIXTURE.auditAction,
        entity: UAT_PROFILE_FIXTURE.auditEntity,
        entityId: UAT_PROFILE_FIXTURE.auditEntityId,
        payload: {
          profile: UAT_PROFILE_FIXTURE.profile,
          rfqCustomer: UAT_PROFILE_FIXTURE.customerName,
          quoteCode: UAT_PROFILE_FIXTURE.quoteCode,
        },
      },
    },
    { upsert: true }
  );

  return { verified: true };
}
