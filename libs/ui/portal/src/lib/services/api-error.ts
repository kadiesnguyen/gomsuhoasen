/**
 * API Error Classification — Portal-side error handling
 *
 * Zalo ref: apps/v2-portal/src/services/api/api-error.ts (305 lines)
 * Kept: ApiErrorCategory facade, ClassifiedApiError, classifyApiError(), displayMessage
 * Dropped: tenant-specific codes, i18n keys
 * Adapted: Vietnamese display messages for GHS
 */
import {
  API_ERROR_CATEGORIES,
  classifyHttpStatusCode,
  extractApiErrorCode,
  extractApiErrorMessage,
  isApiErrorResponseEnvelope,
  isCancelledClientErrorCode,
  isNetworkClientErrorCode,
  isTimeoutClientError,
} from '@gomhoasen/contracts';
import type { ApiErrorCategoryValue, ApiErrorResponse } from '@gomhoasen/contracts';
import { readTrimmedString } from '@vt/common-utils';

// ─── Error Category ───────────────────────────────────────────────────

export const ApiErrorCategory = {
  VALIDATION: API_ERROR_CATEGORIES.VALIDATION,
  AUTH_EXPIRED: API_ERROR_CATEGORIES.AUTH_EXPIRED,
  PERMISSION_DENIED: API_ERROR_CATEGORIES.PERMISSION_DENIED,
  NOT_FOUND: API_ERROR_CATEGORIES.NOT_FOUND,
  CONFLICT: API_ERROR_CATEGORIES.CONFLICT,
  RATE_LIMITED: API_ERROR_CATEGORIES.RATE_LIMITED,
  SERVER_ERROR: API_ERROR_CATEGORIES.SERVER_ERROR,
  NETWORK_ERROR: API_ERROR_CATEGORIES.NETWORK_ERROR,
  TIMEOUT: API_ERROR_CATEGORIES.TIMEOUT,
  CANCELLED: API_ERROR_CATEGORIES.CANCELLED,
  UNKNOWN: API_ERROR_CATEGORIES.UNKNOWN,
} as const satisfies Record<string, ApiErrorCategoryValue>;

export type ApiErrorCategory = ApiErrorCategoryValue;

// ─── Classified Error ─────────────────────────────────────────────────

export class ClassifiedApiError extends Error {
  readonly category: ApiErrorCategory;
  readonly statusCode: number | undefined;
  readonly code: string | undefined;
  readonly envelope: ApiErrorResponse | undefined;
  readonly originalError: unknown;

  constructor(
    category: ApiErrorCategory,
    message: string,
    opts: {
      statusCode?: number;
      code?: string;
      envelope?: ApiErrorResponse;
      originalError?: unknown;
    } = {},
  ) {
    super(message);
    this.name = 'ClassifiedApiError';
    this.category = category;
    this.statusCode = opts.statusCode;
    this.code = opts.code;
    this.envelope = opts.envelope;
    this.originalError = opts.originalError;
  }

  /** True if the error is retryable (network errors, 5xx) */
  get isRetryable(): boolean {
    return (
      this.category === ApiErrorCategory.NETWORK_ERROR ||
      this.category === ApiErrorCategory.TIMEOUT ||
      this.category === ApiErrorCategory.SERVER_ERROR
    );
  }

  /** True if the user should be redirected to login */
  get requiresReauth(): boolean {
    return this.category === ApiErrorCategory.AUTH_EXPIRED;
  }

