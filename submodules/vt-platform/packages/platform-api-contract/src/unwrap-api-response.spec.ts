import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  API_CONTRACT_ERROR_MESSAGES,
  ContractResponseError,
  expectApiArray,
  expectApiObject,
  expectApiPaginated,
  unwrapApiData,
  unwrapApiResponse,
} from './unwrap-api-response';

describe('platform-api-contract unwrap helpers', () => {
  it('keeps backward-compatible unwrapApiResponse behavior', () => {
    assert.deepEqual(
      unwrapApiResponse({ success: true, data: { id: 'a' } }),
      { id: 'a' },
    );
    assert.deepEqual(unwrapApiResponse({ id: 'raw' }), { id: 'raw' });
  });

  it('unwrapApiData returns envelope data and supports raw payloads', () => {
    assert.deepEqual(
      unwrapApiData<{ id: string }>({ success: true, data: { id: 'a' } }, 'test.object'),
      { id: 'a' },
    );
    assert.deepEqual(unwrapApiData<string[]>({ items: ['a'] }, 'test.raw'), { items: ['a'] });
  });

  it('unwrapApiData throws source-tagged errors for platform error envelopes', () => {
    assert.throws(
      () => unwrapApiData(
        {
          success: false,
          error: { code: 'ORDER_INVALID_STATE', message: 'Invalid state' },
        },
        'orders.confirm',
      ),
      (error) => error instanceof ContractResponseError
        && error.message === '[orders.confirm] Invalid state',
    );
  });

  it('uses trimmed error codes only when an envelope has no explicit message', () => {
    assert.throws(
      () => unwrapApiData(
        {
          success: false,
          error: { code: '  ORDER_INVALID_STATE  ', message: ' ' },
        },
        'orders.confirm',
      ),
      (error) => error instanceof ContractResponseError
        && error.message === '[orders.confirm] ORDER_INVALID_STATE',
    );
  });

  it('expectApiObject validates object payloads', () => {
    assert.deepEqual(
      expectApiObject<{ id: string }>({ success: true, data: { id: 'a' } }, 'object'),
      { id: 'a' },
    );
    assert.throws(
      () => expectApiObject({ success: true, data: ['a'] }, 'object'),
      new RegExp(API_CONTRACT_ERROR_MESSAGES.EXPECTED_OBJECT_PAYLOAD),
    );
  });

  it('expectApiArray accepts arrays and paginated item payloads', () => {
    assert.deepEqual(expectApiArray<string>({ success: true, data: ['a'] }, 'array'), ['a']);
    assert.deepEqual(expectApiArray<string>({ items: ['a'] }, 'array'), ['a']);
    assert.throws(
      () => expectApiArray<string>({ success: true, data: { value: 'a' } }, 'array'),
      new RegExp(API_CONTRACT_ERROR_MESSAGES.EXPECTED_ARRAY_OR_PAGINATED_PAYLOAD),
    );
  });

  it('expectApiPaginated normalizes arrays and paginated item payloads', () => {
    assert.deepEqual(expectApiPaginated<string>(['a', 'b'], 'page'), {
      items: ['a', 'b'],
      total: 2,
      page: 1,
      limit: 2,
      totalPages: 1,
    });
    assert.deepEqual(expectApiPaginated<string>({ items: ['a'], total: 3 }, 'page'), {
      items: ['a'],
      total: 3,
      page: 1,
      limit: 1,
      totalPages: 1,
    });
    assert.throws(
      () => expectApiPaginated<string>({ success: true, data: { value: 'a' } }, 'page'),
      new RegExp(API_CONTRACT_ERROR_MESSAGES.EXPECTED_PAGINATED_PAYLOAD),
    );
  });
});
