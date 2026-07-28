/**
 * Tenant-safe query filter helpers.
 *
 * Extracted from zalominiapp v2/libs/core/src/lib/utils/tenant-safe.ts.
 * These helpers ensure every query on tenant-owned entities includes
 * the tenantId predicate — critical for multi-tenant data isolation.
 *
 * @rule Every query on a tenant-owned entity MUST use these helpers
 *       instead of raw Mongoose findById / findByIdAndUpdate.
 *
 * @example
 * ```ts
 * // ❌ BANNED:
 * const doc = await this.model.findById(id);
 *
 * // ✅ REQUIRED:
 * const doc = await this.model.findOne(tenantFindById(tenantId, id));
 * ```
 */

import { Types } from 'mongoose';

/**
 * Parse a string to a Mongoose ObjectId, or return undefined if invalid.
 */
function parseObjectId(value: string | undefined): Types.ObjectId | undefined {
  if (!value || typeof value !== 'string') return undefined;
  try {
    return new Types.ObjectId(value);
  } catch {
    return undefined;
  }
}

/**
 * Parse a string to a Mongoose ObjectId, or throw.
 */
function requireObjectId(value: string | undefined, errorMessage = 'Invalid ObjectId'): Types.ObjectId {
  const oid = parseObjectId(value);
  if (!oid) throw new Error(errorMessage);
  return oid;
}

/**
 * Build a tenant-safe filter predicate for list/search queries.
 * Combines tenantId + isDeleted for the most common pattern.
 *
 * @example
 * ```ts
 * const docs = await this.model.find({ ...tenantFilter(tenantId), status: 'ACTIVE' });
 * ```
 */
export function tenantFilter(tenantId: string): {
  tenantId: Types.ObjectId;
  isDeleted: false;
} {
  const tenantObjectId = parseObjectId(tenantId);
  if (!tenantObjectId) {
    throw new Error('tenantFilter: tenantId is required and must be a valid ObjectId');
  }
  return {
    tenantId: tenantObjectId,
    isDeleted: false,
  };
}

/**
 * Build a tenant-safe find-by-id predicate.
 * Replaces `findById(id)` for tenant-owned entities.
 *
 * @example
 * ```ts
 * const doc = await this.model.findOne(tenantFindById(tenantId, id));
 * ```
 */
export function tenantFindById(
  tenantId: string,
  id: string | Types.ObjectId,
): { _id: Types.ObjectId; tenantId: Types.ObjectId; isDeleted: false } {
  const tenantObjectId = parseObjectId(tenantId);
  if (!tenantObjectId) {
    throw new Error('tenantFindById: tenantId is required and must be a valid ObjectId');
  }
  const entityObjectId = requireObjectId(
    id?.toString(),
    'tenantFindById: entity id is required and must be a valid ObjectId',
  );
  return {
    _id: entityObjectId,
    tenantId: tenantObjectId,
    isDeleted: false,
  };
}

/**
 * Build a tenant-safe filter for file asset resolution.
 * FileAssets are tenant-owned; all resolution MUST include tenantId.
 *
 * @example
 * ```ts
 * const asset = await connection.collection('file_assets').findOne(
 *   tenantFileFilter(tenantId, fileId),
 * );
 * ```
 */
export function tenantFileFilter(
  tenantId: string,
  fileId: string | Types.ObjectId,
): { _id: Types.ObjectId; tenantId: Types.ObjectId; status: { $in: string[] } } {
  const tenantObjectId = parseObjectId(tenantId);
  if (!tenantObjectId) {
    throw new Error('tenantFileFilter: tenantId is required and must be a valid ObjectId');
  }
  return {
    _id: requireObjectId(fileId?.toString(), 'tenantFileFilter: fileId is required'),
    tenantId: tenantObjectId,
    status: { $in: ['ACTIVE', 'ATTACHED'] },
  };
}
