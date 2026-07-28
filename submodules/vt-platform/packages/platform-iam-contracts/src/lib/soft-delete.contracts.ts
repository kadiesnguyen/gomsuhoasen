/**
 * Shared soft-delete field contracts.
 *
 * All three projects use the same soft-delete pattern:
 * - v2:  isDeleted + deletedAt + deletedById
 * - vita: deleted_at + deleted_by (snake_case, no isDeleted boolean)
 * - GHS: isDeleted + deletedAt
 *
 * This contract standardizes the pattern for new modules.
 */

/**
 * Soft-delete fields that every deletable entity should implement.
 *
 * Recommended approach (matching v2 + GHS canonical pattern):
 * - Use `isDeleted` boolean with index for query performance
 * - Use `deletedAt` timestamp for audit trail
 * - Optionally track `deletedBy` for accountability
 */
export interface SoftDeleteFields {
  /** Whether the entity has been soft-deleted. Should be indexed. */
  isDeleted: boolean;

  /** Timestamp when the entity was deleted. */
  deletedAt?: Date;

  /** ID of the user who deleted the entity (optional). */
  deletedBy?: string;
}

/**
 * Audit timestamp fields common to all entities.
 */
export interface TimestampFields {
  /** Creation timestamp (auto-managed by Mongoose timestamps: true). */
  createdAt?: Date;

  /** Last update timestamp (auto-managed by Mongoose timestamps: true). */
  updatedAt?: Date;
}

/**
 * Audit actor fields for tracking who created/updated an entity.
 */
export interface AuditActorFields {
  /** ID of the user who created the entity. */
  createdBy?: string;

  /** ID of the user who last updated the entity. */
  updatedBy?: string;
}
