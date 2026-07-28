import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import {
  createShowroomV2DefaultContent,
  slugifyVi,
  type ShowroomV2ContentContract,
} from '@gomhoasen/contracts';
import { Model } from 'mongoose';
import { ShowroomV2Content, ShowroomV2ContentDocument } from '../schemas/showroom-v2-content.schema';
import { UpdateShowroomV2ContentDto } from '../dto/showroom-v2-content.dto';

const DEFAULT_CONTENT_KEY = 'singleton_v2_content';
const CURRENT_CONTENT_VERSION = 4;
const VERSION_THREE_NEWS_DATES = new Map<string, string>([
  ['hero', '15 THG 11, 2026'],
  ['n1', '10 THG 11, 2026'],
  ['n2', '05 THG 11, 2026'],
  ['n3', '28 THG 10, 2026'],
  ['n4', '20 THG 10, 2026'],
  ['n5', '12 THG 10, 2026'],
  ['n6', '01 THG 10, 2026'],
]);
const NON_CONTENT_FIELDS = new Set([
  '_id',
  '__v',
  'contentVersion',
  'createdAt',
  'deletedAt',
  'deletedBy',
  'isDeleted',
  'key',
  'updatedAt',
]);

function ensureArray<T>(value: T[] | undefined | null): T[] {
  return Array.isArray(value) ? value : [];
}

function stripSystemFields<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => stripSystemFields(item)) as T;
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([key]) => !['_id', '__v', 'isDeleted', 'deletedAt', 'deletedBy'].includes(key))
        .map(([key, nestedValue]) => [key, stripSystemFields(nestedValue)]),
    ) as T;
  }

  return value;
}

function createDefaultContent(): ShowroomV2ContentContract {
  return createShowroomV2DefaultContent();
}

type ContentItemWithId = { id: string };

function mergeItemsWithDefaults<T extends ContentItemWithId>(
  items: T[],
  defaults: T[],
): T[] {
  return items.map((item, index) => {
    const fallback =
      defaults.find((candidate) => candidate.id === item.id) ??
      defaults[index];
    return fallback ? { ...fallback, ...item } : item;
  });
}

type NewsCard = NonNullable<ShowroomV2ContentContract['newsLanding']['newsCards']>[number];

function normalizeNewsCards(
  items: NewsCard[],
  defaults: NewsCard[],
  brandName: string,
): NewsCard[] {
  const usedSlugs = new Set<string>();
  return mergeItemsWithDefaults(items, defaults).map((item, index) => {
    const fallback = defaults.find((candidate) => candidate.id === item.id) ?? defaults[index];
    const baseSlug =
      (typeof item.slug === 'string' && item.slug.trim()) ||
      slugifyVi(item.title) ||
      `bai-viet-${index + 1}`;
    let slug = baseSlug;
    let duplicateIndex = 2;
    while (usedSlugs.has(slug)) {
      slug = `${baseSlug}-${duplicateIndex}`;
      duplicateIndex += 1;
    }
    usedSlugs.add(slug);

    return {
      ...item,
      slug,
      author:
        (typeof item.author === 'string' && item.author.trim()) ||
        fallback?.author ||
        brandName,
      readingTime:
        (typeof item.readingTime === 'string' && item.readingTime.trim()) ||
        fallback?.readingTime ||
        '3 phút đọc',
      content:
        (typeof item.content === 'string' && item.content.trim()) ||
        fallback?.content ||
        item.excerpt,
    };
  });
}

function hasMeaningfulContent(value: unknown): boolean {
  if (typeof value === 'string') {
    return value.trim().length > 0;
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return true;
  }
  if (Array.isArray(value)) {
    return value.length > 0;
  }
  if (value && typeof value === 'object') {
    return Object.entries(value as Record<string, unknown>).some(
      ([key, nestedValue]) =>
        !NON_CONTENT_FIELDS.has(key) && hasMeaningfulContent(nestedValue),
    );
  }
  return false;
}

function isLegacyPlaceholder(value: unknown): boolean {
  if (!value || typeof value !== 'object') {
    return true;
  }
  const source = value as Record<string, unknown>;
  const contentVersion = source['contentVersion'];
  const hasContentVersion =
    typeof contentVersion === 'number' && contentVersion >= CURRENT_CONTENT_VERSION;
  return !hasContentVersion && !hasMeaningfulContent(source);
}

