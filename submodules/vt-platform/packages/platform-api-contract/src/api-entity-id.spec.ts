import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  readApiEntityId,
  requireApiEntityId,
  withApiCanonicalId,
  withApiCanonicalIds,
  withApiPaginatedCanonicalIds,
} from './api-entity-id';
import { API_CONTRACT_ERROR_MESSAGES, ContractResponseError } from './unwrap-api-response';

describe('api-entity-id', () => {
  it('reads string and canonical id values without accepting _id by default', () => {
    assert.equal(readApiEntityId('abc'), 'abc');
    assert.equal(readApiEntityId({ id: 'abc', _id: 'mongo' }), 'abc');
    assert.equal(readApiEntityId({ _id: 'mongo' }), undefined);
  });

  it('can opt into legacy _id alias support for projects that still expose it', () => {
    assert.equal(readApiEntityId({ _id: 'mongo' }, { allowMongoIdAlias: true }), 'mongo');
    assert.equal(readApiEntityId({ id: '', _id: 'mongo' }, { allowMongoIdAlias: true }), 'mongo');
    assert.equal(readApiEntityId({ id: '' }, { allowMongoIdAlias: true }), '');
  });

  it('throws source-tagged errors for missing required ids', () => {
    assert.throws(
      () => requireApiEntityId({ _id: 'mongo' }, 'entity.read'),
      (error) => error instanceof ContractResponseError
        && error.message === `[entity.read] ${API_CONTRACT_ERROR_MESSAGES.EXPECTED_ENTITY_ID}`,
    );
  });

  it('normalizes single, array, and paginated items with explicit _id policy', () => {
    assert.deepEqual(withApiCanonicalId({ _id: 'mongo', name: 'A' }, 'entity', { allowMongoIdAlias: true }), {
      _id: 'mongo',
      id: 'mongo',
      name: 'A',
    });
    assert.deepEqual(withApiCanonicalIds([{ id: 'a' }, { _id: 'b' }], 'list', { allowMongoIdAlias: true }), [
      { id: 'a' },
      { _id: 'b', id: 'b' },
    ]);
    assert.deepEqual(
      withApiPaginatedCanonicalIds(
        { items: [{ _id: 'b' }], total: 1, page: 1, limit: 10, totalPages: 1 },
        'page',
        { allowMongoIdAlias: true },
      ),
      { items: [{ _id: 'b', id: 'b' }], total: 1, page: 1, limit: 10, totalPages: 1 },
    );
  });
});
