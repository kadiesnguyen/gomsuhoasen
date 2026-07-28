import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  FILE_CORE_ERROR_MESSAGES,
  FILE_ASSET_STATUSES,
  FILE_STORAGE_PROVIDERS,
  FileMigrationStatus,
  FileAssetStatus,
  JobStatus,
  LedgerStatus,
  LISTABLE_FILE_ASSET_STATUSES,
  UploadSessionStatus,
  buildFileContentResponseHeaders,
  buildInlineFileContentDisposition,
  buildPublicUploadPath,
  generateStorageKey,
  joinStorageKey,
  normalizeStorageKey,
  publicUploadPathToStorageKey,
  sanitizeFileName,
  toPublicUploadPath,
} from './file-core';
import {
  buildPublicUploadPath as buildBrowserPublicUploadPath,
  buildFileContentResponseHeaders as buildBrowserFileContentResponseHeaders,
} from './browser';

describe('platform-file-core helpers', () => {
  it('aligns provider constants with the v2 provider registry', () => {
    assert.deepEqual(Object.values(FILE_STORAGE_PROVIDERS).sort(), [
      'AZURE',
      'GCS',
      'LOCAL',
      'MINIO',
      'S3',
    ]);
  });

  it('exposes the v2 file asset lifecycle listable set', () => {
    assert.deepEqual(LISTABLE_FILE_ASSET_STATUSES, [
      FILE_ASSET_STATUSES.TEMP,
      FILE_ASSET_STATUSES.ATTACHED,
      FILE_ASSET_STATUSES.ORPHAN,
      FILE_ASSET_STATUSES.ACTIVE,
      FILE_ASSET_STATUSES.QUARANTINED,
    ]);
  });

  it('exposes shared file-management status contracts', () => {
    assert.deepEqual(Object.values(UploadSessionStatus), ['ISSUED', 'FINALIZED', 'EXPIRED']);
    assert.deepEqual(Object.values(LedgerStatus), ['SUCCESS', 'FAILED']);
    assert.deepEqual(Object.values(JobStatus), ['QUEUED', 'RUNNING', 'DONE', 'FAILED', 'CANCELLED']);
    assert.deepEqual(Object.values(FileMigrationStatus), ['QUEUED', 'RUNNING', 'DONE', 'FAILED']);
  });

  it('sanitizes unsafe filenames and rejects empty names', () => {
    assert.equal(sanitizeFileName('a b/c?.png'), 'a_b_c_.png');
    assert.throws(() => sanitizeFileName(''), new RegExp(FILE_CORE_ERROR_MESSAGES.SANITIZE_FILE_NAME_REQUIRED));
  });

  it('normalizes storage keys and public upload paths without changing key semantics', () => {
    assert.equal(normalizeStorageKey('/quotes//Q-001.pdf'), 'quotes/Q-001.pdf');
    assert.equal(joinStorageKey('products', 'p-1', '/images/', 'a.png'), 'products/p-1/images/a.png');
    assert.equal(toPublicUploadPath('quotes/Q-001.pdf'), 'uploads/quotes/Q-001.pdf');
    assert.equal(toPublicUploadPath('/uploads/quotes/Q-001.pdf'), 'uploads/quotes/Q-001.pdf');
    assert.equal(publicUploadPathToStorageKey('uploads/files/raw/a.png'), 'files/raw/a.png');
    assert.equal(publicUploadPathToStorageKey('/uploads/files/raw/a.png'), 'files/raw/a.png');
    assert.equal(buildPublicUploadPath('products', 'p-1', 'images', 'a.png'), 'uploads/products/p-1/images/a.png');
    assert.equal(buildBrowserPublicUploadPath('products', 'p-1', 'images', 'a.png'), 'uploads/products/p-1/images/a.png');
  });

  it('builds inline file content response headers', () => {
    assert.equal(buildInlineFileContentDisposition('a b.pdf'), 'inline; filename="a%20b.pdf"');
    assert.deepEqual(
      buildFileContentResponseHeaders({
        fileName: 'quote.pdf',
        mimeType: 'application/pdf',
        sizeBytes: 4096,
      }),
      {
        contentType: 'application/pdf',
        contentDisposition: 'inline; filename="quote.pdf"',
        contentLength: '4096',
      },
    );
    assert.deepEqual(
      buildBrowserFileContentResponseHeaders({
        fileName: 'quote.pdf',
        mimeType: 'application/pdf',
        sizeBytes: 4096,
      }),
      {
        contentType: 'application/pdf',
        contentDisposition: 'inline; filename="quote.pdf"',
        contentLength: '4096',
      },
    );
    assert.deepEqual(
      buildFileContentResponseHeaders({
        fileName: 'image.png',
        mimeType: 'image/png',
      }),
      {
        contentType: 'image/png',
        contentDisposition: 'inline; filename="image.png"',
      },
    );
    assert.throws(
      () => buildInlineFileContentDisposition('   '),
      new RegExp(FILE_CORE_ERROR_MESSAGES.INLINE_DISPOSITION_FILE_NAME_REQUIRED),
    );
    assert.throws(
      () => buildFileContentResponseHeaders({ fileName: 'a.pdf', mimeType: '', sizeBytes: 1 }),
      new RegExp(FILE_CORE_ERROR_MESSAGES.RESPONSE_MIME_TYPE_REQUIRED),
    );
    assert.throws(
      () => buildFileContentResponseHeaders({ fileName: 'a.pdf', mimeType: 'application/pdf', sizeBytes: Number.NaN }),
      new RegExp(FILE_CORE_ERROR_MESSAGES.RESPONSE_SIZE_BYTES_MUST_BE_FINITE),
    );
  });

  it('generates unique storage keys for repeated uploads', () => {
    const first = generateStorageKey({
      tenantId: 'tenant-1',
      prefix: 'uploads',
      fileName: 'avatar.png',
    });
    const second = generateStorageKey({
      tenantId: 'tenant-1',
      prefix: 'uploads',
      fileName: 'avatar.png',
    });

    assert.match(first, /^uploads\/tenant-1\/\d+_[0-9a-f-]+_avatar\.png$/);
    assert.notEqual(first, second);
  });
});
