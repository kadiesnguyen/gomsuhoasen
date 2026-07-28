import { getMongooseSchemaPathDefault } from '@vt/platform-mongoose';
import { FILE_ASSET_FIELD_REFS, FILE_ASSET_MODULE_REFS, FILE_ASSET_STATUSES } from '@gomhoasen/contracts';
import { buildInitialFileAssetValues } from '../constants/file-asset-writer-initial-values';
import { FileAssetSchema, FileAssetStatus } from '../schemas/file-asset.schema';
import { FileService } from './file.service';

describe('FileService', () => {
  function createService() {
    const query = {
      sort: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue([{ _id: 'asset-1' }]),
    };
    const model = {
      create: jest.fn(),
      findById: jest.fn(),
      find: jest.fn().mockReturnValue(query),
      countDocuments: jest.fn().mockResolvedValue(1),
    };
    return { model, query, service: new FileService(model as never) };
  }

  it('should be defined', () => {
    const { service } = createService();
    expect(service).toBeDefined();
  });

  it('should keep canonical status values', () => {
    expect(FileAssetStatus).toEqual(FILE_ASSET_STATUSES);
  });

  describe('schema initial values', () => {
    it('keeps file asset lifecycle initial values out of schema defaults', () => {
      expect(getMongooseSchemaPathDefault(FileAssetSchema, 'status')).toBeUndefined();
      expect(getMongooseSchemaPathDefault(FileAssetSchema, 'referenceCount')).toBeUndefined();
      expect(getMongooseSchemaPathDefault(FileAssetSchema, 'tags')).toBeUndefined();
    });

    it('centralizes file asset writer initial values explicitly', () => {
      expect(buildInitialFileAssetValues({
        fileName: 'stored.png',
        originalName: 'original.png',
        mimeType: 'image/png',
        sizeBytes: 1024,
        storagePath: 'uploads/stored.png',
        uploadedAt: new Date('2026-05-18T00:00:00.000Z'),
      })).toMatchObject({
        status: FileAssetStatus.TEMP,
        referenceCount: 0,
        tags: [],
      });

      expect(buildInitialFileAssetValues({
        fileName: 'model.glb',
        originalName: 'model.glb',
        mimeType: 'model/gltf-binary',
        sizeBytes: 2048,
        storagePath: 'uploads/model.glb',
        moduleRef: FILE_ASSET_MODULE_REFS.CATALOG,
        entityRef: 'product-1',
        fieldRef: FILE_ASSET_FIELD_REFS.MODEL_URL,
        uploadedAt: new Date('2026-05-18T00:00:00.000Z'),
      })).toMatchObject({
        status: FileAssetStatus.ATTACHED,
        referenceCount: 1,
        tags: [],
        attachedAt: new Date('2026-05-18T00:00:00.000Z'),
      });
    });
  });

  it('[FIL-001] creates temp asset when no module reference is supplied', async () => {
    const { service, model } = createService();
    model.create.mockResolvedValue({ status: FileAssetStatus.TEMP, referenceCount: 0 });

    const result = await service.createAsset({
      file: {
        filename: 'stored.png',
        originalname: 'original.png',
        mimetype: 'image/png',
        size: 1024,
      } as Express.Multer.File,
      storagePath: 'uploads/stored.png',
    });

    expect(model.create).toHaveBeenCalledWith(expect.objectContaining({
      status: FileAssetStatus.TEMP,
      referenceCount: 0,
      tags: [],
      storagePath: 'uploads/stored.png',
    }));
    expect(result.status).toBe(FileAssetStatus.TEMP);
  });

  it('[FIL-001] creates attached asset when full module reference is supplied', async () => {
    const { service, model } = createService();
    model.create.mockResolvedValue({ status: FileAssetStatus.ATTACHED, referenceCount: 1 });

    await service.createAsset({
      file: {
        filename: 'model.glb',
        originalname: 'model.glb',
        mimetype: 'model/gltf-binary',
        size: 2048,
      } as Express.Multer.File,
      storagePath: 'uploads/model.glb',
      moduleRef: FILE_ASSET_MODULE_REFS.CATALOG,
      entityRef: 'product-1',
      fieldRef: FILE_ASSET_FIELD_REFS.MODEL_URL,
    });

    expect(model.create).toHaveBeenCalledWith(expect.objectContaining({
      status: FileAssetStatus.ATTACHED,
      referenceCount: 1,
      tags: [],
      attachedAt: expect.any(Date),
    }));
  });

  it('[FIL-002] commits file references and marks assets as attached', async () => {
    const { service, model } = createService();
    const save = jest.fn().mockResolvedValue(undefined);
    const asset = {
      referenceCount: 0,
      save,
    };
    model.findById.mockResolvedValue(asset);

    const result = await service.commitRefs({
      moduleRef: FILE_ASSET_MODULE_REFS.CATALOG,
      entityRef: 'product-1',
      fieldRef: FILE_ASSET_FIELD_REFS.IMAGES,
      attachments: [{ fileId: 'asset-1' }],
    });

    expect(result.updated).toBe(1);
    expect(result.outcomes[0]).toMatchObject({ linked: true, outcomeCode: 'ATTACHED' });
    expect(asset).toMatchObject({
      moduleRef: FILE_ASSET_MODULE_REFS.CATALOG,
      entityRef: 'product-1',
      fieldRef: FILE_ASSET_FIELD_REFS.IMAGES,
      status: FileAssetStatus.ATTACHED,
      referenceCount: 1,
      attachedAt: expect.any(Date),
    });
    expect(save).toHaveBeenCalled();
  });

  it('[FIL-003] unrefs file assets and marks them as orphaned', async () => {
    const { service, model } = createService();
    const save = jest.fn().mockResolvedValue(undefined);
    const asset = {
      moduleRef: FILE_ASSET_MODULE_REFS.CATALOG,
      entityRef: 'product-1',
      fieldRef: FILE_ASSET_FIELD_REFS.IMAGES,
      referenceCount: 1,
      status: FileAssetStatus.ATTACHED,
      save,
    };
    model.findById.mockResolvedValue(asset);

    const result = await service.unref({
      assetIds: ['asset-1'],
      moduleRef: FILE_ASSET_MODULE_REFS.CATALOG,
      entityRef: 'product-1',
      fieldRef: FILE_ASSET_FIELD_REFS.IMAGES,
    });

    expect(result.updated).toBe(1);
    expect(asset.status).toBe(FileAssetStatus.ORPHAN);
    expect(asset.referenceCount).toBe(0);
  });

  it('[FIL-004] uses safe pagination defaults for invalid query values', async () => {
    const { service, model, query } = createService();

    const result = await service.listAssets({ page: Number.NaN, limit: Number.POSITIVE_INFINITY });

    expect(model.find).toHaveBeenCalledWith({});
    expect(query.skip).toHaveBeenCalledWith(0);
    expect(query.limit).toHaveBeenCalledWith(20);
    expect(result).toMatchObject({ page: 1, limit: 20, total: 1, totalPages: 1 });
  });

  it('[FIL-005] filters media assets by MIME family', async () => {
    const { service, model } = createService();

    await service.listAssets({ mimePrefix: 'image', page: 1, limit: 16 });

    expect(model.find).toHaveBeenCalledWith({
      mimeType: /^image\//i,
    });
    expect(model.countDocuments).toHaveBeenCalledWith({
      mimeType: /^image\//i,
    });
  });
});
