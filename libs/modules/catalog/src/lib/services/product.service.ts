// Refs read: v2/libs/catalog/src/lib/services/product.service.ts
// Kept: find/list/findBySlug/soft-delete patterns
// Dropped: multi-org filter, outbox, field projection, profile binding
// Adapted: error code objects, slug immutable guard

import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, QueryFilter, UpdateQuery } from 'mongoose';
import {
  DomainBadRequestException,
  DomainConflictException,
  DomainNotFoundException,
} from '@vt/platform-error';
import { Product, ProductDocument, ProductStatus } from '../schemas/product.schema';
import { CreateProductDto, UpdateProductDto } from '../dto/product.dto';
import { CATALOG_ERRORS } from '../constants/catalog.constants';
import { buildInitialProductValues } from '../constants/product-writer-initial-values';
import { readSlugOrGenerate } from '@gomhoasen/contracts';
import { CategoryService } from './category.service';

@Injectable()
export class ProductService {
  constructor(
    @InjectModel(Product.name) private productModel: Model<Product, {}, {}, {}, ProductDocument>,
    private readonly categoryService: CategoryService,
  ) {}

  async findAll(query: { status?: ProductStatus; search?: string; collection?: string }) {
    const filter: QueryFilter<Product> = { isDeleted: false };
    if (query.status) filter.status = query.status;
    if (query.collection) filter.collection = query.collection;
    if (query.search) filter.$text = { $search: query.search };

    return this.productModel.find(filter).sort({ sortOrder: 1, createdAt: -1 });
  }

  async findBySlug(slug: string) {
    const product = await this.productModel.findOne({ slug, isDeleted: false });
    if (!product) throw new DomainNotFoundException(CATALOG_ERRORS.CAT_NOT_FOUND, 'Sản phẩm không tồn tại');
    return product;
  }

  async findActiveBySlug(slug: string) {
    const product = await this.productModel.findOne({ slug, status: ProductStatus.ACTIVE, isDeleted: false });
    if (!product) throw new DomainNotFoundException(CATALOG_ERRORS.CAT_NOT_FOUND, 'Sản phẩm không tồn tại');
    return product;
  }

  async findById(id: string) {
    const product = await this.productModel.findOne({ _id: id, isDeleted: false });
    if (!product) throw new DomainNotFoundException(CATALOG_ERRORS.CAT_NOT_FOUND, 'Sản phẩm không tồn tại');
    return product;
  }

  async create(dto: CreateProductDto) {
    const slug = readSlugOrGenerate(dto.slug, dto.name);
    await this.assertSlugAvailable(slug);
    const resolved = await this.resolveCollectionFields(dto);
    return this.productModel.create(buildInitialProductValues({ ...resolved, slug }));
  }

  async update(id: string, dto: UpdateProductDto) {
    // Slug immutable guard — ported from Zalo BrandService
    if (Object.prototype.hasOwnProperty.call(dto, 'slug')) {
      throw new DomainBadRequestException(CATALOG_ERRORS.CAT_SLUG_IMMUTABLE, 'Slug sản phẩm không thể thay đổi sau khi tạo.');
    }

    const resolved = await this.resolveCollectionFields(dto);
    const updateData: UpdateQuery<ProductDocument> = { ...resolved };
    const product = await this.productModel.findOneAndUpdate(
      { _id: id, isDeleted: false },
      { $set: updateData },
      { returnDocument: 'after' },
    );
    if (!product) throw new DomainNotFoundException(CATALOG_ERRORS.CAT_NOT_FOUND, 'Sản phẩm không tồn tại');
    return product;
  }

  async softDelete(id: string) {
    const product = await this.productModel.findOneAndUpdate(
      { _id: id, isDeleted: false },
      { $set: { isDeleted: true, deletedAt: new Date() } },
      { returnDocument: 'after' },
    );
    if (!product) throw new DomainNotFoundException(CATALOG_ERRORS.CAT_NOT_FOUND, 'Sản phẩm không tồn tại');
    return { deleted: true, id };
  }

  async addImage(id: string, path: string) {
    const product = await this.productModel.findOneAndUpdate(
      { _id: id, isDeleted: false },
      { $addToSet: { images: path } },
      { returnDocument: 'after' },
    );
    if (!product) throw new DomainNotFoundException(CATALOG_ERRORS.CAT_NOT_FOUND, 'Sản phẩm không tồn tại');
    return product;
  }

  async removeImage(id: string, path: string) {
    const product = await this.productModel.findOneAndUpdate(
      { _id: id, isDeleted: false },
      { $pull: { images: path } },
      { returnDocument: 'after' },
    );
    if (!product) throw new DomainNotFoundException(CATALOG_ERRORS.CAT_NOT_FOUND, 'Sản phẩm không tồn tại');
    return product;
  }

  async setModel(id: string, path: string | null) {
    const product = await this.productModel.findOneAndUpdate(
      { _id: id, isDeleted: false },
      { $set: { modelUrl: path } },
      { returnDocument: 'after' },
    );
    if (!product) throw new DomainNotFoundException(CATALOG_ERRORS.CAT_NOT_FOUND, 'Sản phẩm không tồn tại');
    return product;
  }

  async setVideo360(id: string, path: string | null) {
    const product = await this.productModel.findOneAndUpdate(
      { _id: id, isDeleted: false },
      { $set: { video360Url: path } },
      { returnDocument: 'after' },
    );
    if (!product) throw new DomainNotFoundException(CATALOG_ERRORS.CAT_NOT_FOUND, 'Sản phẩm không tồn tại');
    return product;
  }

  private async resolveCollectionFields<T extends CreateProductDto | UpdateProductDto>(dto: T): Promise<T> {
    if (!dto.collectionId) return dto;
    const category = await this.categoryService.findById(dto.collectionId);
    return { ...dto, collection: category.name };
  }

  private async assertSlugAvailable(slug: string, excludeId?: string) {
    const filter: QueryFilter<Product> = { slug, isDeleted: false };
    if (excludeId) filter._id = { $ne: excludeId as never };
    const existing = await this.productModel.findOne(filter);
    if (existing) {
      throw new DomainConflictException(CATALOG_ERRORS.CAT_SLUG_DUPLICATE, 'Slug sản phẩm đã tồn tại', { slug });
    }
  }
}
