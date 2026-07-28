import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { APP_GUARD } from '@nestjs/core';
import type ms = require('ms');
import { User, UserSchema } from './schemas/user.schema';
import { AuthService } from './auth/auth.service';
import { JwtStrategy } from './auth/jwt.strategy';
import { AuthController } from './auth/auth.controller';
import { JwtAuthGuard, RolesGuard } from './auth/guards';
import { AuditLog, AuditLogSchema } from './schemas/audit-log.schema';
import { AuditLoggerService } from '@vt/platform-audit-log';
import { readTrimmedString } from '@vt/common-utils';

const JWT_EXPIRY_PATTERN =
  /^\d+(?:\s?(?:ms|msec|msecs|millisecond|milliseconds|s|sec|secs|second|seconds|m|min|mins|minute|minutes|h|hr|hrs|hour|hours|d|day|days|w|week|weeks|y|yr|yrs|year|years))?$/i;

export function parseJwtExpiresIn(value: string | undefined): number | ms.StringValue {
  const candidate = readTrimmedString(value) ?? '7d';
  if (!JWT_EXPIRY_PATTERN.test(candidate)) {
    throw new Error('JWT_EXPIRY must be a number of seconds or an ms-compatible duration such as 15m, 7d, or 1 hour');
  }
  if (/^\d+$/.test(candidate)) {
    return Number(candidate);
  }
  return candidate as ms.StringValue;
}

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: AuditLog.name, schema: AuditLogSchema },
    ]),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const secret = config.get<string>('JWT_SECRET');
        if (!secret) {
          throw new Error('JWT_SECRET is required');
        }
        const expiresIn = parseJwtExpiresIn(config.get<string>('JWT_EXPIRY'));
        return {
          secret,
          signOptions: { expiresIn },
        };
      },
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    AuditLoggerService,
    JwtStrategy,
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
  exports: [AuthService, AuditLoggerService],
})
export class IamModule {}
