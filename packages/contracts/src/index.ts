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
  | "AUTH_ADMIN_REQUIRED"
  | "AUTH_ADMIN_PIN_INVALID"
  | "ADMIN_PIN_NOT_CONFIGURED"
  | "ERP_ACCESS_NOT_CONFIGURED"
  | "NETWORK_RESPONSE_ERROR"
  | "NETWORK_UNAVAILABLE"
  | "FILE_TOO_LARGE"
  | "FILE_TYPE_NOT_ALLOWED"
  | "FILE_INTEGRITY_ERROR"
  | "FILE_STORAGE_ERROR";

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
  | "consentimientos"
  | "auditoria"
  | "contenido_web";

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

export interface PermissionOptions {
  modules: Array<{ code: ErpModuleCode; label: string }>;
  roles: AdministrationOption[];
}

export interface RolePermissionConfiguration {
  permissions: RolePermission[];
  role: AdministrationOption;
}

export interface RolePermissionsUpdateInput {
  permissions: RolePermission[];
  validationPin: string;
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
  psychologicalRecordEligible: boolean;
  active: boolean;
  professionalCount: number;
  createdAt: string;
}

export interface SpecialtyInput {
  name: string;
  description?: string;
  psychologicalRecordEligible: boolean;
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
    scheduledAt: string;
    patient: { id: number; name: string };
    professional: { id: number; name: string; specialty: string };
  }>;
}

export interface MedicationListItem {
  id: number;
  commercialName: string;
  activeIngredient: string;
  presentation: string;
  concentration: string;
  active: boolean;
  prescriptionCount: number;
  createdAt: string;
}

export interface MedicationInput {
  commercialName: string;
  activeIngredient: string;
  presentation: string;
  concentration: string;
}

export type PrescriptionStatus = "emitida" | "anulada";

export interface PrescriptionItem {
  id: number;
  medication: { id: number; label: string };
  dose: string;
  durationDays: number;
}

export interface PrescriptionListItem {
  id: number;
  issuedAt: string;
  diagnosis: string;
  status: PrescriptionStatus;
  annulledAt: string | null;
  annulmentReason: string | null;
  patient: { id: number; name: string };
  professional: { id: number; name: string; specialty: string };
  itemCount: number;
}

export interface PrescriptionDetail extends PrescriptionListItem {
  items: PrescriptionItem[];
}

export interface PrescriptionInput {
  patientId: number;
  professionalId: number;
  diagnosis: string;
  items: Array<{ medicationId: number; dose: string; durationDays: number }>;
}

export interface PrescriptionOptions {
  patients: CareOption[];
  professionals: CareOption[];
  medications: CareOption[];
}

export interface ProcedureListItem {
  id: number;
  clinicalRecordId: number;
  clinicalRecordType: ClinicalRecordType;
  service: { id: number; name: string };
  patient: { id: number; name: string };
  professional: { id: number; name: string };
  observations: string | null;
  active: boolean;
  recordedAt: string;
}

export interface ProcedureInput {
  clinicalRecordId: number;
  serviceId: number;
  observations?: string;
}

export interface ProcedureOptions {
  clinicalRecords: Array<{ id: number; label: string }>;
  services: CareOption[];
}

export interface ClinicalOperationsOptions extends PrescriptionOptions, ProcedureOptions {}

export interface LabTestListItem {
  id: number;
  name: string;
  category: string;
  referenceValues: string | null;
  unit: string | null;
  active: boolean;
  orderCount: number;
  createdAt: string;
}

export interface LabTestInput {
  name: string;
  category: string;
  referenceValues?: string;
  unit?: string;
}

export type LabOrderStatus = "pendiente" | "procesando" | "finalizado";

export interface LabResultItem {
  id: number;
  test: { id: number; name: string; category: string; referenceValues: string | null; unit: string | null };
  value: string | null;
  observations: string | null;
  resultedAt: string | null;
}

