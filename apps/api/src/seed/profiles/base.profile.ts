import * as mongoose from 'mongoose';
import * as bcrypt from 'bcrypt';
import { ARTISAN_STATUSES, PRODUCT_STATUSES, PRODUCT_TAGS, USER_ROLES, USER_STATUSES, type ArtisanStatus, type ProductStatus } from '@gomhoasen/contracts';
import {
  loadPocProductDetailData,
  loadPocSiteConfig,
  loadPocSiteData,
  readFirstSeedString,
  readSeedArray,
  readSeedStringArray,
  SEED_MODEL_NAMES,
  type PocSiteProductData,
  type PocVariantData,
  type PocViewSectionData,
} from '../seed.shared';

type SeedArtisan = {
  slug: string;
  name: string;
  title: string;
  status: ArtisanStatus;
  avatar: string;
  coverImage: string;
  specialty: string;
  workshop: string;
  location: string;
  yearsExperience: number;
  bio: string;
  certifications: string[];
  phone: string;
  email: string;
  lineage: string;
};

type SeedVariant = {
  id: string;
  name: string;
  swatch?: string;
  image?: string;
  description?: string;
  modelUrl?: string;
};

type SeedProduct = {
  slug: string;
  name: string;
  status: ProductStatus;
  sku: string;
  collection?: string;
  glaze?: string;
  type?: string;
  size?: string;
  referencePrice: number;
  priceLabel?: string;
  description?: string;
  tags: string[];
  poster?: string;
  images: string[];
  modelUrl?: string;
  video360Url?: string;
  variants?: SeedVariant[];
  viewSections?: PocViewSectionData[];
  specs?: Record<string, string>;
  story?: {
    title: string;
    subtitle?: string;
    content: string;
    image?: string;
  };
  artisanId?: string;
  seo?: {
    metaTitle?: string;
    metaDescription?: string;
  };
  sortOrder: number;
};

type SeedProductCuration = {
  slug: string;
  description: string;
  poster: string;
  images: string[];
  tags: string[];
  video360Url?: string;
  story?: SeedProduct['story'];
  specs?: SeedProduct['specs'];
  seoDescription: string;
};

const VIDEO_360_VIEWER = 'assets/product/lotus-360-viewer.html';

const HERO_STORY: SeedProduct['story'] = {
  title: 'Nghệ nhân Lê Minh Triết',
  subtitle: 'Giữ nhịp cọ chậm trong từng dáng sen và lớp men',
  content:
    'Bình Hoa Sen Vàng được hoàn thiện qua nhiều lượt phác thảo, chuốt dáng và thử men trước khi vào lò. Nghệ nhân Lê Minh Triết giữ nhịp cọ chậm, đều, để từng cánh sen có độ chuyển sắc tự nhiên thay vì cảm giác in khuôn.\n\nTác phẩm dành cho phòng khách, sảnh đón hoặc không gian trưng bày cần một điểm nhấn trang trọng nhưng vẫn mềm mại. Mỗi bình sau khi nung đều được kiểm tra lại độ sâu màu, độ bóng men và sự cân bằng tổng thể trước khi đóng gói.',
  image: 'assets/stories/artisan.png',
};

const HERO_SPECS: SeedProduct['specs'] = {
  'Bộ sưu tập': 'Hoa Sen',
  'Chất liệu': 'Sứ xương cao cấp',
  'Dòng men': 'Men Cobalt',
  'Kích thước': 'Cao 20cm x ĐK 8.3cm',
  'Trọng lượng': '1.2 kg',
  'Kỹ thuật': 'Tạo hình thủ công, phủ men và vẽ họa tiết',
  'Quy trình': 'Hoàn thiện theo từng mẻ nhỏ',
  'Phiên bản': 'Sản xuất theo lô giới hạn',
  'Nghệ nhân': 'Lê Minh Triết',
  'Xuất xứ': 'Bát Tràng, Hà Nội',
  'Kiểm định': 'Kiểm tra thủ công trước khi bàn giao',
  'Bảo quản': 'Lau khô bằng khăn mềm, tránh va đập mạnh',
};

