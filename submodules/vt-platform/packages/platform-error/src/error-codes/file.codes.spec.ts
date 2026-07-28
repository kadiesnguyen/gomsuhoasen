import assert from 'node:assert/strict';
import test from 'node:test';

import { FILE_ERROR_CODES } from './file.codes';

test('file error code values are unique symbolic strings', () => {
  const values = Object.values(FILE_ERROR_CODES);

  assert.equal(new Set(values).size, values.length);
  for (const value of values) {
    assert.match(value, /^[A-Z0-9_]+$/);
  }
});

test('file upload/session/storage validation codes are specific, not generic fallbacks', () => {
  const specificKeys = [
    'FILE_INVALID_OBJECT_ID',
    'FILE_PROVIDER_UNSUPPORTED',
    'FILE_TOKEN_QUOTA_EXCEEDED',
    'FILE_UPLOAD_PAYLOAD_MISMATCH',
    'FILE_UPLOAD_POLICY_VIOLATION',
    'FILE_MISSING_UPLOAD_PAYLOAD',
    'FILE_UPLOAD_SESSION_EXPIRED',
    'FILE_UPLOAD_SESSION_NOT_FOUND',
    'FILE_UPLOAD_SESSION_NOT_WRITABLE',
    'FILE_DIRECT_LOCAL_UPLOAD_PROVIDER_REQUIRED',
    'FILE_REFERENCE_EXTERNAL_URL_REQUIRED',
    'FILE_SHARE_CREDENTIAL_PAIR_REQUIRED',
    'FILE_SHARE_LINK_EXPIRED',
    'FILE_SHARE_LINK_MAX_DOWNLOADS_EXCEEDED',
    'FILE_SHARE_LINK_NOT_FOUND',
    'FILE_SHARE_LINK_REVOKED',
    'FILE_STORAGE_KEY_REQUIRED',
    'FILE_TOKEN_QUERY_REQUIRED',
    'STORAGE_PROVIDER_ERROR',
  ] as const;

  for (const key of specificKeys) {
    assert.equal(FILE_ERROR_CODES[key].includes('GENERIC'), false, `${key} must not emit a generic code`);
  }
});
