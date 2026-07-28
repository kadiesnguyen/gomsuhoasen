// Refs read:
// - /Users/bonbon177tb/Documents/zalominiapp/v2/libs/modules/iam/src/lib/guards/roles.guard.spec.ts
// Adapted: GHS ADMIN/EDITOR role guard.

import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { USER_ROLE_GROUPS, USER_ROLES, type UserRole } from '@gomhoasen/contracts';
import { RolesGuard } from './guards';

type RoleRequest = { user?: { role: UserRole } };

describe('RolesGuard', () => {
  function contextFor(role?: UserRole): ExecutionContext {
    return {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      getArgs: jest.fn().mockReturnValue([]),
      getArgByIndex: jest.fn(),
      getType: jest.fn().mockReturnValue('http'),
      switchToHttp: () => ({
        getRequest: <T = RoleRequest>() => ({ user: role ? { role } : undefined }) as T,
        getResponse: jest.fn(),
        getNext: jest.fn(),
      }),
      switchToRpc: () => ({
        getContext: jest.fn(),
        getData: jest.fn(),
      }),
      switchToWs: () => ({
        getClient: jest.fn(),
        getData: jest.fn(),
        getPattern: jest.fn(),
      }),
    };
  }

  it('[IAM-004] allows when no role metadata is required', () => {
    const reflector = new Reflector();
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);
    const guard = new RolesGuard(reflector);

    expect(guard.canActivate(contextFor(USER_ROLES.EDITOR))).toBe(true);
  });

  it('[IAM-004] allows ADMIN for ADMIN-only route', () => {
    const reflector = new Reflector();
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(USER_ROLE_GROUPS.ADMIN_ONLY);
    const guard = new RolesGuard(reflector);

    expect(guard.canActivate(contextFor(USER_ROLES.ADMIN))).toBe(true);
  });

  it('[IAM-004] denies EDITOR for ADMIN-only route', () => {
    const reflector = new Reflector();
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(USER_ROLE_GROUPS.ADMIN_ONLY);
    const guard = new RolesGuard(reflector);

    expect(guard.canActivate(contextFor(USER_ROLES.EDITOR))).toBe(false);
  });
});
