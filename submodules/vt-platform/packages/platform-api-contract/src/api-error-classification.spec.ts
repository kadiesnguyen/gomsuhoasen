import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  API_ERROR_CATEGORIES,
  API_HTTP_STATUS,
  classifyHttpStatusCode,
  extractApiErrorCode,
  extractApiErrorMessage,
  isApiErrorResponseEnvelope,
  isCancelledClientErrorCode,
  isNetworkClientErrorCode,
  isStandardHttpErrorPayload,
  isTimeoutClientError,
} from './api-error-classification';

describe('api-error-classification', () => {
  it('classifies HTTP status codes into shared categories', () => {
    assert.equal(classifyHttpStatusCode(API_HTTP_STATUS.UNAUTHORIZED), API_ERROR_CATEGORIES.AUTH_EXPIRED);
    assert.equal(classifyHttpStatusCode(API_HTTP_STATUS.FORBIDDEN), API_ERROR_CATEGORIES.PERMISSION_DENIED);
    assert.equal(classifyHttpStatusCode(API_HTTP_STATUS.NOT_FOUND), API_ERROR_CATEGORIES.NOT_FOUND);
    assert.equal(classifyHttpStatusCode(API_HTTP_STATUS.CONFLICT), API_ERROR_CATEGORIES.CONFLICT);
    assert.equal(classifyHttpStatusCode(API_HTTP_STATUS.TOO_MANY_REQUESTS), API_ERROR_CATEGORIES.RATE_LIMITED);
    assert.equal(classifyHttpStatusCode(API_HTTP_STATUS.UNPROCESSABLE_ENTITY), API_ERROR_CATEGORIES.VALIDATION);
    assert.equal(classifyHttpStatusCode(API_HTTP_STATUS.INTERNAL_SERVER_ERROR), API_ERROR_CATEGORIES.SERVER_ERROR);
    assert.equal(classifyHttpStatusCode(API_HTTP_STATUS.FOUND), API_ERROR_CATEGORIES.UNKNOWN);
    assert.equal(classifyHttpStatusCode(undefined), API_ERROR_CATEGORIES.UNKNOWN);
  });

  it('detects common client transport error codes', () => {
    assert.equal(isCancelledClientErrorCode('ERR_CANCELED'), true);
    assert.equal(isNetworkClientErrorCode('ERR_NETWORK'), true);
    assert.equal(isTimeoutClientError('ECONNABORTED', 'timeout of 15000ms exceeded'), true);
    assert.equal(isTimeoutClientError('ERR_NETWORK', 'request timeout'), true);
    assert.equal(isTimeoutClientError('ERR_NETWORK', 'Network Error'), false);
  });

  it('reads standard HTTP error payloads', () => {
    const payload = {
      statusCode: 400,
      code: 'BAD_REQUEST',
      message: ['name is required', 'email is invalid'],
      timestamp: '2026-05-17T00:00:00.000Z',
    };

    assert.equal(isStandardHttpErrorPayload(payload), true);
    assert.equal(extractApiErrorCode(payload), 'BAD_REQUEST');
    assert.equal(extractApiErrorMessage(payload), 'name is required; email is invalid');
  });

  it('reads standard API error envelopes', () => {
    const envelope = {
      success: false,
      error: {
        code: 'ORDER_INVALID_STATE',
        message: 'Order cannot be confirmed',
      },
    };

    assert.equal(isApiErrorResponseEnvelope(envelope), true);
    assert.equal(extractApiErrorCode(envelope), 'ORDER_INVALID_STATE');
    assert.equal(extractApiErrorMessage(envelope), 'Order cannot be confirmed');
  });

  it('keeps empty-message API error envelopes recognizable', () => {
    const envelope = {
      success: false,
      error: {
        code: 'EMPTY_MESSAGE',
        message: '',
      },
    };

    assert.equal(isApiErrorResponseEnvelope(envelope), true);
    assert.equal(extractApiErrorMessage(envelope, 'Default'), 'Default');
  });

  it('normalizes raw error message shapes', () => {
    assert.equal(extractApiErrorMessage('Internal Server Error'), 'Internal Server Error');
    assert.equal(extractApiErrorMessage(['a', 'b']), 'a; b');
    assert.equal(extractApiErrorMessage({ message: ['a', 'b'] }), 'a; b');
    assert.equal(extractApiErrorMessage({ error: { message: 'Nested' } }), 'Nested');
    assert.equal(extractApiErrorMessage({}, 'Default'), 'Default');
  });
});
