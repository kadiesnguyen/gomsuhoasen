import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { HttpStatus, type ExecutionContext } from '@nestjs/common';
import type { Reflector } from '@nestjs/core';
import { DomainException, IAM_ERROR_CODES } from '@vt/platform-error';
import {
  AUTH_GUARD_DEFAULT_MESSAGES,
  BaseJwtAuthGuard,
  guardForbidden,
  guardUnauthorized,
} from './auth-guard';

class TestJwtAuthGuard extends BaseJwtAuthGuard {
  public authenticatedCalls = 0;

  protected override onAuthenticated<TUser>(user: TUser, context: ExecutionContext): TUser {
    this.authenticatedCalls += 1;
    return super.onAuthenticated(user, context);
  }
}

class PublicParsingJwtAuthGuard extends TestJwtAuthGuard {
  protected override shouldAuthenticatePublicRoute(): boolean {
    return true;
  }
}

function contextStub(): ExecutionContext {
  return {
    getHandler: () => (() => undefined),
    getClass: () => class TestController {},
    switchToHttp: () => ({
      getRequest: () => ({ user: undefined }),
    }),
  } as unknown as ExecutionContext;
}

function reflector(isPublic: boolean): Reflector {
  return {
    getAllAndOverride: () => isPublic,
  } as unknown as Reflector;
}

describe('BaseJwtAuthGuard', () => {
  it('skips Passport activation for public routes by default', () => {
    const guard = new TestJwtAuthGuard(reflector(true));

    assert.equal(guard.canActivate(contextStub()), true);
    assert.equal(guard.authenticatedCalls, 0);
  });

  it('allows anonymous public routes when subclasses opt into public Passport parsing', () => {
    const guard = new PublicParsingJwtAuthGuard(reflector(true));

    const result = guard.handleRequest(null, null, undefined, contextStub());

    assert.equal(result, null);
    assert.equal(guard.authenticatedCalls, 0);
  });

  it('returns authenticated public users without project-specific checks by default', () => {
    const guard = new PublicParsingJwtAuthGuard(reflector(true));
    const user = { sub: 'user-1' };

    assert.equal(guard.handleRequest(null, user, undefined, contextStub()), user);
    assert.equal(guard.authenticatedCalls, 0);
  });

  it('rejects missing users on protected routes', () => {
    const guard = new TestJwtAuthGuard(reflector(false));

    assert.throws(
      () => guard.handleRequest(null, null, undefined, contextStub()),
      DomainException,
    );
  });

  it('creates canonical auth DomainException helpers', () => {
    const unauthorized = guardUnauthorized();
    const forbidden = guardForbidden();

    assert.equal(unauthorized.errorCode, IAM_ERROR_CODES.AUTH_INVALID_TOKEN);
    assert.match(unauthorized.message, new RegExp(AUTH_GUARD_DEFAULT_MESSAGES.UNAUTHORIZED));
    assert.equal(unauthorized.getStatus(), HttpStatus.UNAUTHORIZED);
    assert.equal(forbidden.errorCode, IAM_ERROR_CODES.AUTH_FORBIDDEN);
    assert.match(forbidden.message, new RegExp(AUTH_GUARD_DEFAULT_MESSAGES.FORBIDDEN));
    assert.equal(forbidden.getStatus(), HttpStatus.FORBIDDEN);
  });
});
