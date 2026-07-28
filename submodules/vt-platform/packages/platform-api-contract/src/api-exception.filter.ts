import { Catch, HttpException, HttpStatus } from '@nestjs/common';
import type { ArgumentsHost, ExceptionFilter } from '@nestjs/common';

import type { ApiErrorResponse } from './types';

interface HttpResponseLike {
  status(code: number): {
    json(body: unknown): void;
  };
}

function normalizeException(exception: unknown): {
  status: number;
  code: string;
  message: string;
  details?: unknown;
} {
  if (exception instanceof HttpException) {
    const status = exception.getStatus();
    const response = exception.getResponse();
    if (typeof response === 'object' && response !== null) {
      const body = response as Record<string, unknown>;
      return {
        status,
        code: String(body['code'] ?? body['error'] ?? `HTTP_${status}`),
        message: Array.isArray(body['message'])
          ? String(body['message'][0] ?? exception.message)
          : String(body['message'] ?? exception.message),
        details: body['details'],
      };
    }
    return {
      status,
      code: `HTTP_${status}`,
      message: String(response || exception.message),
    };
  }

  return {
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    code: 'INTERNAL_SERVER_ERROR',
    message: 'Internal server error',
  };
}

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<HttpResponseLike>();
    const request = ctx.getRequest<{ method?: string; url?: string }>();
    const normalized = normalizeException(exception);

    const body: ApiErrorResponse = {
      success: false,
      error: {
        code: normalized.code,
        message: normalized.message,
        details: normalized.details,
      },
      meta: {
        statusCode: normalized.status,
        method: request.method,
        path: request.url,
        timestamp: new Date().toISOString(),
      },
    };

    response.status(normalized.status).json(body);
  }
}