const PRODUCT_CURATION: SeedProductCuration[] = [
  {
    slug: 'binh-hoa-sen-vang',
    description:
      'Bình hoa men cobalt vẽ tay, điểm ánh kim tiết chế trên họa tiết sen. Dáng bình cân, lớp men sâu màu và có trải nghiệm 3D/360 để quan sát từng chi tiết trước khi đặt báo giá.',
    poster: 'assets/product/hero.png',
    images: ['assets/product/hero.png', 'assets/product/detail-pattern.png', 'assets/product/detail-glaze.png'],
    tags: [PRODUCT_TAGS.HAS_360, PRODUCT_TAGS.BEST_SELLER, PRODUCT_TAGS.LIMITED, 'sen-viet'],
    video360Url: VIDEO_360_VIEWER,
    story: HERO_STORY,
    specs: HERO_SPECS,
    seoDescription:
      'Bình Hoa Sen Vàng men cobalt vẽ tay, có trải nghiệm 3D/360 và gallery chi tiết chất men, hoa văn, dáng bình.',
  },
  {
    slug: 'binh-thien-moc',
    description:
      'Bình hoa dáng tĩnh, phủ men celadon rạn nhẹ. Sắc ngọc dịu phù hợp bàn trà, kệ console hoặc phòng thiền cần cảm giác mộc và yên.',
    poster: 'assets/product/variant-celadon.png',
    images: ['assets/product/variant-celadon.png', 'assets/editorial/craft.png', 'assets/product/detail-glaze.png'],
    tags: [PRODUCT_TAGS.NEW, 'thien-moc', 'men-ngoc'],
    seoDescription: 'Bình Thiền Mộc men celadon, dáng tối giản cho không gian trà và phòng thiền.',
  },
  {
    slug: 'bo-tra-dao-tien',
    description:
      'Bộ trà năm món màu trắng ngà, viền vàng tiết chế. Tỷ lệ chén, ấm và khay được cân chỉnh để rót êm, cầm chắc và trưng bày gọn.',
    poster: 'assets/collections/tea.png',
    images: ['assets/collections/tea.png', 'assets/product/variant-ivory.png', 'assets/editorial/hero.png'],
    tags: [PRODUCT_TAGS.BEST_SELLER, 'tra-dao', 'qua-tang'],
    seoDescription: 'Bộ Trà Đào Tiên năm món, trắng ngà viền vàng, phù hợp thưởng trà và quà tặng đối tác.',
  },
  {
    slug: 'dia-sen-lam',
    description:
      'Đĩa trang trí họa tiết sen lam, vẽ tay trên nền men sáng. Tác phẩm dùng treo tường, đặt kệ hoặc phối cùng bình hoa cùng tông.',
    poster: 'assets/product/detail-glaze.png',
    images: ['assets/product/detail-glaze.png', 'assets/product/detail-pattern.png', 'assets/collections/decor.png'],
    tags: ['men-lam', 'sen-viet'],
    seoDescription: 'Đĩa Sen Lam vẽ tay họa tiết sen truyền thống, phù hợp trưng bày kệ và tường nghệ thuật.',
  },
  {
    slug: 'tuong-bao-ma',
    description:
      'Tượng ngựa phong thủy phủ men ngọc bích, dáng chuyển động mạnh nhưng bề mặt xử lý mềm. Phù hợp sảnh, phòng làm việc và quà mừng thành tựu.',
    poster: 'assets/collections/decor.png',
    images: ['assets/collections/decor.png', 'assets/product/detail-glaze.png', 'assets/collections/gift.png'],
    tags: ['phu-quy', 'qua-tang'],
    seoDescription: 'Tượng Bảo Mã men ngọc bích, tác phẩm phong thủy dành cho phòng làm việc và quà tặng cao cấp.',
  },
  {
    slug: 'loc-binh-van-rong',
    description:
      'Lộc bình vân rồng tạo hình uy nghi, phủ men rạn cổ và điểm vàng ở các mảng họa tiết chính. Sản phẩm dành cho không gian thờ, sảnh lớn hoặc bộ đôi đối xứng.',
    poster: 'assets/collections/decor.png',
    images: ['assets/collections/decor.png', 'assets/product/detail-pattern.png', 'assets/product/variant-ivory.png'],
    tags: [PRODUCT_TAGS.LIMITED, 'phu-quy', 'men-ran'],
    seoDescription: 'Lộc Bình Vân Rồng men rạn cổ, vẽ vàng thủ công, phù hợp không gian trang trọng.',
  },
  {
    slug: 'bo-ban-an-an-nhien',
    description:
      'Bộ bàn ăn 12 món trắng ngà, đường viền mảnh và mặt men mịn. Thiết kế đủ trang trọng cho tiệc gia đình nhưng vẫn nhẹ mắt khi dùng hằng ngày.',
    poster: 'assets/product/variant-ivory.png',
    images: ['assets/product/variant-ivory.png', 'assets/editorial/hero.png', 'assets/collections/gift.png'],
    tags: [PRODUCT_TAGS.NEW, 'qua-tang'],
    seoDescription: 'Bộ Bàn Ăn An Nhiên 12 món trắng ngà, thiết kế Nhật - Việt cho bữa ăn gia đình.',
  },
  {
    slug: 'chen-tra-ngoc-suong',
    description:
      'Chén trà đơn men celadon, thành mỏng vừa đủ để giữ hương trà. Bề mặt men trong, sắc ngọc mát và dễ phối với khay trà gỗ.',
    poster: 'assets/product/detail-glaze.png',
    images: ['assets/product/detail-glaze.png', 'assets/product/variant-celadon.png', 'assets/collections/tea.png'],
    tags: ['tra-dao', 'men-ngoc'],
    seoDescription: 'Chén Trà Ngọc Sương men celadon, thành mỏng, phù hợp thưởng trà hằng ngày.',
  },
  {
    slug: 'binh-hut-loc-kim-lien',
    description:
      'Bình hút lộc hoa sen điểm ánh kim, dáng đầy và cổ thu gọn. Món quà tân gia hoặc khai trương có tính biểu tượng nhưng không phô trương.',
    poster: 'assets/collections/gift.png',
    images: ['assets/collections/gift.png', 'assets/product/hero.png', 'assets/product/detail-pattern.png'],
    tags: [PRODUCT_TAGS.BEST_SELLER, 'phu-quy', 'qua-tang'],
    seoDescription: 'Bình Hút Lộc Kim Liên điểm ánh kim, quà tặng tân gia và khai trương cao cấp.',
  },
  {
    slug: 'lo-hoa-zen',
    description:
      'Lọ hoa dáng thấp, bề mặt men ngọc mát và ít họa tiết. Phù hợp nhành hoa đơn, bàn làm việc hoặc góc đọc sách cần sự yên tĩnh.',
    poster: 'assets/editorial/craft.png',
    images: ['assets/editorial/craft.png', 'assets/product/variant-celadon.png', 'assets/product/variant-ivory.png'],
    tags: ['thien-moc', 'minimal'],
    seoDescription: 'Lọ Hoa Zen men ngọc, dáng thấp tối giản cho bàn làm việc và góc đọc sách.',
  },
  {
    slug: 'khay-tra-son-ha',
    description:
      'Khay trà sơn thủy men lam, mặt khay rộng vừa đủ cho một ấm và bốn chén. Họa tiết giữ tông trầm để không lấn át bộ trà chính.',
    poster: 'assets/editorial/hero.png',
    images: ['assets/editorial/hero.png', 'assets/collections/tea.png', 'assets/product/detail-pattern.png'],
    tags: ['tra-dao', 'men-lam'],
    seoDescription: 'Khay Trà Sơn Hà men lam truyền thống, dùng kèm bộ trà thủ công.',
  },
  {
    slug: 'tuong-lien-hoa',
    description:
      'Tượng liên hoa trắng ngà, điêu khắc lớp cánh mềm và giữ bề mặt sạch. Tác phẩm hợp không gian thờ, góc thiền hoặc kệ trang trí sáng.',
    poster: 'assets/collections/decor.png',
    images: ['assets/collections/decor.png', 'assets/product/variant-ivory.png', 'assets/product/detail-glaze.png'],
    tags: ['sen-viet', 'thien-moc'],
    seoDescription: 'Tượng Liên Hoa trắng ngà, điêu khắc cánh sen cho không gian thờ và góc thiền.',
  },
];

