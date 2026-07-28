/**
 * CLS-based TenantContextService.
 *
 * Extracted from zalominiapp v2/libs/core/src/lib/context/tenant-context.service.ts.
 * Wraps nestjs-cls to provide tenant context get/set for the current request.
 *
 * @example
 * ```ts
 * @Injectable()
 * export class OrderService {
 *   constructor(private readonly tenantCtx: TenantContextService) {}
 *
 *   async findOrders() {
 *     const tenantId = this.tenantCtx.tenantId;
 *     if (!tenantId) throw new Error('No tenant context');
 *     return this.orderModel.find(tenantFilter(tenantId));
 *   }
 * }
 * ```
 */

import { Injectable } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import { TenantContext, TenantClsStore, TenantContextType } from './tenant-context';

@Injectable()
export class TenantContextService {
  constructor(private readonly cls: ClsService<TenantClsStore>) {}

  /** Set the tenant context for the current request (called by middleware). */
  setContext(ctx: TenantContext): void {
    this.cls.set('tenantContext', ctx);
  }

  /** Get the full tenant context, or undefined if not set. */
  getContext(): TenantContext | undefined {
    return this.cls.get('tenantContext');
  }

  /** Get the current tenant ID, or undefined if no tenant scope. */
  get tenantId(): string | undefined {
    return this.cls.get('tenantContext.tenantId');
  }

  /** Get the current user ID, or undefined. */
  get userId(): string | undefined {
    return this.cls.get('tenantContext.userId');
  }

  /** Check if current context is SYSTEM (platform-level, no tenant boundary). */
  get isSystem(): boolean {
    return this.cls.get('tenantContext.type') === TenantContextType.SYSTEM;
  }

  /** Check if current context is a normal tenant-scoped request. */
  get isTenantScoped(): boolean {
    return this.cls.get('tenantContext.type') === TenantContextType.TENANT;
  }

  /** Get roles for the current context. */
  get roles(): string[] {
    return this.cls.get('tenantContext.roles') ?? [];
  }
}
