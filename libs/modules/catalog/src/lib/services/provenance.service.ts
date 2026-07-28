import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, QueryFilter, Types } from 'mongoose';
import { DomainNotFoundException } from '@vt/platform-error';
import { CreateProvenanceDto, UpdateProvenanceDto } from '../dto/provenance.dto';
import { ProvenanceRecord, ProvenanceRecordDocument } from '../schemas/provenance-record.schema';
import { CATALOG_ERRORS } from '../constants/catalog.constants';
import { buildInitialProvenanceRecordValues } from '../constants/provenance-record-writer-initial-values';

@Injectable()
export class ProvenanceService {
  constructor(@InjectModel(ProvenanceRecord.name) private provenanceModel: Model<ProvenanceRecordDocument>) {}

  async findByProduct(productId: string, activeOnly = false) {
    const filter: QueryFilter<ProvenanceRecordDocument> = {
      productId: new Types.ObjectId(productId),
      isDeleted: false,
    };
    if (activeOnly) filter.isActive = true;
    return this.provenanceModel.find(filter).sort({ issuedDate: -1, createdAt: -1 });
  }

  async create(productId: string, dto: CreateProvenanceDto, fileUrl: string) {
    return this.provenanceModel.create(buildInitialProvenanceRecordValues({
      ...dto,
      productId: new Types.ObjectId(productId),
      fileUrl,
    }));
  }

  async update(id: string, dto: UpdateProvenanceDto) {
    const doc = await this.provenanceModel.findOneAndUpdate(
      { _id: id, isDeleted: false },
      { $set: dto },
      { returnDocument: 'after' },
    );
    if (!doc) throw new DomainNotFoundException(CATALOG_ERRORS.PROVENANCE_NOT_FOUND, 'Chứng nhận không tồn tại');
    return doc;
  }

  async softDelete(id: string) {
    const doc = await this.provenanceModel.findOneAndUpdate(
      { _id: id, isDeleted: false },
      { $set: { isDeleted: true, isActive: false, deletedAt: new Date() } },
      { returnDocument: 'after' },
    );
    if (!doc) throw new DomainNotFoundException(CATALOG_ERRORS.PROVENANCE_NOT_FOUND, 'Chứng nhận không tồn tại');
    return { deleted: true, id };
  }
}