function findProductCuration(slug: string) {
  return PRODUCT_CURATION.find((item) => item.slug === slug);
}

function uniqueTags(values: unknown[]) {
  return Array.from(new Set(readSeedStringArray(values)));
}

function buildSeedArtisans(): SeedArtisan[] {
  return [
    {
      slug: 'le-minh-triet',
      name: 'Lê Minh Triết',
      title: 'Nghệ nhân ưu tú',
      status: ARTISAN_STATUSES.ACTIVE,
      avatar: 'assets/stories/artisan.png',
      coverImage: 'assets/editorial/hero.png',
      specialty: 'Men Cobalt và tạo hình bình nghệ thuật',
      workshop: 'Xưởng gốm Gốm Hoa Sen, Bát Tràng',
      location: 'Bát Tràng, Hà Nội',
      yearsExperience: 24,
      bio: 'Nghệ nhân Lê Minh Triết gắn bó với gốm Bát Tràng hơn hai thập kỷ, chuyên tạo hình bình nghệ thuật và kiểm soát sắc men cobalt ở nhiệt nung cao.',
      certifications: ['Nghệ nhân ưu tú ngành gốm', 'Giải thưởng Thiết kế thủ công 2022'],
      phone: '0901234567',
      email: 'le-minh-triet@gomhoasen.vn',
      lineage: 'Thế hệ thứ ba trong gia đình làm gốm truyền thống tại Bát Tràng.',
    },
    {
      slug: 'tran-ngoc-hanh',
      name: 'Trần Ngọc Hạnh',
      title: 'Nghệ nhân chế tác',
      status: ARTISAN_STATUSES.ACTIVE,
      avatar: 'assets/stories/artisan.png',
      coverImage: 'assets/editorial/craft.png',
      specialty: 'Dòng men celadon và bộ trà thủ công',
      workshop: 'Không gian trà thất Gốm Hoa Sen, Bát Tràng',
      location: 'Bát Tràng, Hà Nội',
      yearsExperience: 17,
      bio: 'Nghệ nhân Trần Ngọc Hạnh phụ trách các bộ trà và dòng decor tinh giản, tập trung vào độ cân men, cảm giác cầm nắm và tính ứng dụng trong không gian sống hiện đại.',
      certifications: ['Nghệ nhân trẻ tiêu biểu 2021', 'Giải thưởng Thiết kế bộ trà 2023'],
      phone: '0901234568',
      email: 'tran-ngoc-hanh@gomhoasen.vn',
      lineage: 'Theo nghề từ xưởng gia đình, phát triển thêm hướng gốm tối giản đương đại.',
    },
  ];
}

