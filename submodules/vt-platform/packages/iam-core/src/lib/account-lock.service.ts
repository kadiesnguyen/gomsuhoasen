/**
 * Base account lock service.
 *
 * Extracted from vita AccountLockService (76 LOC) and generalized.
 * Provides gate functions for checking account lock status.
 *
 * All three projects do this check:
 * - v2:   inline in auth flow (user.status !== 'ACTIVE')
 * - vita: AccountLockService.isLocked(member.account_status === 'locked')
 * - GHS:  inline (user.status !== UserStatus.ACTIVE)
 *
 * This base implementation works with any entity shape via IAccountLockable.
 */

import { Injectable } from '@nestjs/common';
import {
  DomainNotFoundException,
  DomainForbiddenException,
  IAM_ERROR_CODES,
} from '@vt/platform-error';
import {
  isAccountLocked,
  getAccountLockMessage,
  type IAccountLockable,
} from '@vt/platform-iam-contracts';

export type AccountLockableEntity = IAccountLockable;

@Injectable()
export class BaseAccountLockService {
  private readonly defaultMessage: string;

  constructor(defaultMessage = 'Tài khoản đã bị khóa. Vui lòng liên hệ quản trị viên.') {
    this.defaultMessage = defaultMessage;
  }

  /** Check if entity is locked. */
  isLocked(entity?: IAccountLockable | null): boolean {
    return isAccountLocked(entity);
  }

  /** Get lock reason message with fallback. */
  lockMessage(entity?: IAccountLockable | null): string {
    return getAccountLockMessage(entity, this.defaultMessage);
  }

  /**
   * Gate: can this entity authenticate (login)?
   * @throws DomainNotFoundException if entity is null/undefined
   * @throws DomainForbiddenException if entity is locked
   */
  assertCanAuthenticate(entity?: IAccountLockable | null, entityLabel = 'Account'): void {
    if (!entity) {
      throw new DomainNotFoundException(IAM_ERROR_CODES.MEMBER_NOT_FOUND, `${entityLabel} not found`);
    }
    if (this.isLocked(entity)) {
      throw new DomainForbiddenException(IAM_ERROR_CODES.MEMBER_LOCKED, this.lockMessage(entity));
    }
  }

  /**
   * Gate: can this entity be used as a referrer?
   * @throws DomainNotFoundException if entity is null/undefined
   * @throws DomainForbiddenException if entity is locked
   */
  assertCanBeReferrer(entity?: IAccountLockable | null): void {
    if (!entity) {
      throw new DomainNotFoundException(IAM_ERROR_CODES.MEMBER_NOT_FOUND, 'Referrer not found');
    }
    if (this.isLocked(entity)) {
      throw new DomainForbiddenException(
        IAM_ERROR_CODES.MEMBER_LOCKED,
        'Mã giới thiệu không hợp lệ (tài khoản người giới thiệu đã bị khóa).',
      );
    }
  }

  /**
   * Gate: can this entity receive a transfer?
   * @throws DomainNotFoundException if entity is null/undefined
   * @throws DomainForbiddenException if entity is locked
   */
  assertCanReceiveTransfer(entity?: IAccountLockable | null): void {
    if (!entity) {
      throw new DomainNotFoundException(IAM_ERROR_CODES.MEMBER_NOT_FOUND, 'Recipient not found');
    }
    if (this.isLocked(entity)) {
      throw new DomainForbiddenException(
        IAM_ERROR_CODES.MEMBER_LOCKED,
        'Tài khoản người nhận đã bị khóa. Không thể chuyển điểm.',
      );
    }
  }
}
