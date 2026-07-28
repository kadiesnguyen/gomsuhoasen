// Refs read:
// - /Users/bonbon177tb/Documents/zalominiapp/v2/libs/modules/iam/src/lib/auth/auth.service.spec.ts
// Adapted: GHS single-tenant login, create-user, and normalized output.
// Updated: align with @vt/iam-core createAuthTokenService contract (jti, nbf, expiresIn).

import { HttpException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { getMongooseSchemaPathDefault } from '@vt/platform-mongoose';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { buildInitialUserValues } from '../constants/user-writer-initial-values';
import { UserRole, UserSchema, UserStatus } from '../schemas/user.schema';

describe('AuthService', () => {
  function createService() {
    const select = jest.fn();
    const userModel = {
      findOne: jest.fn().mockReturnValue({ select }),
      updateOne: jest.fn().mockResolvedValue({ modifiedCount: 1 }),
      create: jest.fn(),
    };
    const jwtService = new JwtService({ secret: 'test-secret' });
    const signSpy = jest.spyOn(jwtService, 'sign').mockReturnValue('signed-token');

    return {
      select,
      userModel,
      signSpy,
      service: new AuthService(userModel as never, jwtService),
    };
  }

  describe('schema initial values', () => {
    it('keeps user business initial values out of schema defaults', () => {
      expect(getMongooseSchemaPathDefault(UserSchema, 'role')).toBeUndefined();
      expect(getMongooseSchemaPathDefault(UserSchema, 'status')).toBeUndefined();
      expect(getMongooseSchemaPathDefault(UserSchema, 'isDeleted')).toBeUndefined();
    });

    it('centralizes user writer initial values explicitly', () => {
      expect(buildInitialUserValues({
        fullName: 'Editor',
        email: 'editor@gomhoasen.vn',
        hashedPassword: 'hash',
      })).toMatchObject({
        role: UserRole.EDITOR,
        status: UserStatus.ACTIVE,
        isDeleted: false,
      });
    });
  });

  it('[IAM-001] logs in active admin and returns token plus normalized user', async () => {
    const { service, select, userModel, signSpy } = createService();
    const password = 'UnitTestAdmin123!';
    const hashedPassword = await bcrypt.hash(password, 10);
    select.mockResolvedValue({
      _id: 'user-1',
      fullName: 'Admin GHS',
      email: 'admin@gomhoasen.vn',
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE,
      hashedPassword,
    });

    const result = await service.login('ADMIN@GOMHOASEN.VN', password);

    expect(userModel.findOne).toHaveBeenCalledWith({
      email: 'admin@gomhoasen.vn',
      isDeleted: false,
    });
    // @vt/iam-core createAuthTokenService adds jti, nbf, and passes { expiresIn } options
    expect(signSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        sub: 'user-1',
        type: 'ghs.access',
        email: 'admin@gomhoasen.vn',
        role: UserRole.ADMIN,
        nbf: expect.any(Number),
        jti: expect.any(String),
      }),
      { expiresIn: 604800 },
    );
    expect(result).toEqual({
      accessToken: 'signed-token',
      user: {
        id: 'user-1',
        fullName: 'Admin GHS',
        email: 'admin@gomhoasen.vn',
        role: UserRole.ADMIN,
      },
    });
  });

  it('[IAM-002] rejects invalid credentials when user is missing', async () => {
    const { service, select } = createService();
    select.mockResolvedValue(null);

    await expect(service.login('missing@gomhoasen.vn', 'badpass'))
      .rejects.toBeInstanceOf(HttpException);
  });

  it('[IAM-002] rejects invalid credentials when password compare fails', async () => {
    const { service, select } = createService();
    select.mockResolvedValue({
      _id: 'user-1',
      email: 'admin@gomhoasen.vn',
      status: UserStatus.ACTIVE,
      hashedPassword: await bcrypt.hash('real-password', 10),
    });

    await expect(service.login('admin@gomhoasen.vn', 'badpass'))
      .rejects.toBeInstanceOf(HttpException);
  });

  it('[IAM-002] rejects blank email on login', async () => {
    const { service } = createService();

    await expect(service.login('   ', 'anypass'))
      .rejects.toBeInstanceOf(HttpException);
  });

  it('[IAM-003] finds an active user by id', async () => {
    const { service, userModel } = createService();
    userModel.findOne.mockReturnValueOnce(Promise.resolve({ _id: 'user-1' }));

    await expect(service.findById('user-1')).resolves.toEqual({ _id: 'user-1' });
    expect(userModel.findOne).toHaveBeenCalledWith({ _id: 'user-1', isDeleted: false });
  });

  it('[IAM-004] rejects duplicate email on create user', async () => {
    const { service, userModel } = createService();
    userModel.findOne.mockReturnValueOnce(Promise.resolve({ _id: 'existing' }));

    await expect(service.createUser('Editor', 'editor@gomhoasen.vn', 'secret123'))
      .rejects.toBeInstanceOf(HttpException);
  });

  it('[IAM-004] creates editor user with lowercase email', async () => {
    const { service, userModel } = createService();
    userModel.findOne.mockReturnValueOnce(Promise.resolve(null));
    userModel.create.mockResolvedValue({
      _id: 'user-2',
      fullName: 'Editor',
      email: 'editor@gomhoasen.vn',
      role: UserRole.EDITOR,
    });

    const result = await service.createUser('Editor', 'EDITOR@GOMHOASEN.VN', 'secret123');

    expect(userModel.create).toHaveBeenCalledWith(expect.objectContaining({
      fullName: 'Editor',
      email: 'editor@gomhoasen.vn',
      hashedPassword: expect.any(String),
      role: UserRole.EDITOR,
      status: UserStatus.ACTIVE,
      isDeleted: false,
    }));
    expect(result).toEqual({
      id: 'user-2',
      fullName: 'Editor',
      email: 'editor@gomhoasen.vn',
      role: UserRole.EDITOR,
    });
  });

  it('[IAM-004] rejects blank email on create user', async () => {
    const { service } = createService();

    await expect(service.createUser('Editor', '  ', 'secret123'))
      .rejects.toBeInstanceOf(HttpException);
  });

  it('[IAM-005] changes password after verifying the current password', async () => {
    const { service, select, userModel } = createService();
    select.mockResolvedValue({
      _id: 'user-1',
      hashedPassword: await bcrypt.hash('current-password', 10),
    });

    await expect(
      service.changePassword('user-1', 'current-password', 'new-secure-password'),
    ).resolves.toEqual({ updated: true });

    expect(userModel.findOne).toHaveBeenCalledWith({
      _id: 'user-1',
      isDeleted: false,
    });
    expect(userModel.updateOne).toHaveBeenCalledWith(
      { _id: 'user-1', isDeleted: false },
      { $set: { hashedPassword: expect.any(String) } },
    );
  });

  it('[IAM-005] rejects an invalid current password', async () => {
    const { service, select, userModel } = createService();
    select.mockResolvedValue({
      _id: 'user-1',
      hashedPassword: await bcrypt.hash('current-password', 10),
    });

    await expect(
      service.changePassword('user-1', 'wrong-password', 'new-secure-password'),
    ).rejects.toBeInstanceOf(HttpException);
    expect(userModel.updateOne).not.toHaveBeenCalled();
  });
});

