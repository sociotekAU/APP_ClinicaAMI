import { HttpStatus, Injectable } from "@nestjs/common";
import type { ConsentListItem, ConsentOptions, StudyFileListItem, StudyFileOptions, AuthUser, PaginatedData, PrivateDocumentMetadata } from "@ami/contracts";
import type { Prisma } from "@ami/database";
import { AppException } from "../common/errors/app.exception";
import { createPageMeta, paginationOffset } from "../common/pagination/pagination";
import { CareAccessService } from "../care/care-access.service";
import { DatabaseService } from "../database/database.service";
import type { ConsentInputDto, ConsentStatusDto, StudyFileMetadataDto, StudyFileStatusDto, StudyFileUploadDto } from "./dto/clinical-documents-input.dto";
import type { ListConsentsDto, ListStudyFilesDto } from "./dto/list-clinical-documents.dto";
import { PrivateStorageService, type ResolvedPrivateFile, type StoredPrivateFile } from "./private-storage.service";

const STUDY_INCLUDE = {
  tb_pacientes: true,
  tb_usuarios: true,
  tb_usuarios_tb_archivos_estudios_id_usuario_estadoTotb_usuarios: true,
  tb_consultas: { include: { tb_citas: { include: { tb_medicos: true } } } },
} as const satisfies Prisma.tb_archivos_estudiosInclude;

const CONSENT_INCLUDE = {
  tb_pacientes: true,
  tb_servicios: true,
  tb_usuarios: true,
  tb_usuarios_tb_consentimientos_informados_id_usuario_estadoTotb_usuarios: true,
} as const satisfies Prisma.tb_consentimientos_informadosInclude;

type StudyRow = Prisma.tb_archivos_estudiosGetPayload<{ include: typeof STUDY_INCLUDE }>;
type ConsentRow = Prisma.tb_consentimientos_informadosGetPayload<{ include: typeof CONSENT_INCLUDE }>;

