// Refs read: @vt/platform-auth-guard, @vt/platform-auth-scope
// Kept GHS public API while delegating shared guard primitives to vt-platform.

import { Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  BaseJwtAuthGuard,
  Roles,
  SimpleRolesGuard,
} from '@vt/platform-auth-guard';
import {
  CurrentUser,
  IS_PUBLIC_KEY,
  Public,
} from '@vt/platform-auth-scope';

export { CurrentUser, IS_PUBLIC_KEY, Public, Roles };

@Injectable()
export class JwtAuthGuard extends BaseJwtAuthGuard {
  constructor(reflector: Reflector) {
    super(reflector);
  }
}

@Injectable()
export class RolesGuard extends SimpleRolesGuard {
  constructor(reflector: Reflector) {
    super(reflector);
  }
}
