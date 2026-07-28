import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, QueryFilter, UpdateQuery } from 'mongoose';
import {
  DomainBadRequestException,
  DomainConflictException,
  DomainNotFoundException,
} from '@vt/platform-error';
import { readSlugOrGenerate } from '@gomhoasen/contracts';
import { CATALOG_ERRORS } from '../constants/catalog.constants';
import { buildInitialCategoryValues } from '../constants/category-writer-initial-values';
import { CreateCategoryDto, UpdateCategoryDto } from '../dto/category.dto';
import { Category, CategoryDocument } from '../schemas/category.schema';

@Injectable()
export class CategoryService {
  constructor(@InjectModel(Category.name) private categoryModel: Model<CategoryDocument>) {}

  async findAll(query: { search?: string }) {
    const filter: QueryFilter<CategoryDocument> = { isDeleted: false };
    if (query.search) filter.$text = { $search: query.search };
    return this.categoryModel.find(filter).sort({ sortOrder: 1, createdAt: -1 });
  }

  async findById(id: string) {
    const doc = await this.categoryModel.findOne({ _id: id, isDeleted: false });
    if (!doc) throw new DomainNotFoundException(CATALOG_ERRORS.CATEGORY_NOT_FOUND, 'Danh mục không tồn tại');
    return doc;
  }

  async findBySlug(slug: string) {
    const doc = await this.categoryModel.findOne({ slug, isDeleted: false });
    if (!doc) throw new DomainNotFoundException(CATALOG_ERRORS.CATEGORY_NOT_FOUND, 'Danh mục không tồn tại');
    return doc;
  }

  async create(dto: CreateCategoryDto) {
    const slug = readSlugOrGenerate(dto.slug, dto.name);
    await this.assertSlugAvailable(slug);
    return this.categoryModel.create(buildInitialCategoryValues({ ...dto, slug }));
  }

  async update(id: string, dto: UpdateCategoryDto) {
    if (Object.prototype.hasOwnProperty.call(dto, 'slug')) {
      throw new DomainBadRequestException(CATALOG_ERRORS.CATEGORY_SLUG_IMMUTABLE, 'Slug danh mục không thể thay đổi sau khi tạo.');
    }

    const updateData: UpdateQuery<CategoryDocument> = { ...dto };
    const doc = await this.categoryModel.findOneAndUpdate(
      { _id: id, isDeleted: false },
      { $set: updateData },
      { returnDocument: 'after' },
    );
    if (!doc) throw new DomainNotFoundException(CATALOG_ERRORS.CATEGORY_NOT_FOUND, 'Danh mục không tồn tại');
    return doc;
  }

  async softDelete(id: string) {
    const doc = await this.categoryModel.findOneAndUpdate(
      { _id: id, isDeleted: false },
      { $set: { isDeleted: true, deletedAt: new Date() } },
      { returnDocument: 'after' },
    );
    if (!doc) throw new DomainNotFoundException(CATALOG_ERRORS.CATEGORY_NOT_FOUND, 'Danh mục không tồn tại');
    return { deleted: true, id };
  }

  private async assertSlugAvailable(slug: string, excludeId?: string) {
    const filter: QueryFilter<CategoryDocument> = { slug, isDeleted: false };
    if (excludeId) filter._id = { $ne: excludeId as never };
    const existing = await this.categoryModel.findOne(filter);
    if (existing) {
      throw new DomainConflictException(CATALOG_ERRORS.CATEGORY_SLUG_DUPLICATE, 'Slug danh mục đã tồn tại', { slug });
    }
  }
}
