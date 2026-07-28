import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { Schema } from 'mongoose';
import {
  hasAggregateSoftDeleteMatch,
  hasExplicitSoftDeleteFilter,
  softDeleteQueryPlugin,
} from './soft-delete-query.plugin';

describe('softDeleteQueryPlugin', () => {
  it('detects explicit top-level soft-delete filters', () => {
    assert.equal(hasExplicitSoftDeleteFilter({ isDeleted: false }), true);
    assert.equal(hasExplicitSoftDeleteFilter({ isDeleted: { $ne: true } }), true);
    assert.equal(hasExplicitSoftDeleteFilter({ status: 'ACTIVE' }), false);
  });

  it('detects aggregate pipelines that already filter soft-delete state', () => {
    assert.equal(hasAggregateSoftDeleteMatch([{ $match: { isDeleted: { $ne: true } } }]), true);
    assert.equal(hasAggregateSoftDeleteMatch([{ $match: { tenantId: 't1' } }]), false);
  });

  it('registers query and aggregate middleware without adding schema paths', () => {
    const schema = new Schema({ name: String, isDeleted: Boolean });

    softDeleteQueryPlugin(schema);

    assert.equal(schema.path('deletedAt'), undefined);
    assert.equal(schema.path('deletedBy'), undefined);
    assert.equal(schema.path('isDeleted') !== undefined, true);
  });
});
