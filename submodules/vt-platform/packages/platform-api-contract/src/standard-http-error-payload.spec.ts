import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { BadRequestException, InternalServerErrorException, UnauthorizedException } from '@nestjs/common';
import { createStandardHttpErrorPayload } from './standard-http-error-payload';

const now = () => '2026-05-12T00:00:00.000Z';

describe('standard-http-error-payload', () => {
  it('preserves explicit code and message from HttpException response bodies', () => {
    const result = createStandardHttpErrorPayload(
      new UnauthorizedException({
        code: 'AUTH_EXPIRED',
        message: 'Token has expired',
      }),
      {
        path: '/auth/google/callback',
        statusFallbackCodes: { 401: 'UNAUTHORIZED' },
        httpExceptionFallbackCode: 'HTTP_EXCEPTION',
        now,
      },
    );

    assert.deepEqual(result.payload, {
      statusCode: 401,
      code: 'AUTH_EXPIRED',
      message: 'Token has expired',
      path: '/auth/google/callback',
      timestamp: '2026-05-12T00:00:00.000Z',
    });
  });

  it('preserves HttpException-like payloads across duplicated Nest package instances', () => {
    const result = createStandardHttpErrorPayload(
      {
        getStatus: () => 401,
        getResponse: () => ({
          code: 'AUTH_EXPIRED',
          message: 'Token has expired',
        }),
        message: 'Unauthorized',
      },
      {
        path: '/auth/google/callback',
        statusFallbackCodes: { 401: 'UNAUTHORIZED' },
        httpExceptionFallbackCode: 'HTTP_EXCEPTION',
        now,
      },
    );

    assert.deepEqual(result.payload, {
      statusCode: 401,
      code: 'AUTH_EXPIRED',
      message: 'Token has expired',
      path: '/auth/google/callback',
      timestamp: '2026-05-12T00:00:00.000Z',
    });
    assert.equal(result.isHttpException, true);
  });

  it('uses caller-provided fallback codes for string-only HttpExceptions', () => {
    const result = createStandardHttpErrorPayload(new BadRequestException('Invalid request'), {
      statusFallbackCodes: { 400: 'BAD_REQUEST' },
      httpExceptionFallbackCode: 'HTTP_EXCEPTION',
      now,
    });

    assert.equal(result.payload.code, 'BAD_REQUEST');
    assert.equal(result.payload.message, 'Invalid request');
  });

  it('keeps validation message arrays intact', () => {
    const result = createStandardHttpErrorPayload(
      new BadRequestException({
        message: ['name is required', 'email must be valid'],
      }),
      {
        statusFallbackCodes: { 400: 'BAD_REQUEST' },
        now,
      },
    );

    assert.deepEqual(result.payload.message, ['name is required', 'email must be valid']);
  });

  it('masks server errors in production', () => {
    const result = createStandardHttpErrorPayload(new InternalServerErrorException('db exploded'), {
      isProduction: true,
      internalServerErrorMessage: 'Internal server error',
      statusFallbackCodes: { 500: 'INTERNAL_SERVER_ERROR' },
      now,
    });

    assert.equal(result.payload.code, 'INTERNAL_SERVER_ERROR');
    assert.equal(result.payload.message, 'Internal server error');
  });

  it('normalizes non-HttpException errors to INTERNAL_SERVER_ERROR', () => {
    const result = createStandardHttpErrorPayload(new Error('unexpected'), {
      isProduction: false,
      internalServerErrorCode: 'INTERNAL_SERVER_ERROR',
      now,
    });

    assert.deepEqual(result.payload, {
      statusCode: 500,
      code: 'INTERNAL_SERVER_ERROR',
      message: 'unexpected',
      path: undefined,
      timestamp: '2026-05-12T00:00:00.000Z',
    });
    assert.equal(result.isHttpException, false);
  });
});