function normalizeContent(value: unknown): ShowroomV2ContentContract {
  const source = stripSystemFields((value ?? {}) as Partial<ShowroomV2ContentContract>);
  const defaults = createDefaultContent();
  const brand = (source.brand ?? defaults.brand) as Partial<ShowroomV2ContentContract['brand']>;
  const navigation = (source.navigation ?? defaults.navigation) as Partial<ShowroomV2ContentContract['navigation']>;
  const notFound = (source.notFound ?? defaults.notFound) as Partial<ShowroomV2ContentContract['notFound']>;
  const home = (source.home ?? defaults.home) as Partial<ShowroomV2ContentContract['home']>;
  const about = (source.about ?? defaults.about) as Partial<ShowroomV2ContentContract['about']>;
  const collections = (source.collections ?? defaults.collections) as Partial<ShowroomV2ContentContract['collections']>;
  const rows = (collections.rows ?? defaults.collections.rows) as Partial<ShowroomV2ContentContract['collections']['rows']>;
  const productsLanding = (source.productsLanding ?? defaults.productsLanding) as Partial<ShowroomV2ContentContract['productsLanding']>;
  const newsLanding = (source.newsLanding ?? defaults.newsLanding) as Partial<ShowroomV2ContentContract['newsLanding']>;
  const artisans = (source.artisans ?? defaults.artisans) as Partial<ShowroomV2ContentContract['artisans']>;
  const contact = (source.contact ?? defaults.contact) as Partial<ShowroomV2ContentContract['contact']>;
  const catalog = (source.catalog ?? defaults.catalog) as Partial<ShowroomV2ContentContract['catalog']>;

  return {
    brand: {
      ...defaults.brand,
      ...brand,
    },
    navigation: {
      ...defaults.navigation,
      ...navigation,
      items: ensureArray(navigation.items ?? defaults.navigation.items),
    },
    notFound: {
      ...defaults.notFound,
      ...notFound,
    },
    home: {
      ...defaults.home,
      ...home,
      interactionFeatures: ensureArray(home.interactionFeatures ?? defaults.home.interactionFeatures),
      collections: ensureArray(home.collections ?? defaults.home.collections),
      process: ensureArray(home.process ?? defaults.home.process),
      promises: ensureArray(home.promises ?? defaults.home.promises),
    },
    about: {
      ...defaults.about,
      ...about,
      elements: ensureArray(about.elements ?? defaults.about.elements),
    },
    collections: {
      ...defaults.collections,
      ...collections,
      rows: {
        ...defaults.collections.rows,
        ...rows,
        row1: mergeItemsWithDefaults(
          ensureArray(rows.row1 ?? defaults.collections.rows.row1),
          defaults.collections.rows.row1,
        ),
        row2: mergeItemsWithDefaults(
          ensureArray(rows.row2 ?? defaults.collections.rows.row2),
          defaults.collections.rows.row2,
        ),
        row3: mergeItemsWithDefaults(
          ensureArray(rows.row3 ?? defaults.collections.rows.row3),
          defaults.collections.rows.row3,
        ),
      },
    },
    productsLanding: {
      ...defaults.productsLanding,
      ...productsLanding,
      categories: mergeItemsWithDefaults(
        ensureArray(productsLanding.categories ?? defaults.productsLanding.categories),
        defaults.productsLanding.categories,
      ),
      productFeatures: ensureArray(productsLanding.productFeatures ?? defaults.productsLanding.productFeatures),
      trustBadges: ensureArray(productsLanding.trustBadges ?? defaults.productsLanding.trustBadges),
    },
    newsLanding: {
      ...defaults.newsLanding,
      ...newsLanding,
      newsCards: normalizeNewsCards(
        ensureArray(newsLanding.newsCards ?? defaults.newsLanding.newsCards),
        ensureArray(defaults.newsLanding.newsCards),
        (typeof brand.name === 'string' && brand.name.trim()) || defaults.brand.name || 'Gốm Hoa Sen',
      ),
    },
    artisans: {
      ...defaults.artisans,
      ...artisans,
    },
    contact: {
      ...defaults.contact,
      ...contact,
    },
    catalog: {
      ...defaults.catalog,
      ...catalog,
      listingLabels: {
        ...defaults.catalog.listingLabels,
        ...catalog.listingLabels,
      },
      detailLabels: {
        ...defaults.catalog.detailLabels,
        ...catalog.detailLabels,
      },
    },
  };
}

