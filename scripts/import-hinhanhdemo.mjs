#!/usr/bin/env node
/**
 * One-shot import: Hinhanhdemo folders → categories + products on local GHS API/DB.
 *
 * Showroom URL conventions (Vietnamese):
 *   /danh-muc          category listing
 *   /san-pham/:slug    product detail
 *   /bo-suu-tap        collections
 *
 * Env:
 *   API_BASE_URL   default http://127.0.0.1:4310/api
 *   ADMIN_EMAIL    default admin@gomhoasen.local
 *   ADMIN_PASSWORD default LocalDevAdmin123!
 *   HINHANH_ROOT   default ../Hinhanhdemo/TÀI LIỆU HÌNH ẢNH WEB GỐM HOA SEN-20260728T080833Z-1-001
 *   DRY_RUN=1      scan only, no writes
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { basename, dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DRY_RUN = process.env.DRY_RUN === '1';
const API_BASE = (process.env.API_BASE_URL ?? 'http://127.0.0.1:4310/api').replace(/\/$/, '');
const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'admin@gomhoasen.local';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? 'LocalDevAdmin123!';
const HINHANH_ROOT = resolve(
  process.env.HINHANH_ROOT
    ?? join(__dirname, '../../Hinhanhdemo/TÀI LIỆU HÌNH ẢNH WEB GỐM HOA SEN-20260728T080833Z-1-001'),
);

const IMAGE_EXT = /\.(jpe?g|png|webp)$/i;
const MAX_DIMENSION = 1920;
const WEBP_QUALITY = 80;

const CATEGORY_DEFS = [
  {
    folderName: 'Bộ đồ thờ men hóa thạch',
    slug: 'bo-do-tho-men-hoa-thach',
    glaze: 'Men hóa thạch',
    type: 'Bộ đồ thờ',
    storyTone: 'Men hóa thạch mang sắc tro trầm, gợi cảm giác thời gian lắng đọng qua từng vết nứt men tự nhiên.',
  },
  {
    folderName: 'Bộ đồ thờ men hoàng thổ',
    slug: 'bo-do-tho-men-hoang-tho',
    glaze: 'Men hoàng thổ',
    type: 'Bộ đồ thờ',
    storyTone: 'Men hoàng thổ ấm sâu như đất nung, tôn vẻ đẹp trầm tĩnh của không gian thờ cúng trang nghiêm.',
  },
  {
    folderName: 'Tác phẩm gốm sứ độc bản',
    slug: 'tac-pham-gom-su-doc-ban',
    glaze: 'Gốm sứ độc bản',
    type: 'Tác phẩm nghệ thuật',
    storyTone: 'Mỗi tác phẩm là phiên bản duy nhất, được tạo hình và hoàn thiện thủ công với tinh thần gìn giữ hồn gốm Việt.',
  },
];

const DOC_BAN_THEMES = {
  'xà thần hộ pháp': 'Biểu tượng hộ pháp linh thiêng, thể hiện sức mạnh bảo vệ và sự tôn kính trong không gian thờ tự.',
  'thiềm đức tuệ đăng': 'Hình tượng Thiềm thừ, gợi lộc tài và sự sung túc, được chế tác với nét men sâu và thần thái tĩnh lặng.',
  'truyền thuyết việt tổ': 'Gợi nhớ cội nguồn dân tộc qua ngôn ngữ gốm đương đại, kết hợp hoa văn và cảm xúc văn hóa Việt.',
  'chú cuội chị hằng': 'Lấy cảm hứng từ truyền thuyết trăng rằm, mang vẻ đẹp lãng mạn và chiều sâu tâm linh.',
  'thăng long quốc bảo bình': 'Dáng bình phong thủy cao cấp, tượng trưng cho sinh khí và sự thịnh vượng trong không gian trang trí.',
  'tam thánh phật': 'Tác phẩm tôn vinh tinh thần Phật giáo, phù hợp không gian thiền tĩnh và trang nghiêm.',
  'vươn mình': 'Thể hiện khát vọng vươn lên, nét men và đường cong gốm tạo nhịp điệu mạnh mẽ nhưng vẫn thanh tao.',
};

function slugifyVi(input) {
  return String(input)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function titleCaseVi(name) {
  return String(name)
    .replace(/\.[^.]+$/, '')
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function listImages(dir) {
  return readdirSync(dir)
    .filter((file) => IMAGE_EXT.test(file))
    .sort((a, b) => a.localeCompare(b, 'vi'))
    .map((file) => join(dir, file));
}

function scanProducts(def) {
  const catPath = join(HINHANH_ROOT, def.folderName);
  const products = [];

  if (def.slug === 'tac-pham-gom-su-doc-ban') {
    for (const entry of readdirSync(catPath, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        const images = listImages(join(catPath, entry.name));
        if (images.length === 0) continue;
        products.push({
          name: titleCaseVi(entry.name),
          slug: slugifyVi(entry.name),
          images,
          categorySlug: def.slug,
          glaze: def.glaze,
          type: def.type,
          themeKey: entry.name.toLowerCase(),
        });
      } else if (entry.isFile() && IMAGE_EXT.test(entry.name)) {
        const base = basename(entry.name).replace(/\.[^.]+$/i, '');
        products.push({
          name: titleCaseVi(base),
          slug: slugifyVi(base),
          images: [join(catPath, entry.name)],
          categorySlug: def.slug,
          glaze: def.glaze,
          type: def.type,
          themeKey: base.toLowerCase(),
        });
      }
    }
    return products;
  }

  const images = listImages(catPath);
  images.forEach((filePath, index) => {
    const number = index + 1;
    products.push({
      name: String(number),
      slug: `${def.slug}-${number}`,
      images: [filePath],
      categorySlug: def.slug,
      glaze: def.glaze,
      type: def.type,
      themeKey: def.slug,
      seriesIndex: number,
    });
  });
  return products;
}

function buildContent(product, categoryDef) {
  const themeLine = DOC_BAN_THEMES[product.themeKey]
    ?? categoryDef.storyTone;

  if (product.seriesIndex) {
    const description = `${categoryDef.folderName} — tác phẩm số ${product.seriesIndex}. ${categoryDef.storyTone} Phù hợp không gian thờ cúng và trưng bày cao cấp.`;
    return {
      description,
      story: {
        title: `${categoryDef.folderName} ${product.seriesIndex}`,
        subtitle: categoryDef.glaze,
        content: `${description} Gốm Hoa Sen chế tác thủ công, giữ tinh thần heritage luxury trong từng chi tiết men và đường nét.`,
      },
      seo: {
        metaTitle: `${categoryDef.folderName} ${product.seriesIndex} | Gốm Hoa Sen`,
        metaDescription: description,
      },
    };
  }

  const description = `${product.name} thuộc bộ sưu tập ${categoryDef.folderName}. ${themeLine} Tác phẩm phù hợp trưng bày, quà tặng văn hóa hoặc không gian thiền tĩnh.`;
  return {
    description,
    story: {
      title: product.name,
      subtitle: categoryDef.glaze,
      content: `${description} Mỗi chi tiết được hoàn thiện bằng tay, thể hiện triết lý “sinh ra từ đất, giữ hồn bằng lửa” của Gốm Hoa Sen.`,
    },
    seo: {
      metaTitle: `${product.name} | ${categoryDef.folderName} | Gốm Hoa Sen`,
      metaDescription: description,
    },
  };
}

async function optimizeToWebpBuffer(filePath) {
  const input = readFileSync(filePath);
  return sharp(input)
    .rotate()
    .resize({ width: MAX_DIMENSION, height: MAX_DIMENSION, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: WEBP_QUALITY })
    .toBuffer();
}

async function apiFetch(path, { method = 'GET', token, body, isForm = false } = {}) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body && !isForm) headers['Content-Type'] = 'application/json';

  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? (isForm ? body : JSON.stringify(body)) : undefined,
  });

  const text = await response.text();
  let payload;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = text;
  }

  if (!response.ok) {
    const message = typeof payload === 'object' && payload?.message
      ? payload.message
      : `HTTP ${response.status} ${path}`;
    throw new Error(message);
  }
  return payload?.data ?? payload;
}

async function login() {
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
    throw new Error('Thiếu ADMIN_EMAIL hoặc ADMIN_PASSWORD trong env');
  }
  const result = await apiFetch('/iam/auth/login', {
    method: 'POST',
    body: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
  });
  return result.accessToken;
}

async function ensureCategory(token, def, sortOrder) {
  if (DRY_RUN) {
    console.log(`  [dry-run] category: ${def.folderName}`);
    return `dry-${def.slug}`;
  }

  const existing = (await apiFetch('/catalog/categories', { token }))
    .find((item) => item.slug === def.slug);
  if (existing) {
    console.log(`  category exists: ${def.folderName} (${existing._id ?? existing.id})`);
    return existing._id ?? existing.id;
  }
  const created = await apiFetch('/catalog/categories', {
    method: 'POST',
    token,
    body: {
      name: def.folderName,
      slug: def.slug,
      description: def.storyTone,
      sortOrder,
    },
  });
  console.log(`  created category: ${def.folderName}`);
  return created._id ?? created.id;
}

async function findProductBySlug(token, slug) {
  const products = await apiFetch('/catalog/products', { token });
  return products.find((item) => item.slug === slug);
}

async function uploadProductImage(token, productId, filePath) {
  const webp = await optimizeToWebpBuffer(filePath);
  const form = new FormData();
  const fileName = `${slugifyVi(basename(filePath, extname(filePath))) || 'anh'}.webp`;
  // Node File keeps filename for multer extensionGuard; Blob+filename can drop it
  const file = typeof File === 'function'
    ? new File([webp], fileName, { type: 'image/webp' })
    : new Blob([webp], { type: 'image/webp' });
  form.append('file', file, fileName);

  const product = await apiFetch(`/catalog/products/${productId}/images`, {
    method: 'POST',
    token,
    body: form,
    isForm: true,
  });
  return product;
}

async function importProduct(token, product, categoryId, categoryDef, sortOrder) {
  if (DRY_RUN) {
    console.log(`  [dry-run] product: ${product.name} (${product.slug}) images=${product.images.length}`);
    return;
  }

  const existing = await findProductBySlug(token, product.slug);
  if (existing) {
    console.log(`  skip existing product: ${product.slug}`);
    return;
  }

  const content = buildContent(product, categoryDef);

  const created = await apiFetch('/catalog/products', {
    method: 'POST',
    token,
    body: {
      name: product.name,
      slug: product.slug,
      status: 'ACTIVE',
      collectionId: categoryId,
      glaze: product.glaze,
      type: product.type,
      referencePrice: 0,
      priceLabel: 'Liên hệ',
      description: content.description,
      story: content.story,
      seo: content.seo,
      sortOrder,
      images: [],
    },
  });

  const productId = created._id ?? created.id;
  let lastProduct = created;
  for (const imagePath of product.images) {
    lastProduct = await uploadProductImage(token, productId, imagePath);
  }

  const uploadedImages = lastProduct.images ?? [];
  const poster = uploadedImages[0];
  if (poster) {
    await apiFetch(`/catalog/products/${productId}`, {
      method: 'PATCH',
      token,
      body: { poster },
    });
  }

  console.log(`  imported product: ${product.name} (${product.slug})`);
}

async function main() {
  console.log(`Hinhanhdemo import`);
  console.log(`  root: ${HINHANH_ROOT}`);
  console.log(`  api:  ${API_BASE}`);
  console.log(`  dry:  ${DRY_RUN}`);

  if (!statSync(HINHANH_ROOT).isDirectory()) {
    throw new Error(`Không tìm thấy thư mục nguồn: ${HINHANH_ROOT}`);
  }

  const allProducts = CATEGORY_DEFS.flatMap((def) => scanProducts(def));
  console.log(`Found ${allProducts.length} products across ${CATEGORY_DEFS.length} categories`);

  const token = DRY_RUN ? null : await login();

  let sortOrder = 1;
  for (const [index, def] of CATEGORY_DEFS.entries()) {
    console.log(`\nCategory: ${def.folderName}`);
    const categoryId = await ensureCategory(token, def, index + 1);
    const products = scanProducts(def);
    for (const product of products) {
      await importProduct(token, product, categoryId, def, sortOrder);
      sortOrder += 1;
    }
  }

  console.log('\nDone.');
}

main().catch((error) => {
  console.error(error.message ?? error);
  process.exit(1);
});
