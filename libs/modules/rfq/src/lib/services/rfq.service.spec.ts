// Task card: P1-SPEC
// Ref read:
// - /Users/bonbon177tb/Documents/zalominiapp/v2/libs/catalog/src/lib/services/brand.service.spec.ts
// Adapted: RFQ domain — find, create, status update, error codes

import { HttpException } from '@nestjs/common';
import { getMongooseSchemaPathDefault } from '@vt/platform-mongoose';
import { RfqService } from './rfq.service';
import { RFQ_ERRORS } from '../constants/rfq.constants';
import {
  buildInitialRfqValues,
  RFQ_DEFAULT_LINE_ITEM_QUANTITY,
} from '../constants/rfq-writer-initial-values';
import { RfqSchema, RfqSource, RfqStatus } from '../schemas/rfq.schema';

function rfqQuery(value: unknown) {
  return {
    session: jest.fn().mockReturnThis(),
    exec: jest.fn(async () => value),
  };
}

describe('RfqService', () => {
  function createService() {
    const model = {
      find: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      findByIdAndUpdate: jest.fn(),
    };
    return { model, service: new RfqService(model as never) };
  }

  it('throws RFQ_NOT_FOUND when findById returns null', async () => {
    const { service, model } = createService();
    model.findById.mockResolvedValue(null);

    await expect(service.findById('missing')).rejects.toMatchObject({
      response: expect.objectContaining({
        code: RFQ_ERRORS.RFQ_NOT_FOUND,
      }),
    });
  });

  it('throws RFQ_NOT_FOUND as NotFoundException', async () => {
    const { service, model } = createService();
    model.findById.mockResolvedValue(null);

    await expect(service.findById('missing')).rejects.toBeInstanceOf(HttpException);
  });

  it('creates an RFQ with lineItems from DTO', async () => {
    const { service, model } = createService();
    const dto = {
      customerName: 'Nguyễn Văn A',
      customerPhone: '0901234567',
      lineItems: [{ productId: 'p1', productName: 'Bình gốm', quantity: 2 }],
      source: RfqSource.PRODUCT_DETAIL,
    };
    model.create.mockResolvedValue({ ...dto, _id: 'rfq-1' });

    const result = await service.create(dto as never);

    expect(model.create).toHaveBeenCalledWith(expect.objectContaining({
      customerName: 'Nguyễn Văn A',
      lineItems: dto.lineItems,
      source: RfqSource.PRODUCT_DETAIL,
      status: RfqStatus.NEW,
    }));
    expect(result._id).toBe('rfq-1');
  });

  describe('schema initial values', () => {
    it('keeps RFQ business initial values out of schema defaults', () => {
      expect(getMongooseSchemaPathDefault(RfqSchema, 'lineItems')).toBeUndefined();
      expect(getMongooseSchemaPathDefault(RfqSchema, 'source')).toBeUndefined();
      expect(getMongooseSchemaPathDefault(RfqSchema, 'status')).toBeUndefined();
    });

    it('centralizes RFQ writer initial values explicitly', () => {
      expect(buildInitialRfqValues({
        customerName: 'Nguyen Van A',
        customerPhone: '0901234567',
        lineItems: [{ productId: 'p1', productName: 'Binh gom' }],
        source: RfqSource.PRODUCT_DETAIL,
      })).toMatchObject({
        lineItems: [{
          productId: 'p1',
          productName: 'Binh gom',
          quantity: RFQ_DEFAULT_LINE_ITEM_QUANTITY,
        }],
        source: RfqSource.PRODUCT_DETAIL,
        status: RfqStatus.NEW,
      });
    });

    it('builds RFQ line items from legacy productIds without schema defaults', () => {
      expect(buildInitialRfqValues({
        customerName: 'Nguyen Van A',
        customerPhone: '0901234567',
        productIds: ['p1'],
        source: RfqSource.ADMIN,
      })).toMatchObject({
        lineItems: [{
          productId: 'p1',
          productName: 'p1',
          quantity: RFQ_DEFAULT_LINE_ITEM_QUANTITY,
        }],
        source: RfqSource.ADMIN,
      });
    });
  });

  it('[RFQ-004] updates status with error code on not found', async () => {
    const { service, model } = createService();
    model.findById.mockReturnValue(rfqQuery(null));

    await expect(service.updateStatus('missing', RfqStatus.CONTACTED, undefined, { session: null })).rejects.toMatchObject({
      response: expect.objectContaining({
        code: RFQ_ERRORS.RFQ_NOT_FOUND,
      }),
    });
  });

  it('[RFQ-002] updates status for a valid state transition', async () => {
    const { service, model } = createService();
    model.findById.mockReturnValue(rfqQuery({ _id: 'rfq-1', status: RfqStatus.NEW }));
    model.findByIdAndUpdate.mockResolvedValue({ _id: 'rfq-1', status: RfqStatus.CONTACTED });

    const result = await service.updateStatus('rfq-1', RfqStatus.CONTACTED, 'Đã gọi khách', { session: null });

    expect(model.findByIdAndUpdate).toHaveBeenCalledWith(
      'rfq-1',
      { $set: { status: RfqStatus.CONTACTED, internalNote: 'Đã gọi khách' } },
      { returnDocument: 'after', session: null },
    );
    expect(result).toEqual(expect.objectContaining({ status: RfqStatus.CONTACTED }));
  });

  it('[RFQ-003] blocks invalid status transition from CLOSED to NEW', async () => {
    const { service, model } = createService();
    model.findById.mockReturnValue(rfqQuery({ _id: 'rfq-closed', status: RfqStatus.CLOSED }));

    await expect(service.updateStatus('rfq-closed', RfqStatus.NEW, undefined, { session: null })).rejects.toMatchObject({
      response: expect.objectContaining({
        code: RFQ_ERRORS.RFQ_INVALID_STATUS_TRANSITION,
      }),
    });
    await expect(service.updateStatus('rfq-closed', RfqStatus.NEW, undefined, { session: null }))
      .rejects.toBeInstanceOf(HttpException);
  });

  it('applies filter when status query is given', async () => {
    const { service, model } = createService();
    const sortSpy = jest.fn().mockResolvedValue([]);
    model.find.mockReturnValue({ sort: sortSpy });

    await service.findAll({ status: RfqStatus.NEW });

    expect(model.find).toHaveBeenCalledWith({ status: RfqStatus.NEW });
  });
});
