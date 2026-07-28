import type { Schema, Query } from 'mongoose';

/**
 * Mongoose global plugin that adds soft-delete fields and auto-filter behavior.
 *
 * Fields added to every schema:
 * - `isDeleted: boolean` (default false, indexed)
 * - `deletedAt: Date | null`
 * - `deletedBy: string | null`
 *
 * Behavior:
 * - All `find`, `findOne`, `findOneAndUpdate`, `countDocuments` queries
 *   automatically exclude `isDeleted: true` unless the query explicitly
 *   sets `isDeleted` in its filter.
 * - Instance methods: `doc.softDelete(by?)` and `doc.restore()`
 * - Static method: `Model.findWithDeleted(filter)` to include deleted records
 *
 * Usage:
 * ```typescript
 * // In MongooseModule.forRootAsync connection factory:
 * connectionFactory: (connection: Connection) => {
 *   connection.plugin(softDeletePlugin);
 *   return connection;
 * }
 * ```
 *
 * Inspired by OLD_CODE's proven production soft-delete pattern.
 */
export function softDeletePlugin(schema: Schema): void {
  // ── Add fields ──
  schema.add({
    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: { type: Date, default: null },
    deletedBy: { type: String, default: null },
  });

  // ── Auto-filter middleware ──
  const queryMethodPattern =
    /^(find|findOne|findOneAndUpdate|findOneAndDelete|findOneAndReplace|countDocuments|updateOne|updateMany|deleteOne|deleteMany)$/;
  const registerPreHook = schema.pre.bind(schema) as (
    method: RegExp,
    fn: (this: unknown) => void,
  ) => void;

  registerPreHook(queryMethodPattern, function (this: unknown) {
    const query = this as Query<unknown, unknown>;
    const filter = query.getFilter();
    // Only auto-filter if the caller didn't explicitly set isDeleted
    if (filter['isDeleted'] === undefined) {
      query.where({ isDeleted: { $ne: true } });
    }
  });

  // ── Aggregate pipeline middleware ──
  registerPreHook(/^aggregate$/, function (this: unknown) {
    const aggregate = this as { pipeline(): Array<Record<string, unknown>> };
    const pipeline = aggregate.pipeline();
    // Prepend $match stage unless pipeline already filters isDeleted
    const hasDeletedFilter = pipeline.some(
      (stage) =>
        '$match' in stage &&
        (stage['$match'] as Record<string, unknown>)['isDeleted'] !== undefined,
    );
    if (!hasDeletedFilter) {
      pipeline.unshift({ $match: { isDeleted: { $ne: true } } });
    }
  });

  // ── Instance methods ──
  schema.method(
    'softDelete',
    async function (deletedBy?: string): Promise<unknown> {
      this.set('isDeleted', true);
      this.set('deletedAt', new Date());
      this.set('deletedBy', deletedBy ?? null);
      return this.save();
    },
  );

  schema.method('restore', async function (): Promise<unknown> {
    this.set('isDeleted', false);
    this.set('deletedAt', null);
    this.set('deletedBy', null);
    return this.save();
  });

  // ── Static methods ──
  schema.static('findWithDeleted', function (filter = {}) {
    return this.find({ ...filter, isDeleted: { $in: [true, false] } });
  });

  schema.static('findOneWithDeleted', function (filter = {}) {
    return this.findOne({ ...filter, isDeleted: { $in: [true, false] } });
  });

  schema.static('countWithDeleted', function (filter = {}) {
    return this.countDocuments({ ...filter, isDeleted: { $in: [true, false] } });
  });
}

/**
 * Type augmentation for documents with soft-delete methods.
 */
export interface SoftDeletable {
  isDeleted: boolean;
  deletedAt: Date | null;
  deletedBy: string | null;
  softDelete(deletedBy?: string): Promise<this>;
  restore(): Promise<this>;
}

/**
 * Type augmentation for models with soft-delete static methods.
 */
export interface SoftDeletableModel<T> {
  findWithDeleted(filter?: Record<string, unknown>): ReturnType<import('mongoose').Model<T>['find']>;
  findOneWithDeleted(filter?: Record<string, unknown>): ReturnType<import('mongoose').Model<T>['findOne']>;
  countWithDeleted(filter?: Record<string, unknown>): ReturnType<import('mongoose').Model<T>['countDocuments']>;
}
