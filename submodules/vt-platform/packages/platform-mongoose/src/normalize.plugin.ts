import type { Schema } from 'mongoose';

type MongooseTransform = (
  doc: unknown,
  ret: object,
  options?: unknown,
) => object | void;

type MongooseOutputOptions = {
  virtuals?: boolean;
  transform?: MongooseTransform;
  versionKey?: boolean;
  getters?: boolean;
  minimize?: boolean;
  flattenMaps?: boolean;
  flattenObjectIds?: boolean;
};

/**
 * Mongoose plugin to normalize JSON output.
 *
 * Transforms:
 * - `_id` → `id` (string)
 * - Removes `__v`
 * - Removes `isDeleted`, `deletedAt`, `deletedBy` from JSON output
 *   (soft-delete fields are internal, not exposed to API consumers)
 *
 * This is the common version of the normalize plugin used across all projects.
 * 3d already has `mongooseNormalizePlugin` in `@gomhoasen/core` — this
 * supersedes it when adopting `@vt/platform-mongoose`.
 */
export function normalizePlugin(schema: Schema): void {
  const existingToJson = getOutputOptions(schema, 'toJSON');
  const existingToObject = getOutputOptions(schema, 'toObject');

  schema.set('toJSON', {
    ...existingToJson,
    virtuals: true,
    transform: composeNormalizeTransform(existingToJson.transform, { hideSoftDelete: true }),
  });

  schema.set('toObject', {
    ...existingToObject,
    virtuals: true,
    transform: composeNormalizeTransform(existingToObject.transform, { hideSoftDelete: false }),
  });
}

/**
 * Backward-compatible alias for consumers migrating from older `@vt/nest-core`
 * wrappers that exposed `mongooseNormalizePlugin`.
 */
export const mongooseNormalizePlugin = normalizePlugin;

function getOutputOptions(schema: Schema, key: 'toJSON' | 'toObject'): MongooseOutputOptions {
  const current = schema.get(key) as MongooseOutputOptions | undefined;
  return current && typeof current === 'object' ? current : {};
}

function composeNormalizeTransform(
  existingTransform: MongooseTransform | undefined,
  options: { hideSoftDelete: boolean },
): MongooseTransform {
  return (doc: unknown, ret: object, transformOptions?: unknown) => {
    const transformed = existingTransform?.(doc, ret, transformOptions);
    const target = isOutputObject(transformed) ? transformed : ret;
    return normalizeRecord(target, options);
  };
}

function normalizeRecord(
  ret: object,
  options: { hideSoftDelete: boolean },
): object {
  const id = Reflect.get(ret, '_id');
  if (id !== undefined && id !== null) {
    Reflect.set(ret, 'id', String(id));
    Reflect.deleteProperty(ret, '_id');
  }
  Reflect.deleteProperty(ret, '__v');
  if (options.hideSoftDelete) {
    Reflect.deleteProperty(ret, 'isDeleted');
    Reflect.deleteProperty(ret, 'deletedAt');
    Reflect.deleteProperty(ret, 'deletedBy');
  }
  return ret;
}

function isOutputObject(value: unknown): value is object {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}