function optionalText(value: string | undefined): string | null {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

function patientName(row: { nombres: string; apellidos: string }): string {
  return `${row.nombres} ${row.apellidos}`;
}

@Injectable()
export class ClinicalDocumentsService {
  constructor(
    private readonly database: DatabaseService,
    private readonly access: CareAccessService,
    private readonly storage: PrivateStorageService,
  ) {}

  async studyOptions(user: AuthUser): Promise<StudyFileOptions> {
    const scope = await this.access.professionalScope(user);
    const rows = await this.database.client.tb_consultas.findMany({
      where: scope === null ? {} : { tb_citas: { id_doctor: scope } },
      include: { tb_citas: { include: { tb_pacientes: true, tb_medicos: true } } },
      orderBy: { fecha_registro: "desc" },
      take: 500,
    });
    return { consultations: rows.map((row) => ({
      id: row.id_consulta,
      patientId: row.tb_citas.id_paciente,
      active: row.tb_citas.tb_pacientes.estado,
      label: `${patientName(row.tb_citas.tb_pacientes)} · ${row.tb_citas.tb_medicos.nombre} · ${row.fecha_registro.toISOString().slice(0, 10)}`,
    })) };
  }

  async listStudies(query: ListStudyFilesDto, user: AuthUser): Promise<PaginatedData<StudyFileListItem>> {
    const scope = await this.access.professionalScope(user);
    const search = query.search?.trim();
    const where = {
      ...(query.status === "all" ? {} : { estado: query.status === "active" }),
      ...(scope === null ? {} : { tb_consultas: { tb_citas: { id_doctor: scope } } }),
      ...(search ? { OR: [
        { tipo_estudio: { contains: search, mode: "insensitive" as const } },
        { descripcion: { contains: search, mode: "insensitive" as const } },
        { nombre_original: { contains: search, mode: "insensitive" as const } },
        { tb_pacientes: { nombres: { contains: search, mode: "insensitive" as const } } },
        { tb_pacientes: { apellidos: { contains: search, mode: "insensitive" as const } } },
      ] } : {}),
    };
    const primaryOrder = query.sortBy === "patient"
      ? { tb_pacientes: { apellidos: query.sortDirection } }
      : query.sortBy === "studyType"
        ? { tipo_estudio: query.sortDirection }
        : { fecha_subida: query.sortDirection };
    const [rows, totalItems] = await Promise.all([
      this.database.client.tb_archivos_estudios.findMany({ where, include: STUDY_INCLUDE, orderBy: [primaryOrder, { id_archivo: "desc" }], skip: paginationOffset(query.page, query.pageSize), take: query.pageSize }),
      this.database.client.tb_archivos_estudios.count({ where }),
    ]);
    return { items: rows.map((row) => this.toStudy(row)), pagination: createPageMeta(query.page, query.pageSize, totalItems) };
  }

  async createStudy(input: StudyFileUploadDto, file: StoredPrivateFile, user: AuthUser): Promise<StudyFileListItem> {
    try {
      const scope = await this.access.professionalScope(user);
      const consultation = await this.database.client.tb_consultas.findFirst({
        where: { id_consulta: input.consultationId, ...(scope === null ? {} : { tb_citas: { id_doctor: scope } }) },
        include: { tb_citas: { include: { tb_pacientes: true } } },
      });
      if (!consultation) this.notFound("La consulta seleccionada no existe o no está autorizada.");
      if (consultation.tb_citas.id_paciente !== input.patientId) this.conflict("patientId", "La consulta no pertenece al paciente seleccionado.");
      if (!consultation.tb_citas.tb_pacientes.estado) this.conflict("patientId", "El paciente seleccionado está inactivo.");
      const row = await this.database.client.tb_archivos_estudios.create({ data: {
        id_paciente: input.patientId,
        id_consulta: input.consultationId,
        tipo_estudio: input.studyType.trim(),
        ruta_archivo: file.relativePath,
        id_usuario: user.id,
        descripcion: optionalText(input.description),
        nombre_original: file.originalName,
        tipo_mime: file.mimeType,
        tamano_bytes: file.sizeBytes,
        hash_sha256: file.sha256,
      }, include: STUDY_INCLUDE });
      return this.toStudy(row);
    } catch (error) { await this.storage.discard(file.relativePath); throw error; }
  }

  async updateStudy(id: number, input: StudyFileMetadataDto, user: AuthUser): Promise<StudyFileListItem> {
    await this.authorizedStudy(id, user);
    const row = await this.database.client.tb_archivos_estudios.update({ where: { id_archivo: id }, data: { tipo_estudio: input.studyType.trim(), descripcion: optionalText(input.description) }, include: STUDY_INCLUDE });
    return this.toStudy(row);
  }

  async setStudyStatus(id: number, input: StudyFileStatusDto, user: AuthUser): Promise<StudyFileListItem> {
    const current = await this.authorizedStudy(id, user);
    if (current.estado === input.active) this.conflict("active", `El archivo ya se encuentra ${input.active ? "activo" : "inactivo"}.`);
    const row = await this.database.client.tb_archivos_estudios.update({ where: { id_archivo: id }, data: { estado: input.active, fecha_estado: new Date(), motivo_estado: input.reason.trim(), id_usuario_estado: user.id }, include: STUDY_INCLUDE });
    return this.toStudy(row);
  }

  async readStudy(id: number, user: AuthUser): Promise<ResolvedPrivateFile> {
    const row = await this.authorizedStudy(id, user);
    return this.storage.resolveForRead(this.fileMetadata(row.ruta_archivo, row.nombre_original, row.tipo_mime, row.tamano_bytes, row.hash_sha256));
  }

  async consentOptions(user: AuthUser): Promise<ConsentOptions> {
    const scope = await this.access.professionalScope(user);
    const [patients, services] = await Promise.all([
      this.database.client.tb_pacientes.findMany({ where: scope === null ? {} : { tb_citas: { some: { id_doctor: scope } } }, orderBy: [{ apellidos: "asc" }, { nombres: "asc" }], take: 500 }),
      this.database.client.tb_servicios.findMany({ orderBy: { nombre: "asc" } }),
    ]);
    return { patients: patients.map((row) => ({ id: row.id_paciente, label: `${row.apellidos}, ${row.nombres}`, active: row.estado })), services: services.map((row) => ({ id: row.id, label: row.nombre, active: row.estado })) };
  }

  async listConsents(query: ListConsentsDto, user: AuthUser): Promise<PaginatedData<ConsentListItem>> {
    const scope = await this.access.professionalScope(user);
    const search = query.search?.trim();
    const where = {
      ...(query.status === "all" ? {} : { estado_firma: query.status }),
      ...(scope === null ? {} : { tb_pacientes: { tb_citas: { some: { id_doctor: scope } } } }),
      ...(search ? { OR: [
        { observaciones: { contains: search, mode: "insensitive" as const } },
        { motivo_estado: { contains: search, mode: "insensitive" as const } },
        { nombre_original: { contains: search, mode: "insensitive" as const } },
        { tb_pacientes: { nombres: { contains: search, mode: "insensitive" as const } } },
        { tb_pacientes: { apellidos: { contains: search, mode: "insensitive" as const } } },
        { tb_servicios: { nombre: { contains: search, mode: "insensitive" as const } } },
      ] } : {}),
    };
    const primaryOrder = query.sortBy === "patient"
      ? { tb_pacientes: { apellidos: query.sortDirection } }
      : query.sortBy === "service"
        ? { tb_servicios: { nombre: query.sortDirection } }
        : { fecha_creacion: query.sortDirection };
    const [rows, totalItems] = await Promise.all([
      this.database.client.tb_consentimientos_informados.findMany({ where, include: CONSENT_INCLUDE, orderBy: [primaryOrder, { id_consentimiento: "desc" }], skip: paginationOffset(query.page, query.pageSize), take: query.pageSize }),
      this.database.client.tb_consentimientos_informados.count({ where }),
    ]);
    return { items: rows.map((row) => this.toConsent(row)), pagination: createPageMeta(query.page, query.pageSize, totalItems) };
  }

  async createConsent(input: ConsentInputDto, user: AuthUser): Promise<ConsentListItem> {
    await this.validateConsentRelations(input, user);
    const row = await this.database.client.tb_consentimientos_informados.create({ data: { id_paciente: input.patientId, id_servicio: input.serviceId, id_usuario: user.id, observaciones: optionalText(input.observations) }, include: CONSENT_INCLUDE });
    return this.toConsent(row);
  }

  async updateConsent(id: number, input: ConsentInputDto, user: AuthUser): Promise<ConsentListItem> {
    const current = await this.authorizedConsent(id, user);
    if (current.estado_firma !== "pendiente") this.conflict("status", "Solo un consentimiento pendiente puede modificarse.");
    await this.validateConsentRelations(input, user);
    const row = await this.database.client.tb_consentimientos_informados.update({ where: { id_consentimiento: id }, data: { id_paciente: input.patientId, id_servicio: input.serviceId, observaciones: optionalText(input.observations) }, include: CONSENT_INCLUDE });
    return this.toConsent(row);
  }

  async attachConsentDocument(id: number, file: StoredPrivateFile, user: AuthUser): Promise<ConsentListItem> {
    const current = await this.authorizedConsent(id, user);
    if (current.estado_firma !== "pendiente") { await this.storage.discard(file.relativePath); this.conflict("file", "El documento de un consentimiento finalizado no puede reemplazarse."); }
    try {
      const row = await this.database.client.tb_consentimientos_informados.update({ where: { id_consentimiento: id }, data: { ruta_documento: file.relativePath, nombre_original: file.originalName, tipo_mime: file.mimeType, tamano_bytes: file.sizeBytes, hash_sha256: file.sha256, id_usuario: user.id }, include: CONSENT_INCLUDE });
      await this.storage.discard(current.ruta_documento);
      return this.toConsent(row);
    } catch (error) { await this.storage.discard(file.relativePath); throw error; }
  }

  async setConsentStatus(id: number, input: ConsentStatusDto, user: AuthUser): Promise<ConsentListItem> {
    const current = await this.authorizedConsent(id, user);
    if (input.status === "revocado" && current.estado_firma !== "firmado") this.conflict("status", "Solo un consentimiento firmado puede revocarse.");
    if (["firmado", "rechazado"].includes(input.status) && current.estado_firma !== "pendiente") this.conflict("status", "Solo un consentimiento pendiente puede finalizarse.");
    if (input.status === "firmado" && !this.hasStoredDocument(current.ruta_documento, current.nombre_original, current.tipo_mime, current.tamano_bytes, current.hash_sha256)) this.conflict("file", "Adjunte el documento firmado antes de confirmar la firma.");
    const now = new Date();
    const row = await this.database.client.tb_consentimientos_informados.update({ where: { id_consentimiento: id }, data: { estado_firma: input.status, fecha_firma: input.status === "firmado" ? now : current.fecha_firma, fecha_estado: now, motivo_estado: input.reason.trim(), id_usuario_estado: user.id }, include: CONSENT_INCLUDE });
    return this.toConsent(row);
  }

  async readConsent(id: number, user: AuthUser): Promise<ResolvedPrivateFile> {
    const row = await this.authorizedConsent(id, user);
    return this.storage.resolveForRead(this.fileMetadata(row.ruta_documento, row.nombre_original, row.tipo_mime, row.tamano_bytes, row.hash_sha256));
  }

  private async authorizedStudy(id: number, user: AuthUser): Promise<StudyRow> {
    const scope = await this.access.professionalScope(user);
    const row = await this.database.client.tb_archivos_estudios.findFirst({ where: { id_archivo: id, ...(scope === null ? {} : { tb_consultas: { tb_citas: { id_doctor: scope } } }) }, include: STUDY_INCLUDE });
    if (!row) this.notFound("El archivo solicitado no existe o no está autorizado.");
    return row;
  }

  private async authorizedConsent(id: number, user: AuthUser): Promise<ConsentRow> {
    const scope = await this.access.professionalScope(user);
    const row = await this.database.client.tb_consentimientos_informados.findFirst({ where: { id_consentimiento: id, ...(scope === null ? {} : { tb_pacientes: { tb_citas: { some: { id_doctor: scope } } } }) }, include: CONSENT_INCLUDE });
    if (!row) this.notFound("El consentimiento solicitado no existe o no está autorizado.");
    return row;
  }

  private async validateConsentRelations(input: ConsentInputDto, user: AuthUser): Promise<void> {
    const scope = await this.access.professionalScope(user);
    const [patient, service] = await Promise.all([
      this.database.client.tb_pacientes.findFirst({ where: { id_paciente: input.patientId, ...(scope === null ? {} : { tb_citas: { some: { id_doctor: scope } } }) } }),
      this.database.client.tb_servicios.findUnique({ where: { id: input.serviceId } }),
    ]);
    if (!patient) this.notFound("El paciente seleccionado no existe o no está autorizado.");
    if (!patient.estado) this.conflict("patientId", "Seleccione un paciente activo.");
    if (!service) this.notFound("El servicio seleccionado no existe.");
    if (!service.estado) this.conflict("serviceId", "Seleccione un servicio activo.");
  }

  private fileMetadata(route: string | null, name: string | null, mime: string | null, size: bigint | null, hash: string | null): StoredPrivateFile {
    if (!route || !name || !mime || size === null || !hash) this.notFound("Este registro no tiene un archivo privado disponible.");
    return { relativePath: route, originalName: name, mimeType: mime, sizeBytes: Number(size), sha256: hash };
  }

  private document(route: string | null, name: string | null, mime: string | null, size: bigint | null, hash: string | null): PrivateDocumentMetadata {
    return { originalName: name, mimeType: mime, sizeBytes: size === null ? null : Number(size), sha256: hash, stored: this.hasStoredDocument(route, name, mime, size, hash) };
  }

  private hasStoredDocument(route: string | null, name: string | null, mime: string | null, size: bigint | null, hash: string | null): boolean {
    return Boolean(route && name && mime && size !== null && hash);
  }

  private toStudy(row: StudyRow): StudyFileListItem {
    const statusUser = row.tb_usuarios_tb_archivos_estudios_id_usuario_estadoTotb_usuarios;
    return { id: row.id_archivo, studyType: row.tipo_estudio, description: row.descripcion, uploadedAt: row.fecha_subida.toISOString(), active: row.estado, statusChangedAt: row.fecha_estado?.toISOString() ?? null, statusReason: row.motivo_estado, patient: { id: row.tb_pacientes.id_paciente, name: patientName(row.tb_pacientes) }, consultation: { id: row.tb_consultas.id_consulta, recordedAt: row.tb_consultas.fecha_registro.toISOString(), recordType: row.tb_consultas.tipo_expediente as StudyFileListItem["consultation"]["recordType"], professional: { id: row.tb_consultas.tb_citas.tb_medicos.id, name: row.tb_consultas.tb_citas.tb_medicos.nombre } }, uploadedBy: { id: row.tb_usuarios.id_usuario, name: row.tb_usuarios.nombre, username: row.tb_usuarios.username }, statusChangedBy: statusUser ? { id: statusUser.id_usuario, name: statusUser.nombre, username: statusUser.username } : null, document: this.document(row.ruta_archivo, row.nombre_original, row.tipo_mime, row.tamano_bytes, row.hash_sha256) };
  }

  private toConsent(row: ConsentRow): ConsentListItem {
    const statusUser = row.tb_usuarios_tb_consentimientos_informados_id_usuario_estadoTotb_usuarios;
    return { id: row.id_consentimiento, status: row.estado_firma as ConsentListItem["status"], signedAt: row.fecha_firma?.toISOString() ?? null, createdAt: row.fecha_creacion.toISOString(), statusChangedAt: row.fecha_estado?.toISOString() ?? null, statusReason: row.motivo_estado, observations: row.observaciones, patient: { id: row.tb_pacientes.id_paciente, name: patientName(row.tb_pacientes) }, service: { id: row.tb_servicios.id, name: row.tb_servicios.nombre }, createdBy: row.tb_usuarios ? { id: row.tb_usuarios.id_usuario, name: row.tb_usuarios.nombre, username: row.tb_usuarios.username } : null, statusChangedBy: statusUser ? { id: statusUser.id_usuario, name: statusUser.nombre, username: statusUser.username } : null, document: this.document(row.ruta_documento, row.nombre_original, row.tipo_mime, row.tamano_bytes, row.hash_sha256) };
  }

  private notFound(message: string): never { throw new AppException("RESOURCE_NOT_FOUND", message, HttpStatus.NOT_FOUND); }
  private conflict(field: string, message: string): never { throw new AppException("RESOURCE_CONFLICT", message, HttpStatus.CONFLICT, [{ field, message }]); }
}
