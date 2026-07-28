// Refs read: v2/libs/catalog/src/lib/services/brand.service.ts
// Kept: slug collision, soft-delete, typed Mongoose queries
// Dropped: multi-org filter, restore flow, createdById/updatedById tracking
// Adapted: Vietnamese messages, slug immutable guard, error code objects

import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, QueryFilter, UpdateQuery } from 'mongoose';
import {
  DomainBadRequestException,
  DomainConflictException,
  DomainNotFoundException,
} from '@vt/platform-error';
import { Artisan, ArtisanDocument, ArtisanStatus } from '../schemas/artisan.schema';
import { CreateArtisanDto, UpdateArtisanDto } from '../dto/artisan.dto';
import { ARTISAN_ERRORS } from '../constants/artisan.constants';
import { buildInitialArtisanValues } from '../constants/artisan-writer-initial-values';
import { readSlugOrGenerate } from '@gomhoasen/contracts';

@Injectable()
export class ArtisanService {
  constructor(@InjectModel(Artisan.name) private artisanModel: Model<ArtisanDocument>) {}

  async findAll(query: { status?: ArtisanStatus; search?: string }) {
    const filter: QueryFilter<ArtisanDocument> = { isDeleted: false };
    if (query.status) filter.status = query.status;
    if (query.search) filter.$text = { $search: query.search };
    return this.artisanModel.find(filter).sort({ sortOrder: 1, createdAt: -1 });
  }

  async findBySlug(slug: string) {
    const doc = await this.artisanModel.findOne({ slug, isDeleted: false });
    if (!doc) throw new DomainNotFoundException(ARTISAN_ERRORS.ART_NOT_FOUND, 'Nghệ nhân không tồn tại');
    return doc;
  }

  async findActiveBySlug(slug: string) {
    const doc = await this.artisanModel.findOne({ slug, status: ArtisanStatus.ACTIVE, isDeleted: false });
    if (!doc) throw new DomainNotFoundException(ARTISAN_ERRORS.ART_NOT_FOUND, 'Nghệ nhân không tồn tại');
    return doc;
  }

  async findById(id: string) {
    const doc = await this.artisanModel.findOne({ _id: id, isDeleted: false });
    if (!doc) throw new DomainNotFoundException(ARTISAN_ERRORS.ART_NOT_FOUND, 'Nghệ nhân không tồn tại');
    return doc;
  }

  async create(dto: CreateArtisanDto) {
    const slug = readSlugOrGenerate(dto.slug, dto.name);
    await this.assertSlugAvailable(slug);
    return this.artisanModel.create(buildInitialArtisanValues({ ...dto, slug }));
  }

  async update(id: string, dto: UpdateArtisanDto) {
    // Slug immutable guard — ported from Zalo BrandService.update()
    if (Object.prototype.hasOwnProperty.call(dto, 'slug')) {
      throw new DomainBadRequestException(ARTISAN_ERRORS.ART_SLUG_IMMUTABLE, 'Slug nghệ nhân không thể thay đổi sau khi tạo.');
    }

    const updateData: UpdateQuery<ArtisanDocument> = { ...dto };
    const doc = await this.artisanModel.findOneAndUpdate(
      { _id: id, isDeleted: false }, { $set: updateData }, { returnDocument: 'after' },
    );
    if (!doc) throw new DomainNotFoundException(ARTISAN_ERRORS.ART_NOT_FOUND, 'Nghệ nhân không tồn tại');
    return doc;
  }

  async softDelete(id: string) {
    const doc = await this.artisanModel.findOneAndUpdate(
      { _id: id, isDeleted: false },
      { $set: { isDeleted: true, deletedAt: new Date() } },
      { returnDocument: 'after' },
    );
    if (!doc) throw new DomainNotFoundException(ARTISAN_ERRORS.ART_NOT_FOUND, 'Nghệ nhân không tồn tại');
    return { deleted: true, id };
  }

  async setAvatar(id: string, avatar: string) {
    const doc = await this.artisanModel.findOneAndUpdate(
      { _id: id, isDeleted: false },
      { $set: { avatar } },
      { returnDocument: 'after' },
    );
    if (!doc) throw new DomainNotFoundException(ARTISAN_ERRORS.ART_NOT_FOUND, 'Nghệ nhân không tồn tại');
    return doc;
  }

  private async assertSlugAvailable(slug: string, excludeId?: string) {
    const filter: QueryFilter<ArtisanDocument> = { slug, isDeleted: false };
    if (excludeId) filter._id = { $ne: excludeId as never };
    const existing = await this.artisanModel.findOne(filter);
    if (existing) {
      throw new DomainConflictException(ARTISAN_ERRORS.ART_SLUG_DUPLICATE, 'Slug nghệ nhân đã tồn tại', { slug });
    }
  }
}
