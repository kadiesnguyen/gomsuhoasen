/**
 * Convenience factory functions for building domain exceptions.
 *
 * These builders wrap the DomainException subclasses with a consistent
 * (message, code) signature. Extracted from zalominiapp core where every
 * module had its own ad-hoc builders.
 *
 * @example
 * ```ts
 * import { buildDomainNotFound } from '.';
 * throw buildDomainNotFound('Order not found', 'ORDER_NOT_FOUND');
 * ```
 */

import { HttpStatus } from '@nestjs/common';
import {
  DomainBadRequestException,
  DomainConflictException,
  DomainException,
  DomainForbiddenException,
  DomainNotFoundException,
} from './domain-exception';

export function buildDomainBadRequest(message: string, code: string): DomainBadRequestException {
  return new DomainBadRequestException(code, message);
}

export function buildDomainConflict(message: string, code: string): DomainConflictException {
  return new DomainConflictException(code, message);
}

export function buildDomainForbidden(message: string, code: string): DomainForbiddenException {
  return new DomainForbiddenException(code, message);
}

export function buildDomainNotFound(message: string, code: string): DomainNotFoundException {
  return new DomainNotFoundException(code, message);
}

export function buildDomainGone(message: string, code: string): DomainException {
  return new DomainException(code, message, HttpStatus.GONE);
}

export function buildDomainUnauthorized(message: string, code: string): DomainException {
  return new DomainException(code, message, HttpStatus.UNAUTHORIZED);
}

export function buildDomainUnprocessable(message: string, code: string): DomainException {
  return new DomainException(code, message, HttpStatus.UNPROCESSABLE_ENTITY);
}

export function buildDomainInternal(message: string, code: string): DomainException {
  return new DomainException(code, message, HttpStatus.INTERNAL_SERVER_ERROR);
}

export function buildDomainServiceUnavailable(message: string, code: string): DomainException {
  return new DomainException(code, message, HttpStatus.SERVICE_UNAVAILABLE);
}