function migrateContent(
  content: ShowroomV2ContentContract,
  fromVersion: number,
): ShowroomV2ContentContract {
  if (fromVersion >= CURRENT_CONTENT_VERSION) return content;

  const defaults = createDefaultContent();
  const defaultCategoryById = new Map(
    defaults.productsLanding.categories.map((item) => [item.id, item]),
  );
  const defaultNewsById = new Map(
    ensureArray(defaults.newsLanding.newsCards).map((item) => [item.id, item]),
  );

  return {
    ...content,
    about: {
      ...content.about,
      quoteBg:
        content.about.quoteBg === '/assets/about/about-quote.jpg'
          ? defaults.about.quoteBg
          : content.about.quoteBg,
    },
    home: {
      ...content.home,
      collections: content.home.collections.map((item, index) => {
        const fallback = defaults.home.collections[index];
        if (
          fallback &&
          item.href === '/bo-suu-tap#collections-grid' &&
          fallback.href !== item.href
        ) {
          return { ...item, href: fallback.href };
        }
        return item;
      }),
    },
    productsLanding: {
      ...content.productsLanding,
      categories: content.productsLanding.categories.map((item) => {
        const fallback = defaultCategoryById.get(item.id);
        if (
          fallback &&
          item.href === '/danh-muc-san-pham' &&
          fallback.href !== item.href
        ) {
          return { ...item, href: fallback.href };
        }
        return item;
      }),
    },
    newsLanding: {
      ...content.newsLanding,
      newsCards: ensureArray(content.newsLanding.newsCards).map((item) => {
        const oldDefaultDate = VERSION_THREE_NEWS_DATES.get(item.id);
        const fallback = defaultNewsById.get(item.id);
        if (
          fromVersion < 4 &&
          fallback &&
          oldDefaultDate &&
          item.date === oldDefaultDate
        ) {
          return { ...item, date: fallback.date };
        }
        return item;
      }),
    },
  };
}

@Injectable()
export class ShowroomV2ContentService {
  private readonly logger = new Logger(ShowroomV2ContentService.name);

  constructor(
    @InjectModel(ShowroomV2Content.name)
    private readonly contentModel: Model<ShowroomV2ContentDocument>,
  ) {}

  async getContent(): Promise<ShowroomV2ContentContract> {
    let doc = await this.contentModel.findOne({ key: DEFAULT_CONTENT_KEY }).exec();
    if (!doc) {
      this.logger.log('Showroom V2 Content not found, creating default...');
      doc = await this.contentModel.create({
        key: DEFAULT_CONTENT_KEY,
        contentVersion: CURRENT_CONTENT_VERSION,
        ...createDefaultContent(),
      });
    } else if (isLegacyPlaceholder(doc.toObject())) {
      this.logger.warn('Migrating empty legacy Showroom V2 Content to approved defaults');
      doc = await this.contentModel
        .findOneAndUpdate(
          {
            key: DEFAULT_CONTENT_KEY,
            $or: [
              { contentVersion: { $exists: false } },
              { contentVersion: null },
            ],
          },
          {
            $set: {
              ...createDefaultContent(),
              contentVersion: CURRENT_CONTENT_VERSION,
            },
          },
          { returnDocument: 'after' },
        )
        .exec() ?? doc;
    } else {
      const current = doc.toObject() as { contentVersion?: number };
      const storedVersion =
        typeof current.contentVersion === 'number' ? current.contentVersion : 0;
      if (storedVersion < CURRENT_CONTENT_VERSION) {
        this.logger.log(
          `Migrating Showroom V2 Content from version ${storedVersion} to ${CURRENT_CONTENT_VERSION}`,
        );
        const migrated = migrateContent(normalizeContent(current), storedVersion);
        const versionFilter = storedVersion === 0
          ? {
              $or: [
                { contentVersion: { $exists: false } },
                { contentVersion: null },
                { contentVersion: 0 },
              ],
            }
          : { contentVersion: storedVersion };
        doc = await this.contentModel
          .findOneAndUpdate(
            { key: DEFAULT_CONTENT_KEY, ...versionFilter },
            {
              $set: {
                ...migrated,
                contentVersion: CURRENT_CONTENT_VERSION,
              },
            },
            { returnDocument: 'after' },
          )
          .exec() ?? doc;
      }
    }
    return normalizeContent(doc.toObject());
  }

  async updateContent(dto: UpdateShowroomV2ContentDto): Promise<ShowroomV2ContentContract> {
    const normalized = normalizeContent(dto);
    const doc = await this.contentModel
      .findOneAndUpdate(
        { key: DEFAULT_CONTENT_KEY },
        {
          $set: {
            ...normalized,
            contentVersion: CURRENT_CONTENT_VERSION,
          },
        },
        { returnDocument: 'after', upsert: true, setDefaultsOnInsert: true },
      )
      .exec();
    this.logger.log('Showroom V2 Content updated');
    return normalizeContent(doc?.toObject());
  }
}
