import type { Query, Schema } from 'mongoose';

export interface SoftDeleteQueryPluginOptions {
  field?: string;
  deletedValue?: unknown;
}

const DEFAULT_FIELD = 'isDeleted';

export function hasExplicitSoftDeleteFilter(filter: Record<string, unknown>, field = DEFAULT_FIELD): boolean {
  return Object.prototype.hasOwnProperty.call(filter, field);
}

export function hasAggregateSoftDeleteMatch(
  pipeline: Array<Record<string, unknown>>,
  field = DEFAULT_FIELD,
): boolean {
  return pipeline.some((stage) => {
    const match = stage['$match'];
    return (
      match !== null &&
      typeof match === 'object' &&
      Object.prototype.hasOwnProperty.call(match as Record<string, unknown>, field)
    );
  });
}

/**
 * Query-only soft-delete plugin for legacy schemas that already define their own
 * soft-delete/audit fields. Unlike `softDeletePlugin`, this does not add fields
 * or methods; it only applies a default `{ field: { $ne: deletedValue } }`
 * filter unless the caller explicitly sets the soft-delete field.
 */
export function softDeleteQueryPlugin(schema: Schema, options: SoftDeleteQueryPluginOptions = {}): void {
  const field = options.field ?? DEFAULT_FIELD;
  const deletedValue = options.deletedValue ?? true;
  const activeFilter = { [field]: { $ne: deletedValue } };

  const queryMethodPattern =
    /^(find|findOne|findOneAndUpdate|findOneAndDelete|findOneAndReplace|countDocuments|updateOne|updateMany|deleteOne|deleteMany)$/;
  const registerPreHook = schema.pre.bind(schema) as (
    method: RegExp,
    fn: (this: unknown) => void,
  ) => void;

  registerPreHook(queryMethodPattern, function (this: unknown) {
    const query = this as Query<unknown, unknown>;
    const filter = query.getFilter() as Record<string, unknown>;
    if (!hasExplicitSoftDeleteFilter(filter, field)) {
      query.where(activeFilter);
    }
  });

  registerPreHook(/^aggregate$/, function (this: unknown) {
    const aggregate = this as { pipeline(): Array<Record<string, unknown>> };
    const pipeline = aggregate.pipeline();
    if (!hasAggregateSoftDeleteMatch(pipeline, field)) {
      pipeline.unshift({ $match: activeFilter });
    }
  });
}
