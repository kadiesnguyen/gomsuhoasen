import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { Schema } from 'mongoose';

import { mongooseNormalizePlugin, normalizePlugin } from './normalize.plugin';

describe('normalizePlugin', () => {
  it('exports the legacy mongooseNormalizePlugin alias for consumer facades', () => {
    assert.equal(mongooseNormalizePlugin, normalizePlugin);
  });

  it('composes existing toJSON transforms before common normalization', () => {
    const schema = new Schema({}, {
      toJSON: {
        virtuals: false,
        transform: (_doc, ret: object) => {
          Reflect.set(ret, 'domain_id', Reflect.get(ret, '_id')?.toString());
          Reflect.set(ret, 'custom', 'kept');
          return ret;
        },
      },
    });

    normalizePlugin(schema);

    const options = schema.get('toJSON') as {
      virtuals?: boolean;
      transform?: (_doc: unknown, ret: object) => object | void;
    };
    const result = options.transform?.(undefined, {
      _id: { toString: () => 'doc-1' },
      __v: 3,
      isDeleted: true,
      deletedAt: new Date('2026-05-13T00:00:00.000Z'),
    });

    assert.equal(options.virtuals, true);
    assert.deepEqual(result, {
      domain_id: 'doc-1',
      custom: 'kept',
      id: 'doc-1',
    });
  });

  it('composes existing toObject transforms without hiding soft-delete internals', () => {
    const schema = new Schema({}, {
      toObject: {
        transform: (_doc, ret: object) => {
          Reflect.set(ret, 'domain_id', Reflect.get(ret, '_id')?.toString());
          return ret;
        },
      },
    });

    normalizePlugin(schema);

    const options = schema.get('toObject') as {
      virtuals?: boolean;
      transform?: (_doc: unknown, ret: object) => object | void;
    };
    const result = options.transform?.(undefined, {
      _id: { toString: () => 'doc-1' },
      __v: 3,
      isDeleted: true,
    });

    assert.deepEqual(result, {
      domain_id: 'doc-1',
      id: 'doc-1',
      isDeleted: true,
    });
  });
});
