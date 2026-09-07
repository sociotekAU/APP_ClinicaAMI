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

export type PermissionAction = "read" | "write" | "delete";

export type ErpModuleCode =
  | "seguridad"
  | "pacientes"
  | "agenda"
  | "expediente_general"
  | "expediente_psicologia"
  | "recetas"
  | "laboratorio"
  | "facturacion"
  | "inventario"
  | "archivos_estudios"
  | "consentimientos";

export interface RolePermission {
  module: ErpModuleCode;
  canRead: boolean;
  canWrite: boolean;
  canDelete: boolean;
}

export type ErpNavigationSection =
  | "Atención"
  | "Gestión clínica"
  | "Operación"
  | "Administración";

export interface ErpNavigationItem {
  module: ErpModuleCode;
  label: string;
  description: string;
  href: string;
  section: ErpNavigationSection;
}

export type DashboardMetricCode =
  | "active_patients"
  | "today_appointments"
  | "active_professionals"
  | "pending_lab_orders"
  | "low_stock_items"
  | "today_invoices";

export interface DashboardMetric {
  code: DashboardMetricCode;
  label: string;
  value: number;
  description: string;
  module: ErpModuleCode;
}

export interface ErpContext {
  user: AuthUser;
  permissions: RolePermission[];
  navigation: ErpNavigationItem[];
  metrics: DashboardMetric[];
}
