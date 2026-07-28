/**
 * Tenant context types.
 *
 * Extracted from zalominiapp v2/libs/core/src/lib/context/tenant-context.ts.
 * Defines the CLS-stored context that identifies the current tenant scope
 * for every request in a multi-tenant application.
 */

import type { ClsStore } from 'nestjs-cls';

/**
 * The type of tenant context for the current request.
 *
 * - TENANT: Normal request scoped to a specific tenant
 * - SYSTEM: Platform-level operation (no tenant boundary)
 * - CROSS_TENANT: Operation spanning multiple tenants (admin/migration)
 * - ANONYMOUS: Unauthenticated request (public endpoints)
 */
export enum TenantContextType {
  TENANT = 'TENANT',
  SYSTEM = 'SYSTEM',
  CROSS_TENANT = 'CROSS_TENANT',
  ANONYMOUS = 'ANONYMOUS',
}

/**
 * Tenant context stored in CLS (Continuation Local Storage).
 *
 * Set by tenant-resolver middleware at the start of each request.
 * Read by services/repositories to scope queries.
 */
export interface TenantContext {
  type: TenantContextType;
  /** Target or effective tenant ID */
  tenantId?: string;
  /** Authenticated user ID */
  userId?: string;
  /** Roles in the effective tenant context */
  roles?: string[];
  /** Permissions in the effective tenant context */
  permissions?: string[];
}

/**
 * CLS store shape that includes tenant context.
 * Used with nestjs-cls ClsService<TenantClsStore>.
 */
export interface TenantClsStore extends ClsStore {
  tenantContext: TenantContext;
}
