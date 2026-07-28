import { Readable } from 'node:stream';
import {
  S3FileStorageAdapter,
  S3FileStorageError,
  S3_HTTP_STATUS,
  type S3StorageCommandFactory,
} from './s3-storage';

function createCommandFactory(): S3StorageCommandFactory {
  return {
    putObject: (input) => ({ type: 'put', input }),
    getObject: (input) => ({ type: 'get', input }),
    deleteObject: (input) => ({ type: 'delete', input }),
    headObject: (input) => ({ type: 'head', input }),
  };
}

describe('S3FileStorageAdapter', () => {
  it('writes objects through the injected S3 client', async () => {
    const send = vi.fn().mockResolvedValue({});
    const adapter = new S3FileStorageAdapter({
      bucket: 'bucket-a',
      client: { send },
      commandFactory: createCommandFactory(),
    });

    await expect(adapter.writeObject('tenant/file.txt', Buffer.from('ok'), 'text/plain'))
      .resolves.toBe('tenant/file.txt');

    expect(send).toHaveBeenCalledWith({
      type: 'put',
      input: {
        Bucket: 'bucket-a',
        Key: 'tenant/file.txt',
        Body: Buffer.from('ok'),
        ContentType: 'text/plain',
      },
    });
  });

  it('reads object bodies from buffers and streams', async () => {
    const send = vi.fn()
      .mockResolvedValueOnce({ Body: Buffer.from('buffer-body') })
      .mockResolvedValueOnce({ Body: Readable.from(['stream-', 'body']) });
    const adapter = new S3FileStorageAdapter({
      bucket: 'bucket-a',
      client: { send },
      commandFactory: createCommandFactory(),
    });

    await expect(adapter.readObject('buffer.txt')).resolves.toEqual(Buffer.from('buffer-body'));
    await expect(adapter.readObject('stream.txt')).resolves.toEqual(Buffer.from('stream-body'));
  });

  it('returns null or false for missing objects', async () => {
    const notFound = Object.assign(new Error('not found'), {
      $metadata: { httpStatusCode: S3_HTTP_STATUS.NOT_FOUND },
    });
    const send = vi.fn().mockRejectedValue(notFound);
    const adapter = new S3FileStorageAdapter({
      bucket: 'bucket-a',
      client: { send },
      commandFactory: createCommandFactory(),
    });

    await expect(adapter.readObject('missing.txt')).resolves.toBeNull();
    await expect(adapter.exists('missing.txt')).resolves.toBe(false);
    await expect(adapter.deleteObject('missing.txt')).resolves.toBe(false);
  });

  it('deletes only existing objects', async () => {
    const send = vi.fn()
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({});
    const adapter = new S3FileStorageAdapter({
      bucket: 'bucket-a',
      client: { send },
      commandFactory: createCommandFactory(),
    });

    await expect(adapter.deleteObject('file.txt')).resolves.toBe(true);

    expect(send).toHaveBeenNthCalledWith(1, {
      type: 'head',
      input: { Bucket: 'bucket-a', Key: 'file.txt' },
    });
    expect(send).toHaveBeenNthCalledWith(2, {
      type: 'delete',
      input: { Bucket: 'bucket-a', Key: 'file.txt' },
    });
  });

  it('rejects traversal keys', async () => {
    const adapter = new S3FileStorageAdapter({
      bucket: 'bucket-a',
      client: { send: vi.fn() },
      commandFactory: createCommandFactory(),
    });

    await expect(adapter.writeObject('../secret.txt', Buffer.from('x')))
      .rejects.toThrow(S3FileStorageError);
  });

  it('generates unique prefixed storage keys', () => {
    const adapter = new S3FileStorageAdapter({
      bucket: 'bucket-a',
      prefix: 'uploads',
      client: { send: vi.fn() },
      commandFactory: createCommandFactory(),
    });

    const key = adapter.suggestStorageKey({ tenantId: 'tenant-1', fileName: 'report.pdf' });

    expect(key).toMatch(/^uploads\/tenant-1\/\d+_[0-9a-f-]+_report\.pdf$/);
  });
});
