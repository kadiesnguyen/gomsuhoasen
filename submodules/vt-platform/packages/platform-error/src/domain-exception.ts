import { HttpException } from '@nestjs/common';

/**
 * Domain exception with a structured error code.
 *
 * All business rule violations should throw this instead of raw NestJS
 * exceptions. The `errorCode` is surfaced in the API envelope via
 * `ApiExceptionFilter` and can be consumed by UI clients for i18n
 * and conditional UX (e.g. show "insufficient points" dialog).
 *
 * @example
 * throw new DomainException(
 *   ECOMMERCE_ERROR_CODES.ORDER_INSUFFICIENT_POINTS,
 *   'Points applied cannot exceed chargeable order total.',
 * );
 */
export class DomainException extends HttpException {
  public readonly errorCode: string;

  constructor(
    errorCode: string,
    message: string,
    statusCode = 422,
    public readonly details?: unknown,
  ) {
    super({ code: errorCode, message, details }, statusCode);
    this.errorCode = errorCode;
  }
}

/**
 * Shortcut factories for common HTTP status codes.
 */
export class DomainNotFoundException extends DomainException {
  constructor(errorCode: string, message: string, details?: unknown) {
    super(errorCode, message, 404, details);
  }
}

export class DomainForbiddenException extends DomainException {
  constructor(errorCode: string, message: string, details?: unknown) {
    super(errorCode, message, 403, details);
  }
}

export class DomainConflictException extends DomainException {
  constructor(errorCode: string, message: string, details?: unknown) {
    super(errorCode, message, 409, details);
  }
}

export class DomainBadRequestException extends DomainException {
  constructor(errorCode: string, message: string, details?: unknown) {
    super(errorCode, message, 400, details);
  }
}
