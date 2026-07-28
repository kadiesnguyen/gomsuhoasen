/**
 * @vt/platform-auth-guard — Base guard toolkit for NestJS JWT auth.
 *
 * NOT a single guard implementation. Each project has different auth strategies:
 * - v2: Passport JWT + route policy + M2M + tenant context
 * - GHS: Passport JWT + simple @Public() check + role guard
 * - VITA: Custom JWT verify + member lookup + account lock
 *
 * This package provides the shared building blocks:
 * 1. BaseJwtAuthGuard — abstract guard with @Public() support
 * 2. Role guard utilities
 * 3. Guard error helpers
 */

import {
  CanActivate,
  ExecutionContext,
  HttpStatus,
  Injectable,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { DomainException, IAM_ERROR_CODES } from '@vt/platform-error';
import { IS_PUBLIC_KEY } from '@vt/platform-auth-scope';

export const AUTH_GUARD_DEFAULT_MESSAGES = {
  UNAUTHORIZED: 'Unauthorized',
  FORBIDDEN: 'Forbidden',
} as const;

interface PassportJwtGuardContract extends CanActivate {
  handleRequest?<TUser>(
    err: Error | null | undefined,
    user: TUser | null | undefined,
    info: unknown,
    context: ExecutionContext,
  ): TUser | null;
}

type PassportJwtGuardBase = abstract new (...args: never[]) => PassportJwtGuardContract;

function createMissingPassportJwtGuard(): PassportJwtGuardBase {
  return class MissingPassportJwtGuard implements CanActivate {
    canActivate(): boolean {
      throw new DomainException(
        IAM_ERROR_CODES.AUTH_INVALID_TOKEN,
        '@nestjs/passport is required to activate BaseJwtAuthGuard on protected routes',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  };
}

function resolvePassportJwtGuard(): PassportJwtGuardBase {
  try {
    const passportModule = require('@nestjs/passport') as {
      AuthGuard?: (strategy?: string | string[]) => PassportJwtGuardBase;
    };
    if (typeof passportModule.AuthGuard === 'function') {
      return passportModule.AuthGuard('jwt');
    }
  } catch {
    // Keep shared guard utilities importable in owner tests and non-Passport consumers.
  }
  return createMissingPassportJwtGuard();
}

const PassportJwtGuard = resolvePassportJwtGuard();

// ────────────────────────────────────────────────
// Base JWT Auth Guard (Passport-based)
// ────────────────────────────────────────────────

/**
 * Abstract base for Passport-based JWT guards.
 * Handles the @Public() decorator check and provides a hook
 * for project-specific authorization logic.
 *
 * Extend this and override `onAuthenticated()` for custom checks.
 */
@Injectable()
export abstract class BaseJwtAuthGuard extends PassportJwtGuard implements CanActivate {
  constructor(protected readonly reflector: Reflector) {
    super();
  }

  override canActivate(context: ExecutionContext) {
    const isPublic = this.isPublicRoute(context);
    if (isPublic && !this.shouldAuthenticatePublicRoute(context)) return true;
    return super.canActivate(context);
  }

  override handleRequest<TUser>(
    err: Error | null | undefined,
    user: TUser | null | undefined,
    _info: unknown,
    context: ExecutionContext,
  ): TUser | null {
    const isPublic = this.isPublicRoute(context);
    if (err instanceof DomainException) throw err;
    if (err || !user) {
      if (isPublic && this.allowAnonymousPublicRoute(context)) return null;
      throw this.createUnauthorizedError(err);
    }
    if (isPublic && this.skipAuthenticatedPublicRouteChecks(context)) return user;
    return this.onAuthenticated(user, context);
  }

  /**
   * Override to add project-specific post-authentication checks
   * (e.g., tenant context validation, M2M token checks, role enforcement).
   */
  protected onAuthenticated<TUser>(user: TUser, _context: ExecutionContext): TUser {
    return user;
  }

  /**
   * Override when a project wants Passport to parse optional JWTs on public routes.
   * Default keeps the original fast-path behavior for projects such as GHS.
   */
  protected shouldAuthenticatePublicRoute(_context: ExecutionContext): boolean {
    return false;
  }

  protected allowAnonymousPublicRoute(_context: ExecutionContext): boolean {
    return true;
  }

  protected skipAuthenticatedPublicRouteChecks(_context: ExecutionContext): boolean {
    return true;
  }

  protected isPublicRoute(context: ExecutionContext): boolean {
    return this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]) === true;
  }

  protected createUnauthorizedError(original?: Error | null): DomainException {
    return new DomainException(
      IAM_ERROR_CODES.AUTH_INVALID_TOKEN,
      original?.message || AUTH_GUARD_DEFAULT_MESSAGES.UNAUTHORIZED,
      HttpStatus.UNAUTHORIZED,
    );
  }
}

// ────────────────────────────────────────────────
// Simple Role Guard
// ────────────────────────────────────────────────

export const ROLES_KEY = 'roles';

export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);

/**
 * Simple role-based guard. Works with any user object that has a `role` property.
 * Register with `@Roles('ADMIN', 'EDITOR')` decorator.
 */
@Injectable()
export class SimpleRolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles || requiredRoles.length === 0) return true;

    const { user } = context.switchToHttp().getRequest();
    if (!user?.role) return false;
    return requiredRoles.includes(user.role);
  }
}

// ────────────────────────────────────────────────
// Guard Error Helpers
// ────────────────────────────────────────────────

export function guardUnauthorized(message = AUTH_GUARD_DEFAULT_MESSAGES.UNAUTHORIZED): DomainException {
  return new DomainException(IAM_ERROR_CODES.AUTH_INVALID_TOKEN, message, HttpStatus.UNAUTHORIZED);
}

export function guardForbidden(message = AUTH_GUARD_DEFAULT_MESSAGES.FORBIDDEN): DomainException {
  return new DomainException(IAM_ERROR_CODES.AUTH_FORBIDDEN, message, HttpStatus.FORBIDDEN);
}
