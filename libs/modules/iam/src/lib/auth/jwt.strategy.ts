// Refs read: v2/libs/modules/iam/src/lib/auth/jwt.strategy.ts
// Kept: Passport JWT strategy shape, payload extraction
// Dropped: tenant claims, token blacklist

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { DomainException, IAM_ERROR_CODES } from '@vt/platform-error';
import { AuthService } from './auth.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private authService: AuthService,
    configService: ConfigService,
  ) {
    const secret = configService.get<string>('JWT_SECRET');
    if (!secret) {
      throw new Error('JWT_SECRET is required');
    }
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  async validate(payload: { sub: string; email: string; role: string }) {
    const user = await this.authService.findById(payload.sub);
    if (!user) throw new DomainException(IAM_ERROR_CODES.AUTH_INVALID_TOKEN, 'Unauthorized', 401);
    return { userId: payload.sub, email: payload.email, role: payload.role };
  }
}
