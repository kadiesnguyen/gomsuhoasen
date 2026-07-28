import { Readable } from 'stream';
import { FILE_ASSET_FIELD_REFS, FILE_ASSET_MODULE_REFS } from '@gomhoasen/contracts';
import { DomainBadRequestException } from '@vt/platform-error';
import { FileController } from './file.controller';
import type { GhsFileStorageAdapter } from '../providers/file-storage.provider';

describe('FileController', () => {
  function createController(options: { exists?: boolean } = {}) {
    const fileService = {
      createAsset: jest.fn(async (input: unknown) => input),
      findById: jest.fn().mockResolvedValue({
        storagePath: 'uploads/files/raw/asset.png',
        mimeType: 'image/png',
        originalName: 'asset.png',
      }),
    };
    const stream = Readable.from(['ok']);
    const storage: jest.Mocked<GhsFileStorageAdapter> = {
      writeObject: jest.fn(),
      readObject: jest.fn(),
      deleteObject: jest.fn(),
      exists: jest.fn().mockResolvedValue(options.exists ?? true),
      suggestStorageKey: jest.fn(),
      createReadStream: jest.fn().mockReturnValue(stream),
    };
    const response = {
      setHeader: jest.fn(),
      write: jest.fn(),
      end: jest.fn(),
      on: jest.fn(),
      once: jest.fn(),
      emit: jest.fn(),
    };

    return {
      controller: new FileController(fileService as never, storage),
      fileService,
      storage,
      response,
    };
  }

  it('streams asset content through the injected platform storage adapter', async () => {
    const { controller, storage, response } = createController();

    await controller.getContent('asset-1', response as never);

    expect(storage.exists).toHaveBeenCalledWith('files/raw/asset.png');
    expect(storage.createReadStream).toHaveBeenCalledWith('files/raw/asset.png');
    expect(response.setHeader).toHaveBeenCalledWith('Content-Type', 'image/png');
    expect(response.setHeader).toHaveBeenCalledWith('Content-Disposition', 'inline; filename=\"asset.png\"');
  });

  it('normalizes uploadedBy from the first usable current-user identity', async () => {
    const { controller, fileService } = createController();

    await controller.uploadAsset(
      { filename: 'asset.png' } as Express.Multer.File,
      {
        moduleRef: FILE_ASSET_MODULE_REFS.CATALOG,
        entityRef: 'product-1',
        fieldRef: FILE_ASSET_FIELD_REFS.IMAGE,
        metadata: { alt: 'Asset' },
      },
      {
        id: '   ',
        _id: '  mongo-user-1  ',
        email: ' editor@example.com ',
      },
    );

    expect(fileService.createAsset).toHaveBeenCalledWith(expect.objectContaining({
      storagePath: 'uploads/files/raw/asset.png',
      uploadedBy: 'mongo-user-1',
      moduleRef: FILE_ASSET_MODULE_REFS.CATALOG,
      entityRef: 'product-1',
      fieldRef: FILE_ASSET_FIELD_REFS.IMAGE,
      metadata: { alt: 'Asset' },
    }));
  });

  it('omits uploadedBy when current-user identity fields are blank', async () => {
    const { controller, fileService } = createController();

    await controller.uploadAsset(
      { filename: 'asset.png' } as Express.Multer.File,
      {},
      {
        id: '',
        _id: '   ',
        email: '  ',
      },
    );

    expect(fileService.createAsset).toHaveBeenCalledWith(expect.objectContaining({
      uploadedBy: undefined,
    }));
  });

  it('throws a domain error when the injected adapter cannot find the file', async () => {
    const { controller, storage, response } = createController({ exists: false });

    await expect(controller.getContent('asset-1', response as never)).rejects.toBeInstanceOf(DomainBadRequestException);
    expect(storage.createReadStream).not.toHaveBeenCalled();
  });
});
