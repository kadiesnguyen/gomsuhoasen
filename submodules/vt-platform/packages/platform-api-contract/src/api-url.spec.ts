import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  appendUrlPathSegments,
  appendUrlQueryString,
  applyApiRouteParams,
  buildApiPath,
  buildUrlQueryString,
  encodeUrlPathSegment,
  hasDuplicateApiVersionPrefix,
  isAbsoluteHttpUrl,
  joinApiBaseAndPath,
  joinApiRoutePath,
  stripApiSuffix,
  trimLeadingSlashes,
  trimTrailingSlashes,
} from './api-url';

describe('api-url', () => {
  it('trims leading and trailing slash boundaries', () => {
    assert.equal(
      trimTrailingSlashes('https://example.test/api///'),
      'https://example.test/api',
    );
    assert.equal(trimTrailingSlashes('/api///'), '/api');
    assert.equal(trimLeadingSlashes('///api/files'), 'api/files');
  });

  it('classifies absolute http urls only', () => {
    assert.equal(isAbsoluteHttpUrl('https://example.test/api'), true);
    assert.equal(isAbsoluteHttpUrl('http://example.test/api'), true);
    assert.equal(isAbsoluteHttpUrl('/api/files'), false);
    assert.equal(isAbsoluteHttpUrl(undefined), false);
  });

  it('strips canonical api suffixes without rewriting nested paths', () => {
    assert.equal(
      stripApiSuffix('https://example.test/api'),
      'https://example.test',
    );
    assert.equal(
      stripApiSuffix('https://example.test/api/v2/'),
      'https://example.test',
    );
    assert.equal(
      stripApiSuffix('https://example.test/root/api/v12'),
      'https://example.test/root',
    );
    assert.equal(
      stripApiSuffix('https://example.test/api/v2/files'),
      'https://example.test/api/v2/files',
    );
  });

  it('joins base url and request path without duplicate slash boundaries', () => {
    assert.equal(
      joinApiBaseAndPath('https://example.test/api/', '/files/a'),
      'https://example.test/api/files/a',
    );
    assert.equal(joinApiBaseAndPath('/api', 'files/a'), '/api/files/a');
    assert.equal(joinApiBaseAndPath('/api/', ''), '/api');
  });

  it('encodes and appends path segments with shared URL semantics', () => {
    assert.equal(encodeUrlPathSegment('A/B C'), 'A%2FB%20C');
    assert.equal(
      appendUrlPathSegments(
        'https://example.test/api/files/',
        'tenant/a',
        'avatar 1.png',
      ),
      'https://example.test/api/files/tenant%2Fa/avatar%201.png',
    );
    assert.equal(appendUrlPathSegments('/files', 42, true), '/files/42/true');
  });

  it('builds api paths from route tokens without duplicate slash boundaries', () => {
    assert.equal(
      joinApiRoutePath('/api/', '/catalog/products/', ':id/images'),
      'api/catalog/products/:id/images',
    );
    assert.equal(
      buildApiPath('/api', 'catalog/products', ':id/images'),
      '/api/catalog/products/:id/images',
    );
    assert.equal(
      buildApiPath('api/v2/', '/iam/auth/', 'login'),
      '/api/v2/iam/auth/login',
    );
  });

  it('applies route params with optional segment encoding', () => {
    assert.equal(
      applyApiRouteParams('products/:id/images/:id', { id: 'p 1' }),
      'products/p 1/images/p 1',
    );
    assert.equal(
      applyApiRouteParams('products/:id', { id: 'tenant/a' }, { encode: true }),
      'products/tenant%2Fa',
    );
  });

  it('builds and appends query strings while skipping empty values', () => {
    assert.equal(
      buildUrlQueryString({
        q: 'A/B C',
        page: 1,
        empty: '',
        missing: undefined,
        nil: null,
      }),
      'q=A%2FB+C&page=1',
    );
    assert.equal(
      appendUrlQueryString('https://example.test/search?scope=all', {
        q: 'A/B C',
      }),
      'https://example.test/search?scope=all&q=A%2FB+C',
    );
  });

  it('detects duplicate request version prefixes behind versioned api bases', () => {
    assert.equal(
      hasDuplicateApiVersionPrefix(
        'https://example.test/api/v2',
        '/v2/catalog',
      ),
      true,
    );
    assert.equal(
      hasDuplicateApiVersionPrefix('https://example.test/v2/', 'v2/catalog'),
      true,
    );
    assert.equal(
      hasDuplicateApiVersionPrefix('https://example.test/api', '/v2/catalog'),
      false,
    );
    assert.equal(
      hasDuplicateApiVersionPrefix(
        'https://example.test/api/v2',
        '/v3/catalog',
      ),
      false,
    );
    assert.equal(
      hasDuplicateApiVersionPrefix(
        'https://example.test/api/v2',
        'https://other.test/v2/catalog',
      ),
      false,
    );
  });

  it('supports explicit api version prefixes', () => {
    assert.equal(
      hasDuplicateApiVersionPrefix(
        'https://example.test/api/v3',
        '/v3/catalog',
        { versionPrefix: '/v3/' },
      ),
      true,
    );
  });
});
