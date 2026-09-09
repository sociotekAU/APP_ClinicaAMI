import { HttpStatus, Injectable } from "@nestjs/common";
import type {
  AuthUser,
  ClinicalOperationsOptions,
  ClinicalRecordType,
  MedicationListItem,
  PaginatedData,
  PrescriptionDetail,
  PrescriptionListItem,
  ProcedureListItem,
} from "@ami/contracts";
import { CareAccessService } from "../care/care-access.service";
import { AppException } from "../common/errors/app.exception";
import { createPageMeta, paginationOffset } from "../common/pagination/pagination";
import { DatabaseService } from "../database/database.service";
import type { MedicationInputDto, PrescriptionInputDto, ProcedureInputDto } from "./dto/clinical-operations-input.dto";
import type { ListMedicationsDto, ListPrescriptionsDto, ListProceduresDto } from "./dto/list-clinical-operations.dto";

const PRESCRIPTION_INCLUDE = {
  tb_pacientes: true,
  tb_medicos: { include: { tb_especialidades: true } },
  _count: { select: { tb_detalle_receta: true } },
};

const PROCEDURE_INCLUDE = {
  tb_servicios: true,
  tb_consultas: {
    include: {
      tb_citas: {
        include: { tb_pacientes: true, tb_medicos: true },
      },
    },
  },
};

