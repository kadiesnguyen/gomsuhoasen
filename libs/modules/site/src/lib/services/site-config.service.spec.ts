import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { getMongooseSchemaPathDefault } from '@vt/platform-mongoose';
import { SiteConfigService } from './site-config.service';
import { UpdateSiteConfigDto } from '../dto/site-config.dto';
import {
  SITE_CONFIG_SINGLETON_KEY,
  buildInitialSiteConfigValues,
  buildSiteConfigSetOnInsert,
  buildSiteConfigUpdateSet,
} from '../constants/site-config-writer-initial-values';
import { SiteConfig, SiteConfigSchema } from '../schemas/site-config.schema';

describe('SiteConfigService', () => {
  let service: SiteConfigService;
  let mockModel: {
    findOne: jest.Mock;
    findOneAndUpdate: jest.Mock;
    create: jest.Mock;
  };

  beforeEach(async () => {
    mockModel = {
      findOne: jest.fn().mockResolvedValue({ brandName: 'Test Brand' }),
      findOneAndUpdate: jest.fn().mockResolvedValue({ brandName: 'Updated Brand' }),
      create: jest.fn().mockResolvedValue({ brandName: 'GỐM HOA SEN' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SiteConfigService,
        {
          provide: getModelToken(SiteConfig.name),
          useValue: mockModel,
        },
      ],
    }).compile();

    service = module.get<SiteConfigService>(SiteConfigService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should get config', async () => {
    const result = await service.getConfig();
    expect(mockModel.findOne).toHaveBeenCalledWith({ key: SITE_CONFIG_SINGLETON_KEY });
    expect(result.brandName).toBe('Test Brand');
  });

  describe('schema initial values', () => {
    it('keeps site-config initial values out of schema defaults', () => {
      expect(getMongooseSchemaPathDefault(SiteConfigSchema, 'key')).toBeUndefined();
      expect(getMongooseSchemaPathDefault(SiteConfigSchema, 'contact')).toBeUndefined();
      expect(getMongooseSchemaPathDefault(SiteConfigSchema, 'social')).toBeUndefined();
      expect(getMongooseSchemaPathDefault(SiteConfigSchema, 'seo')).toBeUndefined();
      expect(getMongooseSchemaPathDefault(SiteConfigSchema, 'collections')).toBeUndefined();
      expect(getMongooseSchemaPathDefault(SiteConfigSchema, 'occasions')).toBeUndefined();
      expect(getMongooseSchemaPathDefault(SiteConfigSchema, 'journal')).toBeUndefined();
      expect(getMongooseSchemaPathDefault(SiteConfigSchema, 'filters')).toBeUndefined();
    });

    it('centralizes site-config singleton initial values explicitly', () => {
      const values = buildInitialSiteConfigValues({
        brandName: 'Gom Hoa Sen',
        collections: [{ id: 'lotus', name: 'Lotus' }],
        filters: { types: [{ id: 'vase', name: 'Vase' }] },
      });

      expect(values).toMatchObject({
        key: SITE_CONFIG_SINGLETON_KEY,
        brandName: 'Gom Hoa Sen',
        contact: {},
        social: {},
        seo: {},
        occasions: [],
        journal: [],
        filters: {
          types: [{ id: 'vase', name: 'Vase' }],
          glazes: [],
          priceRanges: [],
        },
      });
      expect(values.collections[0]).toMatchObject({ id: 'lotus', name: 'Lotus', count: 0 });
    });

    it('builds insert defaults without conflicting with updated fields', () => {
      const updateSet = buildSiteConfigUpdateSet({
        tagline: 'Tinh hoa men Viet',
        contact: { email: 'info@gomhoasen.vn' },
        collections: [{ id: 'lotus', name: 'Lotus' }],
      });
      const setOnInsert = buildSiteConfigSetOnInsert({ brandName: 'Gom Hoa Sen' }, updateSet);

      expect(updateSet.collections?.[0]).toMatchObject({ count: 0 });
      expect(setOnInsert).toMatchObject({
        key: SITE_CONFIG_SINGLETON_KEY,
        brandName: 'Gom Hoa Sen',
        social: {},
        seo: {},
      });
      expect(setOnInsert).not.toHaveProperty('tagline');
      expect(setOnInsert).not.toHaveProperty('contact');
      expect(setOnInsert).not.toHaveProperty('collections');
    });
  });

  it('should update config', async () => {
    const dto: UpdateSiteConfigDto = { brandName: 'Updated Brand' };
    const result = await service.updateConfig(dto);

    expect(mockModel.findOneAndUpdate).toHaveBeenCalled();
    expect(result.brandName).toBe('Updated Brand');
  });

  it('[SIT-002] forces the singleton key when updating config', async () => {
    const dto: UpdateSiteConfigDto = {
      tagline: 'Tinh hoa men Viet',
      contact: { email: 'info@gomhoasen.vn' },
    };

    await service.updateConfig(dto);

    const call = mockModel.findOneAndUpdate.mock.calls[0];
    expect(call[0]).toEqual({ key: SITE_CONFIG_SINGLETON_KEY });
    expect(call[1].$set).toEqual(dto);
    expect(call[1].$setOnInsert).toEqual(expect.objectContaining({
      key: SITE_CONFIG_SINGLETON_KEY,
      brandName: expect.any(String),
      location: expect.any(String),
      subtitle: expect.any(String),
      social: expect.objectContaining({
        facebook: expect.any(String),
      }),
      seo: expect.objectContaining({
        defaultTitle: expect.any(String),
        defaultDescription: expect.any(String),
        ogImage: expect.any(String),
      }),
      collections: [],
      occasions: [],
      journal: [],
      filters: {
        types: [],
        glazes: [],
        priceRanges: [],
      },
    }));
    expect(call[1].$setOnInsert).not.toHaveProperty('tagline');
    expect(call[1].$setOnInsert).not.toHaveProperty('contact');
    expect(call[2]).toEqual({ returnDocument: 'after', upsert: true });
    expect(call[2]).not.toHaveProperty('setDefaultsOnInsert');
  });

  it('[SIT-001] creates default config when singleton does not exist', async () => {
    mockModel.findOne.mockResolvedValueOnce(null);

    const result = await service.getConfig();

    expect(mockModel.create).toHaveBeenCalledWith(expect.objectContaining({
      key: SITE_CONFIG_SINGLETON_KEY,
      brandName: 'GỐM HOA SEN',
    }));
    expect(result.brandName).toBe('GỐM HOA SEN');
  });

  it('[SIT-003] repairs legacy placeholder config when it has never been seeded properly', async () => {
    mockModel.findOne.mockResolvedValueOnce({
      key: SITE_CONFIG_SINGLETON_KEY,
      brandName: 'GỐM HOA SEN',
      tagline: 'Gốm sứ nghệ thuật cho không gian sống hiện đại',
      subtitle: 'Tinh hoa men Việt — Chế tác thủ công — Kể chuyện qua từng đường nét',
      location: 'Bình Dương, Việt Nam',
      contact: {
        phone: '1900 1234 56',
        email: 'info@gomhoasen.vn',
        zaloOA: 'https://zalo.me/0901234567',
        address: 'Bình Dương, Việt Nam',
      },
      collections: [],
      journal: [],
      filters: { types: [], glazes: [], priceRanges: [] },
    });
    mockModel.findOneAndUpdate.mockResolvedValueOnce({
      brandName: 'GỐM HOA SEN',
      location: 'Số 41 Giang Cao, Bát Tràng, Hà Nội',
      contact: { phone: '0961 189 292' },
    });

    const result = await service.getConfig();

    expect(mockModel.findOneAndUpdate).toHaveBeenCalledWith(
      { key: SITE_CONFIG_SINGLETON_KEY },
      expect.objectContaining({
        $set: expect.objectContaining({
          location: 'Số 41 Giang Cao, Bát Tràng, Hà Nội',
          contact: expect.objectContaining({
            phone: '0961 189 292',
          }),
        }),
      }),
      { returnDocument: 'after' },
    );
    expect(result).toMatchObject({
      brandName: 'GỐM HOA SEN',
      location: 'Số 41 Giang Cao, Bát Tràng, Hà Nội',
      contact: { phone: '0961 189 292' },
    });
  });
});
