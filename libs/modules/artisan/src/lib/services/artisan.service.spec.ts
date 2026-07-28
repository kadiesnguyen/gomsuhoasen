// Task card: R2-007T
// Ref read:
// - /Users/bonbon177tb/Documents/zalominiapp/v2/libs/catalog/src/lib/services/brand.service.spec.ts
// Kept: focused mocked-model service tests, error code assertions
// Dropped: multi-org context and permission matrix
// Adapted: artisan slug immutable, collision, active-only detail, soft-delete behavior

import { HttpException } from '@nestjs/common';
import { getMongooseSchemaPathDefault } from '@vt/platform-mongoose';
import { buildInitialArtisanValues } from '../constants/artisan-writer-initial-values';
import { ArtisanSchema } from '../schemas/artisan.schema';
import { ArtisanService } from './artisan.service';
import { ARTISAN_ERRORS } from '../constants/artisan.constants';
import { ARTISAN_STATUSES } from '@gomhoasen/contracts';

describe('ArtisanService', () => {
  function createService() {
    const model = {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      findOneAndUpdate: jest.fn(),
    };

    return {
      model,
      service: new ArtisanService(model as never),
    };
  }

  describe('schema initial values', () => {
    it('keeps artisan initial values out of schema defaults', () => {
      expect(getMongooseSchemaPathDefault(ArtisanSchema, 'certifications')).toBeUndefined();
      expect(getMongooseSchemaPathDefault(ArtisanSchema, 'sortOrder')).toBeUndefined();
      expect(getMongooseSchemaPathDefault(ArtisanSchema, 'status')).toBeUndefined();
      expect(getMongooseSchemaPathDefault(ArtisanSchema, 'isDeleted')).toBeUndefined();
    });

    it('centralizes artisan writer initial values explicitly', () => {
      expect(buildInitialArtisanValues({
        name: 'Artisan A',
        slug: 'artisan-a',
      })).toMatchObject({
        certifications: [],
        sortOrder: 0,
        status: ARTISAN_STATUSES.ACTIVE,
        isDeleted: false,
      });
    });
  });

  it('creates an artisan with a generated Vietnamese slug', async () => {
    const { service, model } = createService();
    model.findOne.mockResolvedValue(null);
    model.create.mockResolvedValue({ name: 'Nghệ Nhân Đỗ Thị Bảy', slug: 'nghe-nhan-do-thi-bay' });

    const result = await service.create({ name: 'Nghệ Nhân Đỗ Thị Bảy', slug: '   ' });

    expect(model.findOne).toHaveBeenCalledWith({ slug: 'nghe-nhan-do-thi-bay', isDeleted: false });
    expect(model.create).toHaveBeenCalledWith(expect.objectContaining({
      name: 'Nghệ Nhân Đỗ Thị Bảy',
      slug: 'nghe-nhan-do-thi-bay',
      certifications: [],
      sortOrder: 0,
      status: ARTISAN_STATUSES.ACTIVE,
      isDeleted: false,
    }));
    expect(result.slug).toBe('nghe-nhan-do-thi-bay');
  });

  it('trims explicit artisan slug before checking uniqueness', async () => {
    const { service, model } = createService();
    model.findOne.mockResolvedValue(null);
    model.create.mockResolvedValue({ name: 'Artisan A', slug: 'artisan-a' });

    await service.create({ name: 'Artisan A', slug: '  artisan-a  ' });

    expect(model.findOne).toHaveBeenCalledWith({ slug: 'artisan-a', isDeleted: false });
    expect(model.create).toHaveBeenCalledWith(expect.objectContaining({
      slug: 'artisan-a',
    }));
  });

  it('returns ART_SLUG_DUPLICATE when slug collides on create', async () => {
    const { service, model } = createService();
    model.findOne.mockResolvedValue({ _id: 'existing', slug: 'nghe-nhan-a' });

    await expect(service.create({ name: 'Nghệ Nhân A', slug: 'nghe-nhan-a' }))
      .rejects.toMatchObject({
        response: expect.objectContaining({
          code: ARTISAN_ERRORS.ART_SLUG_DUPLICATE,
        }),
      });
  });

  it('returns ART_SLUG_IMMUTABLE when update payload contains slug', async () => {
    const { service } = createService();

    await expect(service.update('artisan-1', { slug: 'new-slug' } as never))
      .rejects.toMatchObject({
        response: expect.objectContaining({
          code: ARTISAN_ERRORS.ART_SLUG_IMMUTABLE,
        }),
      });
  });

  it('returns ART_SLUG_IMMUTABLE as BadRequestException', async () => {
    const { service } = createService();

    await expect(service.update('artisan-1', { slug: 'any' } as never))
      .rejects.toBeInstanceOf(HttpException);
  });

  it('throws not found with ART_NOT_FOUND when active public slug is missing', async () => {
    const { service, model } = createService();
    model.findOne.mockResolvedValue(null);

    await expect(service.findActiveBySlug('missing')).rejects.toMatchObject({
      response: expect.objectContaining({
        code: ARTISAN_ERRORS.ART_NOT_FOUND,
      }),
    });
    expect(model.findOne).toHaveBeenCalledWith({ slug: 'missing', status: ARTISAN_STATUSES.ACTIVE, isDeleted: false });
  });

  it('soft deletes by setting isDeleted and deletedAt', async () => {
    const { service, model } = createService();
    model.findOneAndUpdate.mockResolvedValue({ _id: 'artisan-1', isDeleted: true });

    const result = await service.softDelete('artisan-1');

    expect(model.findOneAndUpdate).toHaveBeenCalledWith(
      { _id: 'artisan-1', isDeleted: false },
      { $set: { isDeleted: true, deletedAt: expect.any(Date) } },
      { returnDocument: 'after' },
    );
    expect(result).toEqual({ deleted: true, id: 'artisan-1' });
  });
});