export interface LabOrderListItem {
  id: number;
  orderedAt: string;
  status: LabOrderStatus;
  observations: string | null;
  finalizedAt: string | null;
  patient: { id: number; name: string };
  professional: { id: number; name: string } | null;
  resultCount: number;
  completedResultCount: number;
}

export interface LabOrderDetail extends LabOrderListItem {
  results: LabResultItem[];
}

export interface LabOrderInput {
  patientId: number;
  professionalId?: number | null;
  observations?: string;
  testIds: number[];
}

export interface LabResultInput {
  value: string;
  observations?: string;
}

export interface LabOrderOptions {
  patients: CareOption[];
  professionals: CareOption[];
  tests: CareOption[];
}

export type InvoicePaymentMethod = "efectivo" | "tarjeta" | "transferencia";
export type InvoiceStatus = "pagada" | "anulada";

export interface InvoiceLineItem {
  id: number;
  concept: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

export interface InvoiceListItem {
  id: number;
  issuedAt: string;
  total: number;
  paymentMethod: InvoicePaymentMethod;
  status: InvoiceStatus;
  observations: string | null;
  annulledAt: string | null;
  annulmentReason: string | null;
  patient: { id: number; name: string };
  cashier: { id: number; name: string; username: string };
  lineCount: number;
}

export interface InvoiceDetail extends InvoiceListItem {
  lines: InvoiceLineItem[];
}

export interface InvoiceInput {
  patientId: number;
  paymentMethod: InvoicePaymentMethod;
  observations?: string;
  lines: Array<{ concept: string; quantity: number; unitPrice: number }>;
}

export interface BillingOptions {
  patients: CareOption[];
  services: Array<{ id: number; label: string; active: boolean; price: number }>;
}

export interface CashSummary {
  date: string;
  paidInvoiceCount: number;
  annulledInvoiceCount: number;
  paidTotal: number;
  byPaymentMethod: Array<{
    method: InvoicePaymentMethod;
    invoiceCount: number;
    total: number;
  }>;
}

export interface SupplierListItem {
  id: number;
  companyName: string;
  contact: string | null;
  phone: string;
  email: string | null;
  address: string | null;
  active: boolean;
  itemCount: number;
  createdAt: string;
}

export interface SupplierInput {
  companyName: string;
  contact?: string;
  phone: string;
  email?: string;
  address?: string;
}

export type InventoryItemType = "medicamento" | "reactivo_laboratorio" | "material_clinico";

export interface InventoryItemListItem {
  id: number;
  name: string;
  type: InventoryItemType;
  currentStock: number;
  minimumStock: number;
  lowStock: boolean;
  costPrice: number;
  unit: string;
  active: boolean;
  supplier: { id: number; name: string } | null;
  medication: { id: number; name: string } | null;
  movementCount: number;
  createdAt: string;
}

export interface InventoryItemInput {
  name: string;
  type: InventoryItemType;
  supplierId?: number | null;
  medicationId?: number | null;
  minimumStock: number;
  costPrice: number;
  unit: string;
}

export type InventoryMovementType = "entrada" | "salida" | "merma";

export interface InventoryMovementListItem {
  id: number;
  type: InventoryMovementType;
  quantity: number;
  recordedAt: string;
  observations: string | null;
  previousStock: number | null;
  resultingStock: number | null;
  item: { id: number; name: string; unit: string };
  user: { id: number; name: string; username: string };
}

export interface InventoryMovementInput {
  itemId: number;
  type: InventoryMovementType;
  quantity: number;
  observations?: string;
}

export interface InventoryOptions {
  suppliers: CareOption[];
  medications: CareOption[];
  items: Array<{ id: number; label: string; active: boolean; currentStock: number; unit: string }>;
}

export interface PrivateDocumentMetadata {
  originalName: string | null;
  mimeType: string | null;
  sizeBytes: number | null;
  sha256: string | null;
  stored: boolean;
}

export interface StudyFileListItem {
  id: number;
  studyType: string;
  description: string | null;
  uploadedAt: string;
  active: boolean;
  statusChangedAt: string | null;
  statusReason: string | null;
  patient: { id: number; name: string };
  consultation: {
    id: number;
    recordedAt: string;
    recordType: ClinicalRecordType;
    professional: { id: number; name: string };
  };
  uploadedBy: { id: number; name: string; username: string };
  statusChangedBy: { id: number; name: string; username: string } | null;
  document: PrivateDocumentMetadata;
}

export interface StudyFileInput {
  patientId: number;
  consultationId: number;
  studyType: string;
  description?: string;
}

export interface StudyFileMetadataInput {
  studyType: string;
  description?: string;
}

export interface StudyFileOptions {
  consultations: Array<{
    id: number;
    label: string;
    patientId: number;
    active: boolean;
  }>;
}

export type ConsentStatus = "pendiente" | "firmado" | "rechazado" | "revocado";

export interface ConsentListItem {
  id: number;
  status: ConsentStatus;
  signedAt: string | null;
  createdAt: string;
  statusChangedAt: string | null;
  statusReason: string | null;
  observations: string | null;
  patient: { id: number; name: string };
  service: { id: number; name: string };
  createdBy: { id: number; name: string; username: string } | null;
  statusChangedBy: { id: number; name: string; username: string } | null;
  document: PrivateDocumentMetadata;
}

export interface ConsentInput {
  patientId: number;
  serviceId: number;
  observations?: string;
}

export interface ConsentStatusInput {
  status: Exclude<ConsentStatus, "pendiente">;
  reason: string;
}

export interface ConsentOptions {
  patients: CareOption[];
  services: CareOption[];
}

export type WebPublicationState = "draft" | "scheduled" | "active" | "expired";
export type AnnouncementPosition =
  | "inferior_derecha"
  | "inferior_izquierda"
  | "superior_derecha"
  | "superior_izquierda"
  | "centro";

export interface WebContact {
  id: number;
  companyName: string;
  shortName: string | null;
  phone: string;
  email: string | null;
  facebook: string | null;
  instagram: string | null;
  logoUrl: string | null;
  location: string;
  googleMapsUrl: string | null;
  homeVideoUrl: string | null;
  slogan: string | null;
  weekdayHours: string | null;
  saturdayHours: string | null;
  active: boolean;
  createdAt: string;
}

export interface WebContactInput {
  companyName: string;
  shortName?: string;
  phone: string;
  email?: string;
  facebook?: string;
  instagram?: string;
  logoUrl?: string;
  location: string;
  googleMapsUrl?: string;
  homeVideoUrl?: string;
  slogan?: string;
  weekdayHours?: string;
  saturdayHours?: string;
  active: boolean;
}

export interface WebServiceListItem {
  id: number;
  name: string;
  description: string | null;
  imageUrl: string | null;
  clinicalActive: boolean;
  visibleOnWeb: boolean;
  webOrder: number;
}

export interface WebServiceInput {
  description?: string;
  imageUrl?: string;
  visibleOnWeb: boolean;
  webOrder: number;
}

export interface WebProfessionalListItem {
  id: number;
  name: string;
  specialty: string;
  publicProfile: string | null;
  photoUrl: string | null;
  clinicalActive: boolean;
  visibleOnWeb: boolean;
  webOrder: number;
}

export interface WebProfessionalInput {
  publicProfile?: string;
  photoUrl?: string;
  visibleOnWeb: boolean;
  webOrder: number;
}

export interface WebGalleryItem {
  id: number;
  title: string;
  description: string | null;
  imageUrl: string;
  active: boolean;
  webOrder: number;
  createdAt: string;
}

export interface WebGalleryInput {
  title: string;
  description?: string;
  imageUrl: string;
  webOrder: number;
}

export interface WebPromotionItem {
  id: number;
  title: string;
  description: string | null;
  startDate: string;
  endDate: string;
  imageUrl: string | null;
  active: boolean;
  publicationState: WebPublicationState;
  createdAt: string;
}

export interface WebPromotionInput {
  title: string;
  description?: string;
  startDate: string;
  endDate: string;
  imageUrl?: string;
}

export interface WebAnnouncementStyleItem {
  id: number;
  name: string;
  backgroundColor: string;
  textColor: string;
  icon: string | null;
  position: AnnouncementPosition;
  active: boolean;
  createdAt: string;
}

export interface WebAnnouncementStyleInput {
  name: string;
  backgroundColor: string;
  textColor: string;
  icon?: string;
  position: AnnouncementPosition;
}

export interface WebAnnouncementItem {
  id: number;
  title: string;
  description: string | null;
  style: {
    id: number;
    name: string;
    backgroundColor: string;
    textColor: string;
    icon: string | null;
    position: AnnouncementPosition;
    active: boolean;
  };
  promotion: { id: number; title: string; active: boolean } | null;
  startDate: string;
  endDate: string;
  imageUrl: string | null;
  active: boolean;
  publicationState: WebPublicationState;
  createdAt: string;
}

export interface WebAnnouncementInput {
  title: string;
  description?: string;
  styleId: number;
  promotionId?: number | null;
  startDate: string;
  endDate: string;
  imageUrl?: string;
}

export interface WebContentOptions {
  promotions: AdministrationOption[];
  styles: AdministrationOption[];
}

export interface WebContentPreview {
  generatedAt: string;
  contact: WebContact | null;
  services: WebServiceListItem[];
  professionals: WebProfessionalListItem[];
  gallery: WebGalleryItem[];
  promotions: WebPromotionItem[];
  announcements: WebAnnouncementItem[];
}

export interface PublicWebContact {
  companyName: string;
  shortName: string | null;
  phone: string;
  email: string | null;
  facebook: string | null;
  instagram: string | null;
  logoUrl: string | null;
  location: string;
  googleMapsUrl: string | null;
  homeVideoUrl: string | null;
  slogan: string | null;
  weekdayHours: string | null;
  saturdayHours: string | null;
}

export interface PublicWebService {
  id: number;
  name: string;
  description: string | null;
  imageUrl: string | null;
}

export interface PublicWebProfessional {
  id: number;
  name: string;
  specialty: string;
  publicProfile: string | null;
  photoUrl: string | null;
}

export interface PublicWebGalleryItem {
  id: number;
  title: string;
  description: string | null;
  imageUrl: string;
}

export interface PublicWebPromotion {
  id: number;
  title: string;
  description: string | null;
  startDate: string;
  endDate: string;
  imageUrl: string | null;
}

export interface PublicWebAnnouncement {
  id: number;
  title: string;
  description: string | null;
  style: {
    name: string;
    backgroundColor: string;
    textColor: string;
    icon: string | null;
    position: AnnouncementPosition;
  };
  promotion: { id: number; title: string } | null;
  startDate: string;
  endDate: string;
  imageUrl: string | null;
}

export interface PublicWebContent {
  generatedAt: string;
  contact: PublicWebContact | null;
  services: PublicWebService[];
  professionals: PublicWebProfessional[];
  gallery: PublicWebGalleryItem[];
  promotions: PublicWebPromotion[];
  announcements: PublicWebAnnouncement[];
}

export type AuditAction =
  | "creacion"
  | "modificacion"
  | "cambio_estado"
  | "desactivacion"
  | "reactivacion"
  | "anulacion"
  | "cancelacion"
  | "finalizacion"
  | "eliminacion"
  | "cambio_password"
  | "sistema";

export interface AuditEventListItem {
  id: string;
  occurredAt: string;
  user: { id: number | null; username: string; role: string | null };
  module: string;
  entity: string;
  recordId: string | null;
  action: AuditAction;
  changedFields: string[];
  reason: string | null;
  requestId: string | null;
  ipAddress: string | null;
  route: string | null;
  method: string | null;
  origin: "api" | "sistema" | "base_datos";
}

export interface AuditEventDetail extends AuditEventListItem {
  previousData: Record<string, unknown> | null;
  newData: Record<string, unknown> | null;
  userAgent: string | null;
}

export interface AuditOptions {
  actions: AuditAction[];
  modules: string[];
  users: Array<{ id: number; label: string }>;
}