function optionalText(value: string | undefined): string | null {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

@Injectable()
export class ClinicalOperationsService {
  constructor(
    private readonly database: DatabaseService,
    private readonly access: CareAccessService,
  ) {}

  async options(user: AuthUser): Promise<ClinicalOperationsOptions> {
    const scope = await this.access.professionalScope(user);
    const [patients, professionals, medications, records, services] = await Promise.all([
      this.database.client.tb_pacientes.findMany({ orderBy: [{ apellidos: "asc" }, { nombres: "asc" }], take: 500 }),
      this.database.client.tb_medicos.findMany({
        where: scope === null ? undefined : { id: scope },
        include: { tb_especialidades: true },
        orderBy: { nombre: "asc" },
      }),
      this.database.client.tb_medicamentos.findMany({ orderBy: { nombre_comercial: "asc" } }),
      this.database.client.tb_consultas.findMany({
        where: scope === null ? undefined : { tb_citas: { id_doctor: scope } },
        include: { tb_citas: { include: { tb_pacientes: true } } },
        orderBy: [{ fecha_registro: "desc" }, { id_consulta: "desc" }],
        take: 500,
      }),
      this.database.client.tb_servicios.findMany({ orderBy: { nombre: "asc" } }),
    ]);
    return {
      patients: patients.map((row) => ({ id: row.id_paciente, label: `${row.apellidos}, ${row.nombres}`, active: row.estado })),
      professionals: professionals.map((row) => ({ id: row.id, label: `${row.nombre} · ${row.tb_especialidades.nombre}`, active: row.estado && row.tb_especialidades.estado })),
      medications: medications.map((row) => ({ id: row.id_medicamento, label: `${row.nombre_comercial} · ${row.concentracion}`, active: row.estado })),
      clinicalRecords: records.map((row) => ({ id: row.id_consulta, label: `#${row.id_consulta} · ${row.tb_citas.tb_pacientes.apellidos}, ${row.tb_citas.tb_pacientes.nombres} · ${row.fecha_registro.toLocaleDateString("es-GT")}` })),
      services: services.map((row) => ({ id: row.id, label: row.nombre, active: row.estado })),
    };
  }

  async listMedications(query: ListMedicationsDto): Promise<PaginatedData<MedicationListItem>> {
    const search = query.search?.trim();
    const where = {
      ...(query.status === "all" ? {} : { estado: query.status === "active" }),
      ...(search ? { OR: [
        { nombre_comercial: { contains: search, mode: "insensitive" as const } },
        { principio_activo: { contains: search, mode: "insensitive" as const } },
        { presentacion: { contains: search, mode: "insensitive" as const } },
        { concentracion: { contains: search, mode: "insensitive" as const } },
      ] } : {}),
    };
    const primaryOrder = query.sortBy === "activeIngredient" ? { principio_activo: query.sortDirection } : query.sortBy === "createdAt" ? { fecha_creacion: query.sortDirection } : { nombre_comercial: query.sortDirection };
    const [rows, totalItems] = await Promise.all([
      this.database.client.tb_medicamentos.findMany({ where, include: { _count: { select: { tb_detalle_receta: true } } }, orderBy: [primaryOrder, { id_medicamento: "asc" }], skip: paginationOffset(query.page, query.pageSize), take: query.pageSize }),
      this.database.client.tb_medicamentos.count({ where }),
    ]);
    return { items: rows.map((row) => this.toMedication(row)), pagination: createPageMeta(query.page, query.pageSize, totalItems) };
  }

  async createMedication(input: MedicationInputDto): Promise<MedicationListItem> {
    const row = await this.database.client.tb_medicamentos.create({ data: this.medicationData(input), include: { _count: { select: { tb_detalle_receta: true } } } });
    return this.toMedication(row);
  }

  async updateMedication(id: number, input: MedicationInputDto): Promise<MedicationListItem> {
    const row = await this.database.client.tb_medicamentos.update({ where: { id_medicamento: id }, data: this.medicationData(input), include: { _count: { select: { tb_detalle_receta: true } } } });
    return this.toMedication(row);
  }

  async setMedicationStatus(id: number, active: boolean): Promise<MedicationListItem> {
    const row = await this.database.client.tb_medicamentos.update({ where: { id_medicamento: id }, data: { estado: active }, include: { _count: { select: { tb_detalle_receta: true } } } });
    return this.toMedication(row);
  }

  async listPrescriptions(query: ListPrescriptionsDto, user: AuthUser): Promise<PaginatedData<PrescriptionListItem>> {
    const scope = await this.access.professionalScope(user);
    const search = query.search?.trim();
    const where = {
      ...(query.status === "all" ? {} : { estado: query.status }),
      ...(scope === null ? {} : { id_doctor: scope }),
      ...(search ? { OR: [
        { diagnostico: { contains: search, mode: "insensitive" as const } },
        { tb_pacientes: { nombres: { contains: search, mode: "insensitive" as const } } },
        { tb_pacientes: { apellidos: { contains: search, mode: "insensitive" as const } } },
        { tb_medicos: { nombre: { contains: search, mode: "insensitive" as const } } },
      ] } : {}),
    };
    const primaryOrder = query.sortBy === "patient" ? { tb_pacientes: { apellidos: query.sortDirection } } : query.sortBy === "professional" ? { tb_medicos: { nombre: query.sortDirection } } : { fecha_emision: query.sortDirection };
    const [rows, totalItems] = await Promise.all([
      this.database.client.tb_recetas.findMany({ where, include: PRESCRIPTION_INCLUDE, orderBy: [primaryOrder, { id_receta: "desc" }], skip: paginationOffset(query.page, query.pageSize), take: query.pageSize }),
      this.database.client.tb_recetas.count({ where }),
    ]);
    return { items: rows.map((row) => this.toPrescription(row)), pagination: createPageMeta(query.page, query.pageSize, totalItems) };
  }

  async prescriptionDetail(id: number, user: AuthUser): Promise<PrescriptionDetail> {
    const scope = await this.access.professionalScope(user);
    const row = await this.database.client.tb_recetas.findFirst({
      where: { id_receta: id, ...(scope === null ? {} : { id_doctor: scope }) },
      include: { ...PRESCRIPTION_INCLUDE, tb_detalle_receta: { include: { tb_medicamentos: true }, orderBy: { id_detalle: "asc" } } },
    });
    if (!row) this.notFound("La receta solicitada no existe o no está disponible para su cuenta.");
    return { ...this.toPrescription(row), items: row.tb_detalle_receta.map((line) => ({ id: line.id_detalle, medication: { id: line.tb_medicamentos.id_medicamento, label: `${line.tb_medicamentos.nombre_comercial} · ${line.tb_medicamentos.concentracion}` }, dose: line.dosis, durationDays: line.duracion_dias })) };
  }

  async createPrescription(input: PrescriptionInputDto, user: AuthUser): Promise<PrescriptionDetail> {
    const scope = await this.access.professionalScope(user);
    this.access.ensureScopedProfessional(scope, input.professionalId);
    const [patient, professional, medications] = await Promise.all([
      this.database.client.tb_pacientes.findUnique({ where: { id_paciente: input.patientId } }),
      this.database.client.tb_medicos.findUnique({ where: { id: input.professionalId }, include: { tb_especialidades: true } }),
      this.database.client.tb_medicamentos.findMany({ where: { id_medicamento: { in: input.items.map((line) => line.medicationId) }, estado: true } }),
    ]);
    if (!patient) this.notFound("El paciente seleccionado no existe.");
    if (!professional) this.notFound("El profesional seleccionado no existe.");
    if (!patient.estado) this.conflict("patientId", "Seleccione un paciente activo.");
    if (!professional.estado || !professional.tb_especialidades.estado) this.conflict("professionalId", "Seleccione un profesional activo.");
    if (medications.length !== input.items.length) this.conflict("items", "Todas las líneas deben utilizar medicamentos activos.");
    const created = await this.database.client.$transaction(async (transaction) => {
      const recipe = await transaction.tb_recetas.create({ data: { id_paciente: input.patientId, id_doctor: input.professionalId, diagnostico: input.diagnosis.trim() } });
      await transaction.tb_detalle_receta.createMany({ data: input.items.map((line) => ({ id_receta: recipe.id_receta, id_medicamento: line.medicationId, dosis: line.dose.trim(), duracion_dias: line.durationDays })) });
      return recipe;
    });
    return this.prescriptionDetail(created.id_receta, user);
  }

  async annulPrescription(id: number, reason: string, user: AuthUser): Promise<PrescriptionDetail> {
    const scope = await this.access.professionalScope(user);
    const current = await this.database.client.tb_recetas.findFirst({ where: { id_receta: id, ...(scope === null ? {} : { id_doctor: scope }) } });
    if (!current) this.notFound("La receta solicitada no existe o no está disponible para su cuenta.");
    if (current.estado === "anulada") this.conflict("reason", "La receta ya se encuentra anulada.");
    await this.database.client.tb_recetas.update({ where: { id_receta: id }, data: { estado: "anulada", fecha_anulacion: new Date(), motivo_anulacion: reason.trim() } });
    return this.prescriptionDetail(id, user);
  }

  async listProcedures(query: ListProceduresDto, user: AuthUser): Promise<PaginatedData<ProcedureListItem>> {
    const scope = await this.access.professionalScope(user);
    const search = query.search?.trim();
    const where = {
      ...(query.status === "all" ? {} : { estado: query.status === "active" }),
      ...(scope === null ? {} : { tb_consultas: { tb_citas: { id_doctor: scope } } }),
      ...(search ? { OR: [
        { observaciones_procedimiento: { contains: search, mode: "insensitive" as const } },
        { tb_servicios: { nombre: { contains: search, mode: "insensitive" as const } } },
        { tb_consultas: { tb_citas: { tb_pacientes: { nombres: { contains: search, mode: "insensitive" as const } } } } },
        { tb_consultas: { tb_citas: { tb_pacientes: { apellidos: { contains: search, mode: "insensitive" as const } } } } },
      ] } : {}),
    };
    const primaryOrder = query.sortBy === "patient"
      ? { tb_consultas: { tb_citas: { tb_pacientes: { apellidos: query.sortDirection } } } }
      : query.sortBy === "professional"
        ? { tb_consultas: { tb_citas: { tb_medicos: { nombre: query.sortDirection } } } }
        : query.sortBy === "service"
          ? { tb_servicios: { nombre: query.sortDirection } }
          : { fecha_registro: query.sortDirection };
    const [rows, totalItems] = await Promise.all([
      this.database.client.tb_consulta_servicios.findMany({ where, include: PROCEDURE_INCLUDE, orderBy: [primaryOrder, { id_detalle: "desc" }], skip: paginationOffset(query.page, query.pageSize), take: query.pageSize }),
      this.database.client.tb_consulta_servicios.count({ where }),
    ]);
    return { items: rows.map((row) => this.toProcedure(row)), pagination: createPageMeta(query.page, query.pageSize, totalItems) };
  }

  async createProcedure(input: ProcedureInputDto, user: AuthUser): Promise<ProcedureListItem> {
    const scope = await this.access.professionalScope(user);
    await this.validateProcedureRelations(input, scope);
    const row = await this.database.client.tb_consulta_servicios.create({ data: { id_consulta: input.clinicalRecordId, id_servicio: input.serviceId, observaciones_procedimiento: optionalText(input.observations) }, include: PROCEDURE_INCLUDE });
    return this.toProcedure(row);
  }

  async updateProcedure(id: number, input: ProcedureInputDto, user: AuthUser): Promise<ProcedureListItem> {
    const scope = await this.access.professionalScope(user);
    const current = await this.database.client.tb_consulta_servicios.findUnique({ where: { id_detalle: id }, include: { tb_consultas: { include: { tb_citas: true } } } });
    if (!current) this.notFound("El procedimiento solicitado no existe.");
    this.access.ensureScopedProfessional(scope, current.tb_consultas.tb_citas.id_doctor);
    if (!current.estado) this.conflict("active", "Active el procedimiento antes de editarlo.");
    await this.validateProcedureRelations(input, scope);
    const row = await this.database.client.tb_consulta_servicios.update({ where: { id_detalle: id }, data: { id_consulta: input.clinicalRecordId, id_servicio: input.serviceId, observaciones_procedimiento: optionalText(input.observations) }, include: PROCEDURE_INCLUDE });
    return this.toProcedure(row);
  }

  async setProcedureStatus(id: number, active: boolean, user: AuthUser): Promise<ProcedureListItem> {
    const scope = await this.access.professionalScope(user);
    const current = await this.database.client.tb_consulta_servicios.findUnique({ where: { id_detalle: id }, include: { tb_consultas: { include: { tb_citas: true } }, tb_servicios: true } });
    if (!current) this.notFound("El procedimiento solicitado no existe.");
    this.access.ensureScopedProfessional(scope, current.tb_consultas.tb_citas.id_doctor);
    if (active && !current.tb_servicios.estado) this.conflict("active", "No puede activar un procedimiento cuyo servicio está inactivo.");
    const row = await this.database.client.tb_consulta_servicios.update({ where: { id_detalle: id }, data: { estado: active }, include: PROCEDURE_INCLUDE });
    return this.toProcedure(row);
  }

  private medicationData(input: MedicationInputDto) {
    return { nombre_comercial: input.commercialName.trim(), principio_activo: input.activeIngredient.trim(), presentacion: input.presentation.trim(), concentracion: input.concentration.trim() };
  }

  private async validateProcedureRelations(input: ProcedureInputDto, scope: number | null): Promise<void> {
    const [record, service] = await Promise.all([
      this.database.client.tb_consultas.findUnique({ where: { id_consulta: input.clinicalRecordId }, include: { tb_citas: true } }),
      this.database.client.tb_servicios.findUnique({ where: { id: input.serviceId } }),
    ]);
    if (!record) this.notFound("El expediente seleccionado no existe.");
    this.access.ensureScopedProfessional(scope, record.tb_citas.id_doctor);
    if (!service) this.notFound("El servicio seleccionado no existe.");
    if (!service.estado) this.conflict("serviceId", "Seleccione un servicio activo.");
  }

  private notFound(message: string): never { throw new AppException("RESOURCE_NOT_FOUND", message, HttpStatus.NOT_FOUND); }
  private conflict(field: string, message: string): never { throw new AppException("RESOURCE_CONFLICT", message, HttpStatus.CONFLICT, [{ field, message }]); }

  private toMedication(row: { id_medicamento: number; nombre_comercial: string; principio_activo: string; presentacion: string; concentracion: string; estado: boolean; fecha_creacion: Date; _count: { tb_detalle_receta: number } }): MedicationListItem {
    return { id: row.id_medicamento, commercialName: row.nombre_comercial, activeIngredient: row.principio_activo, presentation: row.presentacion, concentration: row.concentracion, active: row.estado, prescriptionCount: row._count.tb_detalle_receta, createdAt: row.fecha_creacion.toISOString() };
  }

  private toPrescription(row: { id_receta: number; fecha_emision: Date; diagnostico: string; estado: string; fecha_anulacion: Date | null; motivo_anulacion: string | null; tb_pacientes: { id_paciente: number; nombres: string; apellidos: string }; tb_medicos: { id: number; nombre: string; tb_especialidades: { nombre: string } }; _count: { tb_detalle_receta: number } }): PrescriptionListItem {
    return { id: row.id_receta, issuedAt: row.fecha_emision.toISOString(), diagnosis: row.diagnostico, status: row.estado as PrescriptionListItem["status"], annulledAt: row.fecha_anulacion?.toISOString() ?? null, annulmentReason: row.motivo_anulacion, patient: { id: row.tb_pacientes.id_paciente, name: `${row.tb_pacientes.nombres} ${row.tb_pacientes.apellidos}` }, professional: { id: row.tb_medicos.id, name: row.tb_medicos.nombre, specialty: row.tb_medicos.tb_especialidades.nombre }, itemCount: row._count.tb_detalle_receta };
  }

  private toProcedure(row: { id_detalle: number; observaciones_procedimiento: string | null; estado: boolean; fecha_registro: Date; tb_servicios: { id: number; nombre: string }; tb_consultas: { id_consulta: number; tipo_expediente: string; tb_citas: { tb_pacientes: { id_paciente: number; nombres: string; apellidos: string }; tb_medicos: { id: number; nombre: string } } } }): ProcedureListItem {
    return { id: row.id_detalle, clinicalRecordId: row.tb_consultas.id_consulta, clinicalRecordType: (row.tb_consultas.tipo_expediente === "psicologia" ? "psychology" : "general") as ClinicalRecordType, service: { id: row.tb_servicios.id, name: row.tb_servicios.nombre }, patient: { id: row.tb_consultas.tb_citas.tb_pacientes.id_paciente, name: `${row.tb_consultas.tb_citas.tb_pacientes.nombres} ${row.tb_consultas.tb_citas.tb_pacientes.apellidos}` }, professional: { id: row.tb_consultas.tb_citas.tb_medicos.id, name: row.tb_consultas.tb_citas.tb_medicos.nombre }, observations: row.observaciones_procedimiento, active: row.estado, recordedAt: row.fecha_registro.toISOString() };
  }
}