  /** Human-readable error message for display in UI */
  get displayMessage(): string {
    switch (this.category) {
      case ApiErrorCategory.NETWORK_ERROR:
        return 'Không thể kết nối máy chủ. Vui lòng kiểm tra kết nối mạng.';
      case ApiErrorCategory.TIMEOUT:
        return 'Yêu cầu quá thời gian. Vui lòng thử lại.';
      case ApiErrorCategory.SERVER_ERROR:
        return 'Lỗi hệ thống. Đội ngũ kỹ thuật đã được thông báo.';
      case ApiErrorCategory.PERMISSION_DENIED:
        return 'Bạn không có quyền thực hiện thao tác này.';
      case ApiErrorCategory.NOT_FOUND:
        return 'Không tìm thấy dữ liệu yêu cầu.';
      case ApiErrorCategory.RATE_LIMITED:
        return 'Quá nhiều yêu cầu. Vui lòng đợi giây lát.';
      case ApiErrorCategory.VALIDATION:
        return 'Dữ liệu không hợp lệ. Vui lòng kiểm tra lại.';
      case ApiErrorCategory.CONFLICT:
        return 'Dữ liệu bị trùng hoặc đã được chỉnh sửa bởi người khác.';
      case ApiErrorCategory.CANCELLED:
        return 'Yêu cầu đã bị huỷ.';
      default:
        return 'Đã xảy ra lỗi không xác định.';
    }
  }
}

// ─── Classifier Function ──────────────────────────────────────────────

interface AxiosLikeError {
  response?: { status?: number; data?: unknown };
  request?: unknown;
  code?: string;
  message?: string;
}

export function classifyApiError(error: unknown): ClassifiedApiError {
  if (error instanceof ClassifiedApiError) return error;

  const axiosError = error as AxiosLikeError;

  // Cancelled
  if (isCancelledClientErrorCode(axiosError.code)) {
    return new ClassifiedApiError(ApiErrorCategory.CANCELLED, 'Yêu cầu đã bị huỷ', {
      originalError: error,
    });
  }

  const code = typeof axiosError.code === 'string' ? axiosError.code : '';
  const rawMessage = readTrimmedString(axiosError.message) ?? '';
  const hasResponse = Object.prototype.hasOwnProperty.call(axiosError, 'response') && axiosError.response !== undefined;
  const hasRequest = Object.prototype.hasOwnProperty.call(axiosError, 'request') && axiosError.request !== undefined;

  // Timeout
  if (isTimeoutClientError(code, rawMessage)) {
    return new ClassifiedApiError(ApiErrorCategory.TIMEOUT, 'Yêu cầu quá thời gian', {
      originalError: error,
    });
  }

  // Preserve explicit local/runtime errors instead of turning them into network failures.
  if (!hasResponse && !hasRequest) {
    if (rawMessage.length > 0) {
      return new ClassifiedApiError(ApiErrorCategory.UNKNOWN, rawMessage, {
        originalError: error,
      });
    }
    return new ClassifiedApiError(ApiErrorCategory.UNKNOWN, 'Lỗi không xác định', {
      originalError: error,
    });
  }

  // No response at all → network error
  if (!axiosError.response) {
    if (isNetworkClientErrorCode(code)) {
      return new ClassifiedApiError(ApiErrorCategory.NETWORK_ERROR, 'Lỗi kết nối mạng', {
        originalError: error,
      });
    }
    return new ClassifiedApiError(ApiErrorCategory.UNKNOWN, 'Lỗi không xác định', {
      originalError: error,
    });
  }

  // Has response → classify by status code
  const status = axiosError.response.status;
  const data = axiosError.response.data;
  const envelope = isApiErrorResponseEnvelope(data) ? data : undefined;
  const message = readTrimmedString(extractApiErrorMessage(data, axiosError.message)) ?? 'Lỗi';
  const contractCode = extractApiErrorCode(data);

  if (!status) {
    return new ClassifiedApiError(ApiErrorCategory.UNKNOWN, 'Lỗi không xác định', {
      originalError: error, envelope,
    });
  }

  const category = classifyHttpStatusCode(status) as ApiErrorCategory;

  return new ClassifiedApiError(category, message, {
    statusCode: status, code: contractCode, envelope, originalError: error,
  });
}

/**
 * Merge an API error message with a fallback for UI display.
 * Usage: toast.error(mergeApiErrorMessage('Lưu thất bại', error));
 */
export function mergeApiErrorMessage(fallback: string, error: unknown): string {
  const classified = error instanceof ClassifiedApiError ? error : classifyApiError(error);
  return `${fallback}. ${classified.displayMessage}`;
}
