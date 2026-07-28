/**
 * @vt/tenant-core — Multi-tenant context and query safety primitives.
 *
 * Extracted from zalominiapp v2/libs/core tenant-related code.
 * Provides:
 * - TenantContext type and CLS-based TenantContextService
 * - Tenant-safe query helpers (tenantFilter, tenantFindById)
 * - Skip-tenant-check decorator for exempt entities
 *
 * Single-tenant projects (e.g. GHS) do NOT need this package.
 * Multi-tenant projects (v2, vita) MUST use tenant-safe helpers
 * for every query on tenant-owned entities.
 *
 * @example
 * ```ts
 * import { TenantContextService, tenantFilter, tenantFindById } from '.';
 *
 * // In service:
 * const docs = await this.model.find({ ...tenantFilter(tenantId), status: 'ACTIVE' });
 * const doc = await this.model.findOne(tenantFindById(tenantId, id));
 * ```
 */

export {
  TenantContextType,
  type TenantContext,
  type TenantClsStore,
} from './lib/tenant-context';

export { TenantContextService } from './lib/tenant-context.service';

export {
  tenantFilter,
  tenantFindById,
  tenantFileFilter,
} from './lib/tenant-filter';

export {
  IS_SKIP_TENANT_CHECK_KEY,
  SkipTenantCheck,
} from './lib/skip-tenant-check.decorator';
