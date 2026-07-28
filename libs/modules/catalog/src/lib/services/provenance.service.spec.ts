import { getMongooseSchemaPathDefault } from '@vt/platform-mongoose';
import { Types } from 'mongoose';
import { buildInitialProvenanceRecordValues } from '../constants/provenance-record-writer-initial-values';
import { CreateProvenanceDto } from '../dto/provenance.dto';
import { ProvenanceRecordSchema, ProvenanceType } from '../schemas/provenance-record.schema';
import { ProvenanceService } from './provenance.service';

describe('ProvenanceService', () => {
  function createService() {
    const model = {
      create: jest.fn(),
      find: jest.fn(),
      findOneAndUpdate: jest.fn(),
    };
    return { model, service: new ProvenanceService(model as never) };
  }

  describe('schema initial values', () => {
    it('keeps provenance lifecycle initial values out of schema defaults', () => {
      expect(getMongooseSchemaPathDefault(ProvenanceRecordSchema, 'isActive')).toBeUndefined();
      expect(getMongooseSchemaPathDefault(ProvenanceRecordSchema, 'isDeleted')).toBeUndefined();
    });

    it('centralizes provenance writer initial values explicitly', () => {
      expect(buildInitialProvenanceRecordValues({
        productId: new Types.ObjectId(),
        type: ProvenanceType.CERTIFICATE,
        title: 'Certificate',
        fileUrl: '/uploads/provenance/cert.pdf',
      })).toMatchObject({
        isActive: true,
        isDeleted: false,
      });
    });
  });

  it('creates provenance with explicit lifecycle values', async () => {
    const { service, model } = createService();
    const productId = new Types.ObjectId().toHexString();
    const dto: CreateProvenanceDto = {
      type: ProvenanceType.CERTIFICATE,
      title: 'Certificate',
      issuedBy: 'Gom Hoa Sen',
    };
    model.create.mockImplementation(async (payload) => payload);

    const result = await service.create(productId, dto, '/uploads/provenance/cert.pdf');

    expect(model.create).toHaveBeenCalledWith(expect.objectContaining({
      productId: expect.any(Types.ObjectId),
      type: ProvenanceType.CERTIFICATE,
      title: 'Certificate',
      fileUrl: '/uploads/provenance/cert.pdf',
      isActive: true,
      isDeleted: false,
    }));
    expect(result).toMatchObject({
      isActive: true,
      isDeleted: false,
    });
  });
});
