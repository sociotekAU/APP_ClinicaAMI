export interface ApiMeta {
  requestId?: string;
  timestamp: string;
}

export interface ApiSuccess<T> {
  data: T;
  meta: ApiMeta;
}

export interface PageMeta {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

export interface PaginatedResponse<T> extends ApiSuccess<T[]> {
  pagination: PageMeta;
}

export interface ApiErrorDetail {
  field?: string;
  message: string;
}

export interface ApiError {
  error: {
    code: string;
    message: string;
    details?: ApiErrorDetail[];
  };
  meta: ApiMeta;
}

export interface AuthUser {
  id: number;
  username: string;
  name: string;
  role: {
    id: number;
    name: string;
  };
  mustChangePassword: boolean;
}

export interface AuthSession {
  user: AuthUser;
}
