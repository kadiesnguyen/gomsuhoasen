/**
 * SkipTenantCheck decorator.
 *
 * Marks a controller method or class as exempt from tenant-check enforcement.
 * Use sparingly — only for entities that are system-global:
 *
 * - User (global identity principal)
 * - Party / PartyIdentity (global identity)
 * - Plan / Feature (system-global catalog)
 * - BusinessType (system-global config)
 * - Tenant (self-referential meta operation)
 *
 * @example
 * ```ts
 * @SkipTenantCheck()
 * @Get(':id')
 * findUser(@Param('id') id: string) { ... }
 * ```
 */

import { SetMetadata } from '@nestjs/common';

export const IS_SKIP_TENANT_CHECK_KEY = 'isSkipTenantCheck';

export const SkipTenantCheck = () => SetMetadata(IS_SKIP_TENANT_CHECK_KEY, true);
