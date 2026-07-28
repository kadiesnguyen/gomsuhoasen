/**
 * @vt/iam-core — Shared IAM infrastructure for NestJS projects.
 *
 * Provides:
 * - Auth token service factory (JWT mint/verify with configurable type/issuer)
 * - Base user schema builder (common fields across all projects)
 * - Account lock service (gate functions for auth/referral/transfer)
 * - Password hashing utilities
 * - Auth flow helpers (login pattern, token response shape)
 *
 * Projects extend these base implementations with domain-specific fields
 * and business rules:
 * - v2: multi-tenant, OAuth, TOTP, M2M tokens
 * - vita: member-based, member_code, zalo_id, account_status
 * - GHS: single-tenant, email/password only, role enum
 */

export {
  createAuthTokenService,
  type AuthTokenServiceConfig,
  type AuthTokenPair,
  type BaseAccessTokenPayload,
} from './lib/auth-token-factory';

export {
  BaseAccountLockService,
  type AccountLockableEntity,
} from './lib/account-lock.service';

export {
  hashPassword,
  comparePassword,
  DEFAULT_BCRYPT_ROUNDS,
} from './lib/password.utils';

export {
  buildBaseLoginFlow,
  type LoginFlowConfig,
  type LoginFlowResult,
} from './lib/login-flow';

export {
  InvitationStatus,
  MasterDataEntityStatus,
  MembershipStatus,
  ProvisionJobStatus,
  RevocationReason,
  SeedRunMode,
  SeedRunStatus,
  SeedStatus,
  WorkGroupStatus,
} from './lib/iam-status.contracts';