function mapSwatchVariants(product: PocSiteProductData, images: string[]): SeedVariant[] {
  return readSeedStringArray(product.swatches).map((swatch, index) => {
    const variantImage = images.length > 0 ? images[index % images.length] : undefined;
    return {
      id: `${product.id}-swatch-${index + 1}`,
      name: `Biến thể ${index + 1}`,
      swatch,
      image: readFirstSeedString(variantImage, product.image),
    };
  });
}

function buildSeedProducts(): SeedProduct[] {
  const siteData = loadPocSiteData();
  const detailData = loadPocProductDetailData();
  const artisanIds = buildSeedArtisans().map((artisan) => artisan.slug);
  const siteProducts = readSeedArray<PocSiteProductData>(siteData?.products).map((product, index) => {
    const isHero = product.id === detailData?.product.id;
    const curation = findProductCuration(product.id);
    const curationImages = readSeedStringArray(curation?.images);
    const images = curationImages.length > 0 ? curationImages : uniqueTags([product.image, detailData?.product.heroImage]);
    const poster = readFirstSeedString(
      curation?.poster,
      isHero ? detailData?.product.poster : undefined,
      isHero ? detailData?.product.heroImage : undefined,
      product.image
    );
    const story = curation?.story ?? (isHero ? detailData?.story : undefined);
    const specs = curation?.specs ?? (isHero ? detailData?.specs : undefined);
    const detailVariants = readSeedArray<PocVariantData>(detailData?.variants).map((variant: PocVariantData) => ({
      id: variant.id,
      name: variant.name,
      swatch: variant.swatch,
      image: variant.image,
      description: variant.description,
      modelUrl: detailData?.product.model,
    }));
    const has360Experience =
      product.has360 === true ||
      readFirstSeedString(curation?.video360Url) !== undefined ||
      (isHero && readFirstSeedString(detailData?.product.model) !== undefined);

    return {
      slug: product.id,
      name: product.name,
      status: PRODUCT_STATUSES.ACTIVE,
      sku: `GHS-${String(index + 1).padStart(3, '0')}`,
      collection: product.collection,
      glaze: product.glaze,
      type: product.type,
      size: product.size,
      referencePrice: typeof product.price === 'number' ? product.price : 0,
      priceLabel: product.priceLabel,
      description: readFirstSeedString(curation?.description, product.desc, detailData?.product.tagline),
      tags: uniqueTags([
        ...readSeedStringArray(curation?.tags),
        ...readSeedStringArray(product.tags),
        has360Experience ? PRODUCT_TAGS.HAS_360 : undefined,
        product.isNew ? PRODUCT_TAGS.NEW : undefined,
        product.isLimited ? PRODUCT_TAGS.LIMITED : undefined,
        product.isBestSeller ? PRODUCT_TAGS.BEST_SELLER : undefined,
      ]),
      poster,
      images,
      modelUrl: isHero ? detailData?.product.model : undefined,
      video360Url: readFirstSeedString(curation?.video360Url, product.has360 === true ? VIDEO_360_VIEWER : undefined),
      variants: isHero ? detailVariants : mapSwatchVariants(product, images),
      viewSections: isHero ? detailData?.viewSections : undefined,
      specs,
      story,
      artisanId: artisanIds[index % artisanIds.length],
      seo: {
        metaTitle: `${product.name} | ${readFirstSeedString(product.collection, 'Gốm Hoa Sen') ?? 'Gốm Hoa Sen'}`,
        metaDescription: readFirstSeedString(curation?.seoDescription, product.desc, detailData?.product.tagline, product.name),
      },
      sortOrder: index + 1,
    };
  });

  const dedicated360Product: SeedProduct = {
    slug: 'to-canh-rong',
    name: 'Tô Cánh Rồng',
    status: PRODUCT_STATUSES.ACTIVE,
    sku: 'GHS-360-001',
    collection: 'Sen Việt',
    glaze: 'Men Lam',
    type: 'Decor',
    size: 'ĐK 24cm',
    referencePrice: 2850000,
    priceLabel: '2.850.000₫',
    description: 'Tô trang trí men lam, lấy cảm hứng từ đường mây và cánh rồng trong họa tiết cổ. Tác phẩm có viewer 360 để khách xem rõ nhịp vẽ, độ sâu men và dáng lòng tô trước khi đặt báo giá.',
    tags: [PRODUCT_TAGS.HAS_360, PRODUCT_TAGS.LIMITED, 'men-lam'],
    poster: 'assets/product/detail-pattern.png',
    images: ['assets/product/detail-pattern.png', 'assets/product/detail-glaze.png', 'assets/collections/decor.png'],
    video360Url: VIDEO_360_VIEWER,
    artisanId: artisanIds[0],
    story: {
      title: 'Một nét lam cho bàn trà hiện đại',
      subtitle: 'Mẫu decor nhỏ nhưng đủ chiều sâu để quan sát cận cảnh',
      content:
        'Tô Cánh Rồng được phát triển cho những góc trưng bày cần một tác phẩm thấp, gọn và có họa tiết mạnh. Lòng tô giữ nền men sáng để nét lam nổi rõ, còn mép tô được xử lý mảnh để tạo cảm giác thanh khi nhìn nghiêng.',
      image: 'assets/product/detail-pattern.png',
    },
    specs: {
      'Bộ sưu tập': 'Men Lam Di Sản',
      'Chất liệu': 'Sứ cao cấp',
      'Dòng men': 'Men Lam',
      'Kích thước': 'Đường kính 24cm',
      'Kỹ thuật': 'Vẽ tay, phủ men trong',
      'Nghệ nhân': 'Lê Minh Triết',
    },
    seo: {
      metaTitle: 'Tô Cánh Rồng | Gốm Hoa Sen',
      metaDescription: 'Tô Cánh Rồng men lam có viewer 360, gallery chi tiết và nội dung sản phẩm hoàn chỉnh.',
    },
    sortOrder: siteProducts.length + 1,
  };

  return [...siteProducts, dedicated360Product];
}

