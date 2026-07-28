import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { Schema } from 'mongoose';

import { MONGOOSE_NO_DEFAULT, getMongooseSchemaPathDefault } from './schema-defaults';

describe('MONGOOSE_NO_DEFAULT', () => {
  it('suppresses Mongoose implicit array defaults for writer-owned initial values', () => {
    const schema = new Schema({
      items: { type: [String], default: MONGOOSE_NO_DEFAULT },
    });

    const path = schema.path('items') as { defaultValue?: unknown };

    assert.equal(MONGOOSE_NO_DEFAULT, undefined);
    assert.equal(path.defaultValue, undefined);
    assert.equal(getMongooseSchemaPathDefault(schema, 'items'), undefined);
  });

  it('reads explicit schema defaults consistently across Mongoose path shapes', () => {
    const schema = new Schema({
      status: { type: String, default: 'DRAFT' },
    });

    assert.equal(getMongooseSchemaPathDefault(schema, 'status'), 'DRAFT');
    assert.equal(getMongooseSchemaPathDefault(schema, 'missing'), undefined);
  });
});
