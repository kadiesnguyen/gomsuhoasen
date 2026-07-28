/**
 * Client-side ceramic copy when CMS/API leaves products thin
 * (numbered altar pieces, empty viewSections / story / specs).
 */

const LOTUS_MARK = '/assets/brand/lotus-mark.png';

const ALTAR_PIECES = [
  'Lư hương',
  'Đèn thờ',
  'Bình hoa thờ',
  'Đĩa quả',
  'Ống hương',
  'Bát hương',
  'Chân nến',
  'Mâm bồng',
  'Lọ hoa thờ',
  'Đĩa sen',
  'Hộp trà hương',
  'Chén nước',
  'Lư trầm',
  'Đĩa bánh',
  'Bình nước thờ',
  'Kỷ thờ',
] as const;

type EnrichInput = {
  slug?: string;
  name?: string;
  collection?: string;
  type?: string;
  glaze?: string;
  description?: string;
  tagline?: string;
  poster?: string;
  images?: string[];
  story?: {
    title?: string;
    subtitle?: string;
    content?: string;
    image?: string;
  } | null;
  specs?: Record<string, string> | null;
  viewSections?: Array<{
    id: string;
    name: string;
    icon: string;
    camera: { orbit: string; target: string };
    description?: string;
    hotspots: Array<{
      id: string;
      position: string;
      normal: string;
      label: string;
      panel: { title: string; content: string; image?: string; cta?: string };
    }>;
  }>;
};

