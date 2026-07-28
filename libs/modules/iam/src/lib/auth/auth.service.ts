/**
 * Auth service — MIGRATED to use @vt/iam-core shared utilities.
 *
 * Changes:
 * - login(): uses buildBaseLoginFlow (replaces inline bcrypt.compare + status check + token mint)
 * - createUser(): uses hashPassword (replaces inline bcrypt.hash)
 * - Token minting: uses createAuthTokenService (replaces direct mintActorAccessToken)
 *
 * Refs read: v2/libs/modules/iam/src/lib/auth/auth.service.ts
 * Kept: password hash, JWT sign, login validation, normalized errors
 * Dropped: OAuth, tenant resolution, invitation, MFA
 */

import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { readFirstTrimmedString, readLowercaseTrimmedString } from '@vt/common-utils';
import { DomainException } from '@vt/platform-error';
import {
  DomainConflictException,
  IAM_ERROR_CODES,
} from '@vt/platform-error';
import {
  createAuthTokenService,
  buildBaseLoginFlow,
  comparePassword,
  hashPassword,
} from '@vt/iam-core';
import { User, UserDocument, UserStatus } from '../schemas/user.schema';
import { buildInitialUserValues } from '../constants/user-writer-initial-values';

@Injectable()
export class AuthService {
  private readonly tokenService;
  private readonly loginFlow;

  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private jwtService: JwtService,
  ) {
    this.tokenService = createAuthTokenService(jwtService, {
      tokenType: 'ghs.access',
    });

    this.loginFlow = buildBaseLoginFlow<UserDocument>({
      findUser: (email) => {
        const normalizedEmail = readLowercaseTrimmedString(email);
        if (!normalizedEmail) {
          throw new DomainException(IAM_ERROR_CODES.AUTH_INVALID_CREDENTIALS, 'Email không hợp lệ', 401);
        }
        return this.userModel
          .findOne({ email: normalizedEmail, isDeleted: false })
          .select('+hashedPassword')
          .then((doc) => doc ?? null);
      },
      getPasswordHash: (user) => user.hashedPassword,
      isLocked: (user) => user.status !== UserStatus.ACTIVE,
      updateLastLogin: async (user) => {
        await this.userModel.updateOne(
          { _id: user._id, isDeleted: false },
          { $set: { lastLoginAt: new Date() } },
        );
      },
      issueToken: (user) => {
        const userId = String(user._id);
        return this.tokenService.issue({
          subjectId: userId,
          claims: {
            email: user.email,
            role: user.role,
          },
        });
      },
      buildUserProjection: (user) => {
        const legacyName = Reflect.get(user as object, 'name');
        const displayName = readFirstTrimmedString(user.fullName, legacyName, user.email) ?? user.email;
        return {
          id: String(user._id),
          fullName: displayName,
          email: user.email,
          role: user.role,
        };
      },
    });
  }

  async login(email: string, password: string) {
    const result = await this.loginFlow.execute(email, password);
    return {
      accessToken: result.token.access_token,
      user: result.user,
    };
  }

  async createUser(fullName: string, email: string, password: string) {
    const normalizedEmail = readLowercaseTrimmedString(email);
    if (!normalizedEmail) {
      throw new DomainException(IAM_ERROR_CODES.AUTH_INVALID_CREDENTIALS, 'Email không hợp lệ', 401);
    }
    const exists = await this.userModel.findOne({
      email: normalizedEmail,
      isDeleted: false,
    });
    if (exists) {
      throw new DomainConflictException(IAM_ERROR_CODES.USER_DUPLICATE_EMAIL, 'Email đã được sử dụng');
    }

    const hashedPw = await hashPassword(password);
    const user = await this.userModel.create(buildInitialUserValues({
      fullName,
      email: normalizedEmail,
      hashedPassword: hashedPw,
    }));

    return {
      id: String(user._id),
      fullName: user.fullName,
      email: user.email,
      role: user.role,
    };
  }

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ) {
    const user = await this.userModel
      .findOne({ _id: userId, isDeleted: false })
      .select('+hashedPassword');
    const currentHash = user?.hashedPassword;
    if (!user || !currentHash || !(await comparePassword(currentPassword, currentHash))) {
      throw new DomainException(
        IAM_ERROR_CODES.AUTH_INVALID_CREDENTIALS,
        'Mật khẩu hiện tại không chính xác',
        401,
      );
    }

    const hashedPassword = await hashPassword(newPassword);
    await this.userModel.updateOne(
      { _id: user._id, isDeleted: false },
      { $set: { hashedPassword } },
    );
    return { updated: true };
  }

  async findById(id: string) {
    return this.userModel.findOne({ _id: id, isDeleted: false });
  }
}
