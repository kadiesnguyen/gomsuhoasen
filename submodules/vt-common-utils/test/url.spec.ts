import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  appendUrlPathSegments,
  appendUrlQueryString,
  buildUrlQueryString,
  encodeUrlPathSegment,
  replaceUrlPathParam,
} from '../src/lib/url';

describe('url path helpers', () => {
  it('encodes path segment values', () => {
    assert.equal(encodeUrlPathSegment('A/B C'), 'A%2FB%20C');
    assert.equal(encodeUrlPathSegment(123), '123');
    assert.equal(encodeUrlPathSegment(false), 'false');
  });

  it('appends encoded path segments without changing the base path', () => {
    assert.equal(appendUrlPathSegments('/carts', 'member/1'), '/carts/member%2F1');
    assert.equal(appendUrlPathSegments('/notifications/', 'n 1', 'read'), '/notifications/n%201/read');
    assert.equal(appendUrlPathSegments('', 'root'), '/root');
  });

  it('replaces named path params with encoded values', () => {
    assert.equal(replaceUrlPathParam(':id/send/:id', 'id', 'campaign/1'), 'campaign%2F1/send/campaign%2F1');
    assert.equal(replaceUrlPathParam(':id2/:id', 'id', 'x y'), ':id2/x%20y');
    assert.throws(() => replaceUrlPathParam(':id', ' ', 'x'), /paramName is required/);
  });

  it('builds and appends encoded query strings', () => {
    assert.equal(buildUrlQueryString({ q: 'A/B C', page: 2, active: true }), 'q=A%2FB+C&page=2&active=true');
    assert.equal(buildUrlQueryString({ q: '', skip: undefined, none: null }), '');
    assert.equal(appendUrlQueryString('/items', { q: 'A B' }), '/items?q=A+B');
    assert.equal(appendUrlQueryString('/items?page=1', { q: 'A B' }), '/items?page=1&q=A+B');
    assert.equal(appendUrlQueryString('/items', { q: '' }), '/items');
  });
});
