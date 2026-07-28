/**
 * Shared login flow builder.
 *
 * All three projects implement the same login sequence:
 * 1. Find user by identifier (email or phone)
 * 2. Check password hash
 * 3. Check account status (not locked/suspended)
 * 4. Update lastLoginAt
 * 5. Issue JWT token
 * 6. Return token + user projection
 *
 * This builder captures that common pattern with configurable callbacks.
 *
 * @example
 * ```ts
 * const result = await buildBaseLoginFlow({
 *   findUser: (id) => userModel.findOne({ email: id, isDeleted: false }).select('+hashedPassword'),
 *   getPasswordHash: (user) => user.hashedPassword,
 *   isLocked: (user) => user.status !== 'ACTIVE',
 *   getLockedMessage: () => 'Account locked',
 *   updateLastLogin: (user) => userModel.updateOne({ _id: user._id }, { lastLoginAt: new Date() }),
 *   issueToken: (user) => tokenService.issue({ subjectId: user._id.toString() }),
 *   buildUserProjection: (user) => ({ id: user._id.toString(), fullName: user.fullName }),
 * }).execute('admin@example.com', 'password123');
 * ```
 */

import { DomainException, IAM_ERROR_CODES } from '@vt/platform-error';
import { comparePassword } from './password.utils';
import type { AuthTokenPair } from './auth-token-factory';

export interface LoginFlowConfig<TUser> {
  /** Find user/member by identifier (email, phone, member_code) */
  findUser: (identifier: string) => Promise<TUser | null>;

  /** Extract the password hash from the found user */
  getPasswordHash: (user: TUser) => string | undefined;

  /** Check if the user is locked/suspended */
  isLocked: (user: TUser) => boolean;

  /** Get the lock/suspend message */
  getLockedMessage?: (user: TUser) => string;

  /** Update last login timestamp (optional) */
  updateLastLogin?: (user: TUser) => Promise<void>;

  /** Issue JWT token for the authenticated user */
  issueToken: (user: TUser) => AuthTokenPair;

  /** Build the public user projection for the response */
  buildUserProjection: (user: TUser) => Record<string, unknown>;
}

export interface LoginFlowResult {
  token: AuthTokenPair;
  user: Record<string, unknown>;
}

export function buildBaseLoginFlow<TUser>(config: LoginFlowConfig<TUser>) {
  return {
    async execute(identifier: string, password: string): Promise<LoginFlowResult> {
      // Step 1: Find user
      const user = await config.findUser(identifier);
      if (!user) {
        throw new DomainException(
          IAM_ERROR_CODES.AUTH_INVALID_CREDENTIALS,
          'Email hoặc mật khẩu không đúng',
          401,
        );
      }

      // Step 2: Verify password
      const hash = config.getPasswordHash(user);
      if (!hash) {
        throw new DomainException(
          IAM_ERROR_CODES.AUTH_INVALID_CREDENTIALS,
          'Email hoặc mật khẩu không đúng',
          401,
        );
      }

      const valid = await comparePassword(password, hash);
      if (!valid) {
        throw new DomainException(
          IAM_ERROR_CODES.AUTH_INVALID_CREDENTIALS,
          'Email hoặc mật khẩu không đúng',
          401,
        );
      }

      // Step 3: Check lock status
      if (config.isLocked(user)) {
        const message = config.getLockedMessage?.(user) ?? 'Tài khoản đã bị tạm khóa';
        throw new DomainException(IAM_ERROR_CODES.AUTH_ACCOUNT_LOCKED, message, 401);
      }

      // Step 4: Update last login
      if (config.updateLastLogin) {
        await config.updateLastLogin(user);
      }

      // Step 5 + 6: Issue token and build projection
      return {
        token: config.issueToken(user),
        user: config.buildUserProjection(user),
      };
    },
  };
}
