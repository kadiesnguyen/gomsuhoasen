// Task card: P1-SPEC
// Ref read:
// - /Users/bonbon177tb/Documents/zalominiapp/v2/libs/catalog/src/lib/services/brand.service.spec.ts
// Kept: error code assertions, slug collision, slug immutable guard
// Dropped: tenant context
// Adapted: product domain, Vietnamese messages

import { HttpException } from '@nestjs/common';
import { getMongooseSchemaPathDefault } from '@vt/platform-mongoose';
import { buildInitialProductValues } from '../constants/product-writer-initial-values';
import { ProductSchema, ProductStatus } from '../schemas/product.schema';
import { ProductService } from './product.service';
import { CATALOG_ERRORS } from '../constants/catalog.constants';

describe('ProductService', () => {
  function createService() {
    const model = {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      findOneAndUpdate: jest.fn(),
      findByIdAndUpdate: jest.fn(),
    };
    return { model, service: new ProductService(model as never, { findById: jest.fn() } as never) };
  }

  describe('schema initial values', () => {
    it('keeps product initial values out of schema defaults', () => {
      expect(getMongooseSchemaPathDefault(ProductSchema, 'status')).toBeUndefined();
      expect(getMongooseSchemaPathDefault(ProductSchema, 'referencePrice')).toBeUndefined();
      expect(getMongooseSchemaPathDefault(ProductSchema, 'tags')).toBeUndefined();
      expect(getMongooseSchemaPathDefault(ProductSchema, 'images')).toBeUndefined();
      expect(getMongooseSchemaPathDefault(ProductSchema, 'viewSections')).toBeUndefined();
      expect(getMongooseSchemaPathDefault(ProductSchema, 'variants')).toBeUndefined();
      expect(getMongooseSchemaPathDefault(ProductSchema, 'sortOrder')).toBeUndefined();
      expect(getMongooseSchemaPathDefault(ProductSchema, 'isDeleted')).toBeUndefined();
    });

    it('centralizes product writer initial values explicitly', () => {
      const values = buildInitialProductValues({
        name: 'Product A',
        slug: 'product-a',
        viewSections: [{
          id: 'front',
          name: 'Front',
          icon: 'box',
          camera: { orbit: '0deg', target: '0 0 0' },
        }],
      });

      expect(values).toMatchObject({
        status: ProductStatus.DISPLAY_ONLY,
        referencePrice: 0,
        tags: [],
        images: [],
        variants: [],
        sortOrder: 0,
        isDeleted: false,
      });
      expect(values.viewSections[0].hotspots).toEqual([]);
    });
  });

  it('creates a product with a generated slug', async () => {
    const { service, model } = createService();
    model.findOne.mockResolvedValue(null);
    model.create.mockResolvedValue({ name: 'Bình Hoa Sen', slug: 'binh-hoa-sen' });

    const result = await service.create({ name: 'Bình Hoa Sen', slug: '   ', referencePrice: 500000 } as never);

    expect(model.findOne).toHaveBeenCalledWith({ slug: 'binh-hoa-sen', isDeleted: false });
    expect(model.create).toHaveBeenCalledWith(expect.objectContaining({
      slug: 'binh-hoa-sen',
      status: ProductStatus.DISPLAY_ONLY,
      referencePrice: 500000,
      tags: [],
      images: [],
      viewSections: [],
      variants: [],
      sortOrder: 0,
      isDeleted: false,
    }));
    expect(result.slug).toBe('binh-hoa-sen');
  });

  it('trims explicit product slug before checking uniqueness', async () => {
    const { service, model } = createService();
    model.findOne.mockResolvedValue(null);
    model.create.mockResolvedValue({ name: 'Product A', slug: 'product-a' });

    await service.create({ name: 'Product A', slug: '  product-a  ' } as never);

    expect(model.findOne).toHaveBeenCalledWith({ slug: 'product-a', isDeleted: false });
    expect(model.create).toHaveBeenCalledWith(expect.objectContaining({
      slug: 'product-a',
    }));
  });

  it('returns CAT_SLUG_DUPLICATE when slug collides on create', async () => {
    const { service, model } = createService();
    model.findOne.mockResolvedValue({ _id: 'existing' });

    await expect(service.create({ name: 'Test', slug: 'dup-slug' } as never))
      .rejects.toMatchObject({
        response: expect.objectContaining({
          code: CATALOG_ERRORS.CAT_SLUG_DUPLICATE,
        }),
      });
  });

  it('returns CAT_SLUG_IMMUTABLE when update payload contains slug', async () => {
    const { service } = createService();

    await expect(service.update('product-1', { slug: 'new-slug' } as never))
      .rejects.toMatchObject({
        response: expect.objectContaining({
          code: CATALOG_ERRORS.CAT_SLUG_IMMUTABLE,
        }),
      });
  });

  it('returns CAT_SLUG_IMMUTABLE as BadRequestException', async () => {
    const { service } = createService();

    await expect(service.update('id-1', { slug: 'x' } as never))
      .rejects.toBeInstanceOf(HttpException);
  });

  it('throws CAT_NOT_FOUND when findById returns null', async () => {
    const { service, model } = createService();
    model.findOne.mockResolvedValue(null);

    await expect(service.findById('missing-id')).rejects.toMatchObject({
      response: expect.objectContaining({
        code: CATALOG_ERRORS.CAT_NOT_FOUND,
      }),
    });
  });

  it('soft deletes and returns delete ack', async () => {
    const { service, model } = createService();
    model.findOneAndUpdate.mockResolvedValue({ _id: 'p1', isDeleted: true });

    const result = await service.softDelete('p1');

    expect(model.findOneAndUpdate).toHaveBeenCalledWith(
      { _id: 'p1', isDeleted: false },
      { $set: { isDeleted: true, deletedAt: expect.any(Date) } },
      { returnDocument: 'after' },
    );
    expect(result).toEqual({ deleted: true, id: 'p1' });
  });
});
