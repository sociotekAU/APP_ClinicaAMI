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

export type ApiErrorCode =
  | "INTERNAL_ERROR"
  | "VALIDATION_ERROR"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "RESOURCE_NOT_FOUND"
  | "RESOURCE_CONFLICT"
  | "RESOURCE_IN_USE"
  | "DATABASE_ERROR"
  | "RATE_LIMIT_EXCEEDED"
  | "HTTP_ERROR"
  | "AUTH_INVALID_CREDENTIALS"
  | "AUTH_REFRESH_REQUIRED"
  | "AUTH_SESSION_INVALID"
  | "AUTH_CURRENT_PASSWORD_INVALID"
  | "AUTH_PASSWORD_REUSE"
  | "AUTH_SESSION_EXPIRED"
  | "AUTH_REQUIRED"
  | "AUTH_PASSWORD_CHANGE_REQUIRED"
  | "AUTH_FORBIDDEN"
  | "ERP_ACCESS_NOT_CONFIGURED"
  | "NETWORK_RESPONSE_ERROR"
  | "NETWORK_UNAVAILABLE";

export interface ApiError {
  error: {
    code: ApiErrorCode;
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

export type SortDirection = "asc" | "desc";
export type PermissionSortField = "role" | "module";

export interface PermissionListItem {
  id: string;
  role: {
    id: number;
    name: string;
  };
  module: ErpModuleCode;
  moduleLabel: string;
  canRead: boolean;
  canWrite: boolean;
  canDelete: boolean;
}

export interface PaginatedData<T> {
  items: T[];
  pagination: PageMeta;
}

export type RecordStatusFilter = "all" | "active" | "inactive";

export interface SpecialtyListItem {
  id: number;
  name: string;
  description: string | null;
  active: boolean;
  professionalCount: number;
  createdAt: string;
}

export interface SpecialtyInput {
  name: string;
  description?: string;
}

export interface ServiceListItem {
  id: number;
  name: string;
  description: string | null;
  price: number;
  imageUrl: string | null;
  active: boolean;
  createdAt: string;
}

export interface ServiceInput {
  name: string;
  description?: string;
  price: number;
  imageUrl?: string;
}

export interface ProfessionalListItem {
  id: number;
  name: string;
  dpi: string | null;
  licenseNumber: string | null;
  phone: string | null;
  email: string | null;
  startDate: string | null;
  active: boolean;
  specialty: {
    id: number;
    name: string;
  };
  hasUser: boolean;
  createdAt: string;
}

export interface ProfessionalInput {
  name: string;
  dpi?: string;
  licenseNumber?: string;
  phone?: string;
  email?: string;
  startDate?: string;
  specialtyId: number;
}

export interface UserListItem {
  id: number;
  username: string;
  name: string;
  email: string | null;
  active: boolean;
  mustChangePassword: boolean;
  lastAccess: string | null;
  createdAt: string;
  role: {
    id: number;
    name: string;
  };
  professional: {
    id: number;
    name: string;
  } | null;
}

export interface UserCreateInput {
  username: string;
  name: string;
  email?: string;
  roleId: number;
  professionalId?: number | null;
  temporaryPassword: string;
}

export interface UserUpdateInput {
  name: string;
  email?: string;
  roleId: number;
  professionalId?: number | null;
}

export interface StatusInput {
  active: boolean;
}

export interface AdministrationOption {
  id: number;
  label: string;
  active: boolean;
}

export interface ProfessionalOption extends AdministrationOption {
  linkedUserId: number | null;
}

export interface AdministrationOptions {
  roles: AdministrationOption[];
  specialties: AdministrationOption[];
  professionals: ProfessionalOption[];
}

export type PatientGender = "Femenino" | "Masculino" | "No especificado" | "Otro";
export type BloodType = "A+" | "A-" | "B+" | "B-" | "AB+" | "AB-" | "O+" | "O-";

export interface PatientListItem {
  id: number;
  firstNames: string;
  lastNames: string;
  fullName: string;
  birthDate: string;
  gender: string | null;
  phone: string;
  email: string | null;
  bloodType: string | null;
  personalHistory: string | null;
  active: boolean;
  appointmentCount: number;
  createdAt: string;
}

export interface PatientInput {
  firstNames: string;
  lastNames: string;
  birthDate: string;
  gender?: PatientGender;
  phone: string;
  email?: string;
  bloodType?: BloodType;
  personalHistory?: string;
}

export type AppointmentStatus = "programada" | "completada" | "cancelada" | "no_asistio";

export interface AppointmentListItem {
  id: number;
  scheduledAt: string;
  reason: string;
  status: AppointmentStatus;
  patient: { id: number; name: string };
  professional: { id: number; name: string; specialty: string };
  clinic: { id: number; name: string } | null;
  hasClinicalRecord: boolean;
  createdAt: string;
}

export interface AppointmentInput {
  patientId: number;
  professionalId: number;
  clinicId?: number | null;
  scheduledAt: string;
  reason: string;
}

export interface AppointmentStatusInput {
  status: AppointmentStatus;
}

export interface ClinicListItem {
  id: number;
  number: string;
  room: string;
  schedule: string;
  active: boolean;
  professional: { id: number; name: string };
  appointmentCount: number;
  createdAt: string;
}

export interface ClinicInput {
  number: string;
  room: string;
  schedule: string;
  professionalId: number;
}

export interface CareOption {
  id: number;
  label: string;
  active: boolean;
}

export interface ClinicOption extends CareOption {
  professionalId: number;
}

export interface AgendaOptions {
  patients: CareOption[];
  professionals: CareOption[];
  clinics: ClinicOption[];
}

export type ClinicalRecordType = "general" | "psychology";

export interface VitalSignsItem {
  id: number;
  weightKg: number | null;
  heightCm: number | null;
  bloodPressure: string | null;
  heartRate: number | null;
  temperature: number | null;
  bmi: number | null;
  measuredAt: string;
}

export interface ClinicalRecordListItem {
  id: number;
  type: ClinicalRecordType;
  appointmentId: number;
  appointmentAt: string;
  consultationReason: string;
  evolutionNotes: string | null;
  diagnosisCie10: string | null;
  recordedAt: string;
  patient: { id: number; name: string };
  professional: { id: number; name: string; specialty: string };
  measurementCount: number;
  latestVitalSigns: VitalSignsItem | null;
}

export interface ClinicalRecordDetail extends ClinicalRecordListItem {
  personalHistory: string | null;
  vitalSigns: VitalSignsItem[];
}

export interface ClinicalRecordInput {
  appointmentId: number;
  consultationReason: string;
  evolutionNotes?: string;
  diagnosisCie10?: string;
}

export interface VitalSignsInput {
  weightKg?: number | null;
  heightCm?: number | null;
  bloodPressure?: string;
  heartRate?: number | null;
  temperature?: number | null;
}

export interface ClinicalRecordOptions {
  appointments: Array<{
    id: number;
    label: string;
    patientId: number;
    professionalId: number;
  }>;
}
