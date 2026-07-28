import { HttpException, HttpStatus } from '@nestjs/common';
import { isRecord } from './record';

export type StandardHttpErrorMessage = string | string[];

export interface StandardHttpErrorPayload {
  statusCode: number;
  code: string;
  message: StandardHttpErrorMessage;
  path?: string;
  timestamp: string;
}

export interface StandardHttpErrorPayloadOptions {
  path?: string;
  isProduction?: boolean;
  internalServerErrorMessage?: string;
  statusFallbackCodes?: Partial<Record<number, string>>;
  httpExceptionFallbackCode?: string;
  internalServerErrorCode?: string;
  now?: () => Date | string;
}

export interface StandardHttpErrorPayloadResult {
  statusCode: number;
  code: string;
  payload: StandardHttpErrorPayload;
  isHttpException: boolean;
}

const DEFAULT_INTERNAL_SERVER_ERROR_MESSAGE = 'Internal server error';
const DEFAULT_HTTP_EXCEPTION_CODE = 'HTTP_EXCEPTION';
const DEFAULT_INTERNAL_SERVER_ERROR_CODE = 'INTERNAL_SERVER_ERROR';
const STANDARD_HTTP_ERROR_RECORD_OPTIONS = { allowArray: true };

interface HttpExceptionLike {
  getStatus(): number;
  getResponse(): unknown;
  message?: string;
}

function isHttpExceptionLike(exception: unknown): exception is HttpExceptionLike {
  if (exception instanceof HttpException) {
    return true;
  }
  return (
    typeof exception === 'object' &&
    exception !== null &&
    typeof (exception as { getStatus?: unknown }).getStatus === 'function' &&
    typeof (exception as { getResponse?: unknown }).getResponse === 'function'
  );
}

function resolveTimestamp(now: (() => Date | string) | undefined): string {
  const value = now ? now() : new Date();
  return typeof value === 'string' ? value : value.toISOString();
}

function normalizeOptionalText(value: string | undefined): string | undefined {
  const normalized = value?.trim();
  return normalized && normalized.length > 0 ? normalized : undefined;
}

export function normalizeStandardHttpErrorMessage(
  responseBody: unknown,
  fallbackMessage: string,
): StandardHttpErrorMessage {
  if (typeof responseBody === 'string' && responseBody.trim().length > 0) {
    return responseBody;
  }
  if (Array.isArray(responseBody) && responseBody.every((item) => typeof item === 'string')) {
    return responseBody as string[];
  }
  if (isRecord(responseBody, STANDARD_HTTP_ERROR_RECORD_OPTIONS)) {
    const message = responseBody['message'];
    if (typeof message === 'string' && message.trim().length > 0) {
      return message;
    }
    if (Array.isArray(message) && message.every((item) => typeof item === 'string')) {
      return message as string[];
    }
  }
  return fallbackMessage;
}

export function normalizeStandardHttpErrorCode(
  statusCode: number,
  responseBody: unknown,
  options: Pick<StandardHttpErrorPayloadOptions, 'statusFallbackCodes' | 'httpExceptionFallbackCode'> = {},
): string {
  if (isRecord(responseBody, STANDARD_HTTP_ERROR_RECORD_OPTIONS)) {
    const code = responseBody['code'];
    if (typeof code === 'string' && code.trim().length > 0) {
      return code;
    }
  }
  return options.statusFallbackCodes?.[statusCode] ?? options.httpExceptionFallbackCode ?? DEFAULT_HTTP_EXCEPTION_CODE;
}

export function createStandardHttpErrorPayload(
  exception: unknown,
  options: StandardHttpErrorPayloadOptions = {},
): StandardHttpErrorPayloadResult {
  const internalMessage = options.internalServerErrorMessage ?? DEFAULT_INTERNAL_SERVER_ERROR_MESSAGE;

  if (isHttpExceptionLike(exception)) {
    const statusCode = exception.getStatus();
    const responseBody = exception.getResponse();
    const fallbackMessage =
      statusCode >= HttpStatus.INTERNAL_SERVER_ERROR && options.isProduction
        ? internalMessage
        : normalizeOptionalText(exception.message) ?? internalMessage;
    const message =
      statusCode >= HttpStatus.INTERNAL_SERVER_ERROR && options.isProduction
        ? fallbackMessage
        : normalizeStandardHttpErrorMessage(responseBody, fallbackMessage);
    const code = normalizeStandardHttpErrorCode(statusCode, responseBody, options);

    return {
      statusCode,
      code,
      isHttpException: true,
      payload: {
        statusCode,
        code,
        message,
        path: options.path,
        timestamp: resolveTimestamp(options.now),
      },
    };
  }

  const rawMessage = exception instanceof Error && exception.message ? exception.message : internalMessage;
  const message = options.isProduction ? internalMessage : rawMessage;
  const statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
  const code = options.internalServerErrorCode ?? DEFAULT_INTERNAL_SERVER_ERROR_CODE;

  return {
    statusCode,
    code,
    isHttpException: false,
    payload: {
      statusCode,
      code,
      message,
      path: options.path,
      timestamp: resolveTimestamp(options.now),
    },
  };
}