function trim(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function slugPieceIndex(slug: string): number | null {
  const match = slug.match(/-(\d+)$/);
  if (!match) return null;
  const n = Number(match[1]);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function glazeShort(glaze: string, collection: string): string {
  const g = glaze || collection;
  return g.replace(/^Bộ đồ thờ\s+/i, '').replace(/^Men\s+/i, 'men ').trim() || 'men thủ công';
}

/** Readable name when CMS stored only "1", "2", … */
export function resolveProductDisplayName(
  name: string,
  collection: string,
  slug: string,
): string {
  const raw = trim(name);
  const index = slugPieceIndex(slug);
  const isNumeric = /^\d{1,3}$/.test(raw);
  const looksAltar =
    /do-tho|đồ thờ|tho-men|men-hoa-thach|men-hoang-tho/i.test(`${slug} ${collection}`);

  if ((isNumeric || raw.length < 3) && index !== null && looksAltar) {
    const piece = ALTAR_PIECES[(index - 1) % ALTAR_PIECES.length];
    const glaze = glazeShort('', collection);
    return `${piece} ${glaze}`.replace(/\s+/g, ' ').trim();
  }
  if ((isNumeric || raw.length < 3) && collection) {
    return index ? `${collection} · Món ${index}` : collection;
  }
  return raw || collection || slug;
}

function buildDescription(input: {
  name: string;
  collection: string;
  type: string;
  glaze: string;
}): string {
  const { name, collection, type, glaze } = input;
  const glazeLine = glaze
    ? `${glaze} được phủ qua nhiều lớp, giữ độ sâu màu và vân men tự nhiên sau nung.`
    : 'Lớp men thủ công giữ độ sâu màu và cảm giác chạm tay mịn sau nung.';
  const use =
    /thờ/i.test(`${type} ${collection}`)
      ? 'Phù hợp không gian thờ cúng trang trọng hoặc góc trưng bày heritage.'
      : /trà/i.test(`${type} ${collection} ${name}`)
        ? 'Phù hợp bàn trà, kệ console hoặc góc thiền cần sự tĩnh lặng.'
        : 'Phù hợp phòng khách, sảnh đón hoặc góc trưng bày cần điểm nhấn gốm sứ.';

  return `${name} thuộc dòng ${collection || 'Gốm Hoa Sen'}${
    type ? ` — ${type}` : ''
  }. ${glazeLine} ${use} Mỗi tác phẩm được hoàn thiện thủ công tại xưởng, kiểm tra men và dáng trước khi bàn giao.`;
}

function buildStory(input: {
  name: string;
  collection: string;
  glaze: string;
  description: string;
  poster?: string;
}) {
  const { name, collection, glaze, description, poster } = input;
  return {
    title: `Câu chuyện ${name}`,
    subtitle: glaze || collection || 'Thủ công gốm sứ',
    content: `${description}\n\nNghệ nhân Gốm Hoa Sen giữ nhịp tay chậm ở khâu chuốt dáng và phủ men — để mỗi chiếc mang một chút khác biệt tự nhiên thay vì cảm giác đúc khuôn hàng loạt. ${
      glaze ? `Dòng ${glaze} ` : ''
    }gợi chất liệu đất, lửa và thời gian: đúng tinh thần gốm Việt đương đại cho không gian sống và thờ tự.`,
    image: poster || LOTUS_MARK,
  };
}

function buildSpecs(input: {
  name: string;
  collection: string;
  type: string;
  glaze: string;
}): Record<string, string> {
  return {
    'Bộ sưu tập': input.collection || 'Gốm Hoa Sen',
    'Loại hình': input.type || 'Gốm sứ thủ công',
    'Dòng men': input.glaze || 'Men thủ công',
    'Chất liệu': 'Sứ cao cấp / đất gốm tuyển chọn',
    'Kỹ thuật': 'Tạo hình thủ công, phủ men, nung lò',
    'Xuất xứ': 'Bát Tràng & xưởng đối tác Gốm Hoa Sen',
    'Hoàn thiện': 'Kiểm tra men, dáng và bề mặt trước bàn giao',
    'Bảo quản': 'Lau khô khăn mềm, tránh va đập và nhiệt đột ngột',
  };
}

function hotspotCount(sections: EnrichInput['viewSections']): number {
  if (!sections?.length) return 0;
  return sections.reduce((sum, s) => sum + (s.hotspots?.length ?? 0), 0);
}

function buildDefaultViewSections(input: {
  name: string;
  collection: string;
  glaze: string;
  type: string;
  description: string;
  image?: string;
}) {
  const { name, collection, glaze, type, description, image } = input;
  const panelImage = image || LOTUS_MARK;
  const glazeTitle = glaze || 'Lớp men';
  const motifTitle = /thờ/i.test(`${type} ${collection}`)
    ? 'Dáng thờ & cân đối'
    : /trà|chén|khay/i.test(`${type} ${name}`)
      ? 'Dáng trà & cầm tay'
      : 'Họa tiết & đường nét';

  return [
    {
      id: 'overview',
      name: 'Tổng quan',
      icon: '🪷',
      camera: { orbit: '30deg 75deg 0.5m', target: '0m 0.1m 0m' },
      description,
      hotspots: [
        {
          id: 'hs-glaze',
          position: '0m 0.12m 0.05m',
          normal: '0 1 0',
          label: glazeTitle,
          panel: {
            title: glazeTitle,
            content: `${
              glaze || 'Lớp men'
            } trên ${name} được phủ nhiều lượt để tạo chiều sâu. Ánh sáng chiếu nghiêng sẽ lộ vân men, độ bóng và sắc chuyển — đặc trưng của gốm nung thủ công, không đồng nhất máy móc.`,
            image: panelImage,
          },
        },
        {
          id: 'hs-form',
          position: '0.04m 0.08m 0m',
          normal: '1 0 0',
          label: motifTitle,
          panel: {
            title: motifTitle,
            content: `Dáng ${name} được chuốt để cân với ${
              collection || 'không gian trưng bày'
            }. Đường miệng, thân và chân giữ nhịp thanh — nhìn tổng thể trang trọng nhưng vẫn mềm khi đặt cạnh gỗ, đá hoặc bàn trà.`,
            image: panelImage,
          },
        },
        {
          id: 'hs-craft',
          position: '-0.02m 0.02m 0.04m',
          normal: '0 0 1',
          label: 'Thủ công & hoàn thiện',
          panel: {
            title: 'Thủ công & hoàn thiện',
            content:
              'Từ tạo hình, phủ men đến kiểm tra sau lò, mỗi bước đều có tay nghề. Gốm Hoa Sen ưu tiên lô nhỏ: giữ dấu ấn nghệ nhân, kiểm soát men nứt/rạn có chủ đích và bàn giao khi bề mặt đã ổn định.',
            image: LOTUS_MARK,
          },
        },
      ],
    },
  ];
}

export function enrichListingProductFields(input: {
  name: string;
  collection: string;
  slug: string;
  type: string;
  glaze: string;
  description: string;
}): { name: string; desc: string } {
  const name = resolveProductDisplayName(input.name, input.collection, input.slug);
  const desc =
    trim(input.description).length >= 40
      ? trim(input.description)
      : buildDescription({
          name,
          collection: input.collection,
          type: input.type,
          glaze: input.glaze,
        });
  return { name, desc };
}

export function enrichProductDetail<T extends EnrichInput>(product: T): T {
  const slug = trim(product.slug);
  const collection = trim(product.collection);
  const type = trim(product.type);
  const glaze = trim(product.glaze);
  const name = resolveProductDisplayName(trim(product.name), collection, slug);
  const description =
    trim(product.description).length >= 40
      ? trim(product.description)
      : buildDescription({ name, collection, type, glaze });

  const poster = trim(product.poster) || trim(product.images?.[0]);
  const existingStory = product.story;
  const storyContent = trim(existingStory?.content);
  const story =
    storyContent.length >= 80
      ? {
          title: trim(existingStory?.title) || `Câu chuyện ${name}`,
          subtitle: trim(existingStory?.subtitle) || glaze || collection,
          content: storyContent,
          image: trim(existingStory?.image) || poster || LOTUS_MARK,
        }
      : buildStory({ name, collection, glaze, description, poster });

  const existingSpecs = product.specs && typeof product.specs === 'object' ? product.specs : null;
  const specs =
    existingSpecs && Object.keys(existingSpecs).length >= 3
      ? existingSpecs
      : buildSpecs({ name, collection, type, glaze });

  const viewSections =
    hotspotCount(product.viewSections) > 0
      ? product.viewSections
      : buildDefaultViewSections({
          name,
          collection,
          glaze,
          type,
          description,
          image: poster,
        });

  const firstSentence = description.split(/(?<=[.!?…])\s+/)[0]?.trim() || '';
  const tagline =
    trim(product.tagline).length > 12
      ? trim(product.tagline)
      : firstSentence || [collection, glaze].filter(Boolean).join(' • ');

  return {
    ...product,
    name,
    description,
    tagline,
    story,
    specs,
    viewSections,
  };
}
