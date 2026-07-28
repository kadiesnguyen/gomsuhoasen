import * as mongoose from 'mongoose';
import * as bcrypt from 'bcrypt';
import { ARTISAN_STATUSES, PRODUCT_STATUSES, PRODUCT_TAGS, RFQ_SOURCES, RFQ_STATUSES, USER_ROLES } from '@gomhoasen/contracts';
import {
  E2E_ADMIN_FIXTURE,
  E2E_COLLECTION_FIXTURE,
  E2E_PUBLIC_PRODUCT_FIXTURE,
  E2E_SEEDED_RFQ_FIXTURE,
  E2E_VIDEO360_PRODUCT_FIXTURE,
} from '../e2e-fixtures';
import { loadPocSiteConfig, SEED_MODEL_NAMES } from '../seed.shared';

export async function seedE2e() {
  const User = mongoose.model(SEED_MODEL_NAMES.USER);
  const Product = mongoose.model(SEED_MODEL_NAMES.PRODUCT);
  const Artisan = mongoose.model(SEED_MODEL_NAMES.ARTISAN);
  const SiteConfig = mongoose.model(SEED_MODEL_NAMES.SITE_CONFIG);
  const Rfq = mongoose.model(SEED_MODEL_NAMES.RFQ);

  // E2E needs deterministic small dataset
  const hashed = await bcrypt.hash(E2E_ADMIN_FIXTURE.password, 10);
  await User.findOneAndUpdate(
    { email: E2E_ADMIN_FIXTURE.email },
    { $setOnInsert: { fullName: E2E_ADMIN_FIXTURE.fullName, hashedPassword: hashed, role: USER_ROLES.ADMIN } },
    { upsert: true }
  );

  await Artisan.findOneAndUpdate(
    { slug: 'e2e-artisan' },
    { $setOnInsert: { name: 'E2E Artisan', title: 'Nghệ nhân E2E', status: ARTISAN_STATUSES.ACTIVE } },
    { upsert: true }
  );

  await Product.findOneAndUpdate(
    { slug: E2E_PUBLIC_PRODUCT_FIXTURE.slug },
    {
      $setOnInsert: {
        name: E2E_PUBLIC_PRODUCT_FIXTURE.name,
        slug: E2E_PUBLIC_PRODUCT_FIXTURE.slug,
        status: PRODUCT_STATUSES.ACTIVE,
        isDeleted: false,
        collection: E2E_COLLECTION_FIXTURE.name,
        glaze: 'Men E2E',
        type: 'Bình',
        size: 'Cao 20cm',
        referencePrice: 1800000,
        priceLabel: '1.800.000₫',
        description: 'Sản phẩm E2E không có video 360 để kiểm tra CTA theo dữ liệu.',
        poster: 'assets/product/detail-glaze.png',
        images: ['assets/product/detail-glaze.png'],
        tags: ['e2e'],
        sortOrder: 1,
      },
    },
    { upsert: true }
  );

  await Product.findOneAndUpdate(
    { slug: E2E_VIDEO360_PRODUCT_FIXTURE.slug },
    {
      $set: {
        video360Url: E2E_VIDEO360_PRODUCT_FIXTURE.fixturePath,
      },
      $setOnInsert: {
        name: E2E_VIDEO360_PRODUCT_FIXTURE.name,
        slug: E2E_VIDEO360_PRODUCT_FIXTURE.slug,
        status: PRODUCT_STATUSES.ACTIVE,
        isDeleted: false,
        collection: E2E_COLLECTION_FIXTURE.name,
        glaze: 'Men E2E',
        type: 'Tô',
        size: 'ĐK 24cm',
        referencePrice: 2800000,
        priceLabel: '2.800.000₫',
        description: 'Sản phẩm E2E có video 360 để kiểm tra lazy-load viewer.',
        poster: 'assets/product/detail-pattern.png',
        images: ['assets/product/detail-pattern.png'],
        tags: ['e2e', PRODUCT_TAGS.HAS_360],
        sortOrder: 2,
      },
    },
    { upsert: true }
  );

  await Rfq.findOneAndUpdate(
    { customerEmail: E2E_SEEDED_RFQ_FIXTURE.customerEmail },
    {
      $set: {
        source: RFQ_SOURCES.PRODUCT_DETAIL,
      },
      $setOnInsert: {
        customerName: E2E_SEEDED_RFQ_FIXTURE.customerName,
        customerPhone: E2E_SEEDED_RFQ_FIXTURE.customerPhone,
        customerEmail: E2E_SEEDED_RFQ_FIXTURE.customerEmail,
        message: E2E_SEEDED_RFQ_FIXTURE.message,
        lineItems: [
          {
            productId: E2E_PUBLIC_PRODUCT_FIXTURE.slug,
            productName: E2E_PUBLIC_PRODUCT_FIXTURE.name,
            quantity: 1,
          },
        ],
        status: RFQ_STATUSES.NEW,
      },
    },
    { upsert: true }
  );

  await SiteConfig.findOneAndUpdate(
    { key: 'default' },
    { $setOnInsert: loadPocSiteConfig() },
    { upsert: true }
  );

  // Verification
  const counts = {
    users: await User.countDocuments(),
    products: await Product.countDocuments(),
    artisans: await Artisan.countDocuments(),
    rfqs: await Rfq.countDocuments(),
  };

  return { verified: true, counts };
}
