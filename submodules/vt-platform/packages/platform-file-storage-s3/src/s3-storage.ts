import {
  generateStorageKey,
  type IFileStorageAdapter,
  type StorageKeyContext,
} from '@vt/platform-file-core';

export const S3_HTTP_STATUS = {
  NOT_FOUND: 404,
} as const;

export interface S3FileStorageAdapterOptions {
  bucket: string;
  region?: string;
  prefix?: string;
  endpoint?: string;
  forcePathStyle?: boolean;
  credentials?: {
    accessKeyId: string;
    secretAccessKey: string;
    sessionToken?: string;
  };
  client?: S3StorageClient;
  commandFactory?: S3StorageCommandFactory;
}

export interface S3StorageClient {
  send(command: unknown): Promise<unknown>;
}

export interface S3StorageCommandFactory {
  putObject(input: S3PutObjectInput): unknown;
  getObject(input: S3GetObjectInput): unknown;
  deleteObject(input: S3DeleteObjectInput): unknown;
  headObject(input: S3HeadObjectInput): unknown;
  createClient?(options: S3FileStorageAdapterOptions): S3StorageClient;
}

export interface S3PutObjectInput {
  Bucket: string;
  Key: string;
  Body: Buffer;
  ContentType?: string;
}

export interface S3GetObjectInput {
  Bucket: string;
  Key: string;
}

export interface S3DeleteObjectInput {
  Bucket: string;
  Key: string;
}

export interface S3HeadObjectInput {
  Bucket: string;
  Key: string;
}

export class S3FileStorageError extends Error {
  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = 'S3FileStorageError';
    if (cause !== undefined) {
      Object.defineProperty(this, 'cause', {
        configurable: true,
        value: cause,
      });
    }
  }
}

export class S3FileStorageAdapter implements IFileStorageAdapter {
  private readonly client: S3StorageClient;
  private readonly commandFactory: S3StorageCommandFactory;

  constructor(private readonly options: S3FileStorageAdapterOptions) {
    if (!options.bucket.trim()) {
      throw new S3FileStorageError('S3 bucket is required');
    }

    this.commandFactory = options.commandFactory ?? loadAwsSdkCommandFactory();
    this.client = options.client ?? this.commandFactory.createClient?.(options) ?? createDefaultS3Client(options);
  }

  async writeObject(storageKey: string, payload: Buffer, mimeType?: string): Promise<string> {
    const key = this.resolveKey(storageKey);
    await this.client.send(this.commandFactory.putObject({
      Bucket: this.options.bucket,
      Key: key,
      Body: payload,
      ContentType: mimeType,
    }));
    return key;
  }

  async readObject(storageKey: string): Promise<Buffer | null> {
    const key = this.resolveKey(storageKey);
    try {
      const result = await this.client.send(this.commandFactory.getObject({
        Bucket: this.options.bucket,
        Key: key,
      })) as { Body?: unknown };
      return bodyToBuffer(result.Body);
    } catch (error) {
      if (isNotFoundError(error)) return null;
      throw error;
    }
  }

  async deleteObject(storageKey: string): Promise<boolean> {
    const key = this.resolveKey(storageKey);
    const existed = await this.exists(key);
    if (!existed) return false;

    await this.client.send(this.commandFactory.deleteObject({
      Bucket: this.options.bucket,
      Key: key,
    }));
    return true;
  }

  async exists(storageKey: string): Promise<boolean> {
    const key = this.resolveKey(storageKey);
    try {
      await this.client.send(this.commandFactory.headObject({
        Bucket: this.options.bucket,
        Key: key,
      }));
      return true;
    } catch (error) {
      if (isNotFoundError(error)) return false;
      throw error;
    }
  }

  suggestStorageKey(context: StorageKeyContext): string {
    return this.resolveKey(generateStorageKey({
      ...context,
      prefix: context.prefix ?? this.options.prefix,
    }));
  }

  private resolveKey(storageKey: string): string {
    const normalized = storageKey.replace(/\\/g, '/').replace(/^\/+/, '');
    if (normalized.includes('../') || normalized === '..' || normalized.includes('/..')) {
      throw new S3FileStorageError(`Invalid S3 storage key: ${storageKey}`);
    }
    return normalized;
  }
}

async function bodyToBuffer(body: unknown): Promise<Buffer | null> {
  if (body == null) return null;
  if (Buffer.isBuffer(body)) return body;
  if (typeof body === 'string') return Buffer.from(body);
  if (body instanceof Uint8Array) return Buffer.from(body);

  const transformable = body as { transformToByteArray?: () => Promise<Uint8Array> };
  if (typeof transformable.transformToByteArray === 'function') {
    return Buffer.from(await transformable.transformToByteArray());
  }

  const readable = body as AsyncIterable<Buffer | Uint8Array | string>;
  if (typeof readable?.[Symbol.asyncIterator] === 'function') {
    const chunks: Buffer[] = [];
    for await (const chunk of readable) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    return Buffer.concat(chunks);
  }

  throw new S3FileStorageError('Unsupported S3 object body type');
}

function isNotFoundError(error: unknown): boolean {
  const value = error as { name?: string; $metadata?: { httpStatusCode?: number }; Code?: string; code?: string };
  return value?.name === 'NotFound'
    || value?.name === 'NoSuchKey'
    || value?.Code === 'NoSuchKey'
    || value?.code === 'NoSuchKey'
    || value?.$metadata?.httpStatusCode === S3_HTTP_STATUS.NOT_FOUND;
}

function createDefaultS3Client(options: S3FileStorageAdapterOptions): S3StorageClient {
  const factory = loadAwsSdkCommandFactory();
  if (!factory.createClient) {
    throw new S3FileStorageError('AWS SDK S3 client factory is unavailable');
  }
  return factory.createClient(options);
}

function loadAwsSdkCommandFactory(): S3StorageCommandFactory {
  try {
     
    const aws = require('@aws-sdk/client-s3') as {
      S3Client: new (options: Record<string, unknown>) => S3StorageClient;
      PutObjectCommand: new (input: S3PutObjectInput) => unknown;
      GetObjectCommand: new (input: S3GetObjectInput) => unknown;
      DeleteObjectCommand: new (input: S3DeleteObjectInput) => unknown;
      HeadObjectCommand: new (input: S3HeadObjectInput) => unknown;
    };

    return {
      createClient: (options) => new aws.S3Client({
        region: options.region,
        endpoint: options.endpoint,
        forcePathStyle: options.forcePathStyle,
        credentials: options.credentials,
      }),
      putObject: (input) => new aws.PutObjectCommand(input),
      getObject: (input) => new aws.GetObjectCommand(input),
      deleteObject: (input) => new aws.DeleteObjectCommand(input),
      headObject: (input) => new aws.HeadObjectCommand(input),
    };
  } catch {
    throw new S3FileStorageError(
      '@vt/platform-file-storage-s3 requires "@aws-sdk/client-s3" unless a client and commandFactory are provided.',
    );
  }
}
