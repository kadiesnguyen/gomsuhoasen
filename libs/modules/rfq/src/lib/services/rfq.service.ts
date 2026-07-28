import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ClientSession, Model, QueryFilter, UpdateQuery } from 'mongoose';
import { DomainNotFoundException } from '@vt/platform-error';
import { Rfq, RfqDocument, RfqStatus } from '../schemas/rfq.schema';
import { CreateRfqDto } from '../dto/rfq.dto';
import { RFQ_ERRORS } from '../constants/rfq.constants';
import { assertRfqTransition } from '../constants/rfq-transitions';
import { buildInitialRfqValues } from '../constants/rfq-writer-initial-values';

@Injectable()
export class RfqService {
  constructor(@InjectModel(Rfq.name) private rfqModel: Model<RfqDocument>) {}

  async findAll(query: { status?: RfqStatus }) {
    const filter: QueryFilter<RfqDocument> = {};
    if (query.status) filter.status = query.status;
    return this.rfqModel.find(filter).sort({ createdAt: -1 });
  }

  async findById(id: string) {
    const rfq = await this.rfqModel.findById(id);
    if (!rfq) throw new DomainNotFoundException(RFQ_ERRORS.RFQ_NOT_FOUND, 'RFQ không tồn tại');
    return rfq;
  }

  async create(data: CreateRfqDto) {
    return this.rfqModel.create(buildInitialRfqValues(data));
  }

  async updateStatus(
    id: string,
    newStatus: RfqStatus,
    internalNote: string | undefined,
    options: { session: ClientSession | null },
  ) {
    const currentRfqQuery = this.rfqModel.findById(id);
    currentRfqQuery.session(options.session);
    const currentRfq = await currentRfqQuery.exec();
    if (!currentRfq) {
      throw new DomainNotFoundException(RFQ_ERRORS.RFQ_NOT_FOUND, 'RFQ không tồn tại');
    }

    assertRfqTransition(currentRfq.status, newStatus);

    const update: UpdateQuery<RfqDocument> = { status: newStatus };
    if (internalNote) update.internalNote = internalNote;
    const updateOptions = { returnDocument: 'after' as const, session: options.session };
    const rfq = await this.rfqModel.findByIdAndUpdate(
      id,
      { $set: update },
      updateOptions,
    );
    return rfq;
  }
}
