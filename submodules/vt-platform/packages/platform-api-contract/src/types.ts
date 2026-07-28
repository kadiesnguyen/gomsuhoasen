export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  meta?: Record<string, unknown>;
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PaginatedPayload<T> extends PaginationMeta {
  items: T[];
}

export interface ApiPaginatedResponse<T> {
  success: true;
  data: T[];
  meta: PaginationMeta;
}

export interface ApiDeleteResponse {
  success: true;
  data: { deleted: boolean; id: string };
}

export interface ApiErrorDetail {
  field?: string;
  message: string;
}

export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: ApiErrorDetail[] | unknown;
  };
  meta?: Record<string, unknown>;
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;