export async function seedBase() {
  const User = mongoose.model(SEED_MODEL_NAMES.USER);
  const Product = mongoose.model(SEED_MODEL_NAMES.PRODUCT);
  const Artisan = mongoose.model(SEED_MODEL_NAMES.ARTISAN);
  const SiteConfig = mongoose.model(SEED_MODEL_NAMES.SITE_CONFIG);

  // 1. Admin
  const configuredAdminEmail =
    process.env['ADMIN_SEED_EMAIL']?.trim() ||
    process.env['PRODUCTION_ADMIN_EMAIL']?.trim() ||
    'admin@gomhoasen.vn';
  const configuredAdminPassword =
    process.env['ADMIN_SEED_PASSWORD']?.trim() ||
    process.env['PRODUCTION_ADMIN_PASSWORD']?.trim();
  const seedProfile = process.env['SEED_PROFILE']?.trim();
  const isDisposableSeed =
    process.env['NODE_ENV'] === 'development' ||
    process.env['NODE_ENV'] === 'test' ||
    seedProfile === 'uat' ||
    seedProfile === 'e2e';
  if (!isDisposableSeed && (!configuredAdminPassword || configuredAdminPassword.length < 12)) {
    throw new Error('ADMIN_SEED_PASSWORD (or PRODUCTION_ADMIN_PASSWORD) with at least 12 characters is required for production seed');
  }
  const adminPassword = configuredAdminPassword || 'ChangeMe123!';
  const hashed = await bcrypt.hash(adminPassword, 10);
  await User.findOneAndUpdate(
    { email: configuredAdminEmail },
    {
      $set: {
        fullName: process.env['ADMIN_SEED_NAME']?.trim() || 'Admin Gốm Hoa Sen',
        hashedPassword: hashed,
        role: USER_ROLES.ADMIN,
        status: USER_STATUSES.ACTIVE,
        isDeleted: false,
      },
      $unset: { deletedAt: '' },
    },
    { upsert: true, returnDocument: 'after' }
  );

  // 2. Artisans
  const artisans = buildSeedArtisans();
  for (const a of artisans) {
    await Artisan.findOneAndUpdate({ slug: a.slug }, { $setOnInsert: a }, { upsert: true });
  }

  // 3. Products — full local UAT catalog derived from POC site/product JSON
  const products = buildSeedProducts();
  for (const p of products) {
    await Product.findOneAndUpdate({ slug: p.slug }, { $setOnInsert: p }, { upsert: true });
  }

  // 4. Site Config
  const siteConfigData = loadPocSiteConfig();
  
  // Dữ liệu mẫu cho Occasions
  if (!siteConfigData.occasions || siteConfigData.occasions.length === 0) {
    siteConfigData.occasions = [
      { id: 'qua-tang', name: 'Quà tặng doanh nghiệp', icon: 'assets/collections/gift.png', desc: 'Thiết kế sang trọng, mang đậm dấu ấn văn hóa Việt, phù hợp biếu tặng đối tác, khách hàng.' },
      { id: 'trang-tri', name: 'Trang trí nội thất', icon: 'assets/collections/decor.png', desc: 'Tạo điểm nhấn nghệ thuật cho phòng khách, sảnh đón và không gian làm việc.' },
      { id: 'thuong-tra', name: 'Thưởng trà & Đời sống', icon: 'assets/collections/tea.png', desc: 'Bộ trà và đồ dùng hằng ngày với thiết kế mộc mạc, tĩnh lặng cho những phút giây thư giãn.' }
    ];
  }

  // Dữ liệu mẫu cho Journal
  if (!siteConfigData.journal || siteConfigData.journal.length === 0) {
    siteConfigData.journal = [
      { id: 'nghe-thuat-men-cobalt', title: 'Sự quyến rũ của Men Cobalt', excerpt: 'Khám phá quy trình chế tác men cobalt thủ công tại xưởng Gốm Hoa Sen, nơi lửa và đất hòa quyện tạo nên màu xanh sâu thẳm.', image: 'assets/product/detail-glaze.png' },
      { id: 'cau-chuyen-hoa-sen', title: 'Hoa Sen - Biểu tượng văn hóa', excerpt: 'Nét vẽ hoa sen trên gốm không chỉ là nghệ thuật trang trí mà còn là thông điệp về sự thanh cao, thuần khiết.', image: 'assets/product/detail-pattern.png' },
      { id: 'phong-thuy-gom-su', title: 'Bài trí Gốm Sứ phong thủy', excerpt: 'Cách chọn và đặt bình hút lộc, tượng linh thú trong nhà để thu hút vượng khí, tài lộc cho gia chủ.', image: 'assets/collections/gift.png' }
    ];
  }

  await SiteConfig.findOneAndUpdate(
    { key: 'default' },
    { 
      $setOnInsert: {
        brandName: siteConfigData.brandName,
        tagline: siteConfigData.tagline,
        subtitle: siteConfigData.subtitle,
        founded: siteConfigData.founded,
        location: siteConfigData.location,
        contact: siteConfigData.contact,
        social: siteConfigData.social,
        seo: siteConfigData.seo,
        filters: siteConfigData.filters,
        collections: siteConfigData.collections,
        occasions: siteConfigData.occasions,
        journal: siteConfigData.journal,
      },
    },
    { upsert: true, returnDocument: 'after' }
  );

  return { verified: true };
}
