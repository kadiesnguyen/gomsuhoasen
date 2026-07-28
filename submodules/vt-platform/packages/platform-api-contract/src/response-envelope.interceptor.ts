import { Injectable } from '@nestjs/common';
import type { CallHandler, ExecutionContext, NestInterceptor } from '@nestjs/common';

import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import type { ApiSuccessResponse } from './types';

@Injectable()
export class ResponseEnvelopeInterceptor<T> implements NestInterceptor<T, ApiSuccessResponse<T>> {
  intercept(_context: ExecutionContext, next: CallHandler<T>): Observable<ApiSuccessResponse<T>> {
    return next.handle().pipe(map((data) => ({ success: true as const, data })));
  }
}
