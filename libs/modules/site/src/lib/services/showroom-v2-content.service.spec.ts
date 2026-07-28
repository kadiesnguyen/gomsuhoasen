import { Test, type TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { createShowroomV2DefaultContent } from '@gomhoasen/contracts';
import { ShowroomV2Content } from '../schemas/showroom-v2-content.schema';
import { ShowroomV2ContentService } from './showroom-v2-content.service';

function contentDocument(value: unknown) {
  return { toObject: () => value };
}

describe('ShowroomV2ContentService', () => {
  let service: ShowroomV2ContentService;
  let mockModel: {
    findOne: jest.Mock;
    findOneAndUpdate: jest.Mock;
    create: jest.Mock;
  };

  beforeEach(async () => {
    mockModel = {
      findOne: jest.fn(),
      findOneAndUpdate: jest.fn(),
      create: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ShowroomV2ContentService,
        {
          provide: getModelToken(ShowroomV2Content.name),
          useValue: mockModel,
        },
      ],
    }).compile();

    service = module.get(ShowroomV2ContentService);
  });

  it('creates and returns complete defaults when the singleton is missing', async () => {
    const defaults = createShowroomV2DefaultContent();
    mockModel.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });
    mockModel.create.mockResolvedValue(contentDocument(defaults));

    const result = await service.getContent();

    expect(mockModel.create).toHaveBeenCalledWith(expect.objectContaining({
      key: 'singleton_v2_content',
      contentVersion: 4,
      brand: defaults.brand,
    }));
    expect(result.home.heroTitle).toBe(defaults.home.heroTitle);
    expect(result.productsLanding.categories).toHaveLength(defaults.productsLanding.categories.length);
  });

  it('fills missing legacy fields without replacing intentionally empty values', async () => {
    const defaults = createShowroomV2DefaultContent();
    mockModel.findOne.mockReturnValue({
      exec: jest.fn().mockResolvedValue(contentDocument({
        key: 'singleton_v2_content',
        contentVersion: 4,
        brand: { name: '' },
        home: { heroTitle: '', collections: [] },
        newsLanding: { newsCards: [] },
      })),
    });

    const result = await service.getContent();

    expect(result.brand.name).toBe('');
    expect(result.brand.tagline).toBe(defaults.brand.tagline);
    expect(result.home.heroTitle).toBe('');
    expect(result.home.heroSubtitle).toBe(defaults.home.heroSubtitle);
    expect(result.home.collections).toEqual([]);
    expect(result.newsLanding.newsCards).toEqual([]);
  });

  it('migrates the empty legacy production placeholder exactly once', async () => {
    const defaults = createShowroomV2DefaultContent();
    const placeholder = contentDocument({
      key: 'singleton_v2_content',
      contentVersion: null,
      home: { collections: [], process: [], promises: [] },
      about: { elements: [] },
      collections: { rows: { row1: [], row2: [], row3: [] } },
      productsLanding: { categories: [], productFeatures: [], trustBadges: [] },
      newsLanding: { newsCards: [] },
      contact: {},
    });
    mockModel.findOne.mockReturnValue({
      exec: jest.fn().mockResolvedValue(placeholder),
    });
    mockModel.findOneAndUpdate.mockReturnValue({
      exec: jest.fn().mockResolvedValue(contentDocument({
        key: 'singleton_v2_content',
        contentVersion: 4,
        ...defaults,
      })),
    });

    const result = await service.getContent();

    expect(mockModel.findOneAndUpdate).toHaveBeenCalledWith(
      {
        key: 'singleton_v2_content',
        $or: [
          { contentVersion: { $exists: false } },
          { contentVersion: null },
        ],
      },
      {
        $set: expect.objectContaining({
          contentVersion: 4,
          brand: defaults.brand,
        }),
      },
      { returnDocument: 'after' },
    );
    expect(result.home.collections).toHaveLength(defaults.home.collections.length);
    expect(result.newsLanding.newsCards).toHaveLength(defaults.newsLanding.newsCards.length);
  });

  it('upgrades version 1 content with detail fields and actionable links without replacing edited copy', async () => {
    const defaults = createShowroomV2DefaultContent();
    const versionOne = {
      ...defaults,
      contentVersion: 1,
      brand: { ...defaults.brand, name: 'Tên đã chỉnh' },
      collections: {
        ...defaults.collections,
        rows: {
          ...defaults.collections.rows,
          row1: defaults.collections.rows.row1.map(({ href: _href, ...item }) => item),
        },
      },
      productsLanding: {
        ...defaults.productsLanding,
        categories: defaults.productsLanding.categories.map((item) => ({
          ...item,
          href: '/danh-muc',
        })),
      },
      newsLanding: {
        ...defaults.newsLanding,
        newsCards: defaults.newsLanding.newsCards?.map(
          ({ slug: _slug, author: _author, readingTime: _readingTime, content: _content, ...item }) => item,
        ),
      },
    };
    mockModel.findOne.mockReturnValue({
      exec: jest.fn().mockResolvedValue(contentDocument(versionOne)),
    });
    mockModel.findOneAndUpdate.mockImplementation((_filter, update) => ({
      exec: jest.fn().mockResolvedValue(contentDocument(update.$set)),
    }));

    const result = await service.getContent();

    expect(mockModel.findOneAndUpdate).toHaveBeenCalledWith(
      { key: 'singleton_v2_content', contentVersion: 1 },
      { $set: expect.objectContaining({ contentVersion: 4 }) },
      { returnDocument: 'after' },
    );
    expect(result.brand.name).toBe('Tên đã chỉnh');
    expect(result.collections.rows.row1[0].href).toContain('collection=');
    expect(result.productsLanding.categories[0].href).toBe('/danh-muc');
    expect(result.newsLanding.newsCards?.[0].slug).toBeTruthy();
    expect(result.newsLanding.newsCards?.[0].content).toBeTruthy();
  });

  it('upgrades version 2 production content with global navigation, 404 copy, and complete custom articles', async () => {
    const defaults = createShowroomV2DefaultContent();
    const versionTwo = {
      ...defaults,
      contentVersion: 2,
      about: {
        ...defaults.about,
        quoteBg: '/assets/about/about-quote.jpg',
      },
      navigation: undefined,
      notFound: undefined,
      newsLanding: {
        ...defaults.newsLanding,
        featuredId: 'custom-story',
        newsCards: [
          {
            id: 'custom-story',
            category: 'Làng nghề',
            date: '26.07.2026',
            title: 'Câu chuyện mới',
            excerpt: 'Nội dung tóm tắt do biên tập viên tạo.',
            image: '/assets/news/news-1.jpg',
          },
        ],
      },
    };
    mockModel.findOne.mockReturnValue({
      exec: jest.fn().mockResolvedValue(contentDocument(versionTwo)),
    });
    mockModel.findOneAndUpdate.mockImplementation((_filter, update) => ({
      exec: jest.fn().mockResolvedValue(contentDocument(update.$set)),
    }));

    const result = await service.getContent();

    expect(mockModel.findOneAndUpdate).toHaveBeenCalledWith(
      { key: 'singleton_v2_content', contentVersion: 2 },
      { $set: expect.objectContaining({ contentVersion: 4 }) },
      { returnDocument: 'after' },
    );
    expect(result.navigation.items.length).toBeGreaterThan(0);
    expect(result.notFound.title).toBeTruthy();
    expect(result.about.quoteBg).toBe('/assets/about/about-hon.jpg');
    expect(result.newsLanding.newsCards?.[0]).toEqual(expect.objectContaining({
      slug: expect.any(String),
      author: expect.any(String),
      readingTime: expect.any(String),
      content: expect.any(String),
    }));
  });

  it('upgrades version 3 default article dates without replacing an editor date', async () => {
    const defaults = createShowroomV2DefaultContent();
    const versionThree = {
      ...defaults,
      contentVersion: 3,
      newsLanding: {
        ...defaults.newsLanding,
        newsCards: defaults.newsLanding.newsCards?.map((item) => ({
          ...item,
          date: item.id === 'n1' ? 'Ngày do biên tập viên đặt' : {
            hero: '15 THG 11, 2026',
            n2: '05 THG 11, 2026',
            n3: '28 THG 10, 2026',
            n4: '20 THG 10, 2026',
            n5: '12 THG 10, 2026',
            n6: '01 THG 10, 2026',
          }[item.id] ?? item.date,
        })),
      },
    };
    mockModel.findOne.mockReturnValue({
      exec: jest.fn().mockResolvedValue(contentDocument(versionThree)),
    });
    mockModel.findOneAndUpdate.mockImplementation((_filter, update) => ({
      exec: jest.fn().mockResolvedValue(contentDocument(update.$set)),
    }));

    const result = await service.getContent();

    expect(mockModel.findOneAndUpdate).toHaveBeenCalledWith(
      { key: 'singleton_v2_content', contentVersion: 3 },
      { $set: expect.objectContaining({ contentVersion: 4 }) },
      { returnDocument: 'after' },
    );
    expect(result.newsLanding.newsCards?.find((item) => item.id === 'hero')?.date)
      .toBe(defaults.newsLanding.newsCards?.find((item) => item.id === 'hero')?.date);
    expect(result.newsLanding.newsCards?.find((item) => item.id === 'n1')?.date)
      .toBe('Ngày do biên tập viên đặt');
  });

  it('persists normalized content while preserving cleared collections', async () => {
    const defaults = createShowroomV2DefaultContent();
    const input = {
      ...defaults,
      home: {
        ...defaults.home,
        heroTitle: '',
        collections: [],
      },
    };
    mockModel.findOneAndUpdate.mockReturnValue({
      exec: jest.fn().mockResolvedValue(contentDocument(input)),
    });

    const result = await service.updateContent(input);

    const update = mockModel.findOneAndUpdate.mock.calls[0][1].$set;
    expect(update.contentVersion).toBe(4);
    expect(update.home.heroTitle).toBe('');
    expect(update.home.collections).toEqual([]);
    expect(result.home.collections).toEqual([]);
  });
});
