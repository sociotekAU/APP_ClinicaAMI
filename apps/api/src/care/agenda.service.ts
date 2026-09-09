import { HttpStatus, Injectable } from "@nestjs/common";
import type {
  AgendaOptions,
  AppointmentListItem,
  AuthUser,
  ClinicListItem,
  PaginatedData,
} from "@ami/contracts";
import { AppException } from "../common/errors/app.exception";
import { createPageMeta, paginationOffset } from "../common/pagination/pagination";
import { DatabaseService } from "../database/database.service";
import { CareAccessService } from "./care-access.service";
import type { AppointmentInputDto, AppointmentStatusInputDto, ClinicInputDto } from "./dto/care-input.dto";
import type { ListAppointmentsDto, ListClinicsDto } from "./dto/list-care.dto";

const APPOINTMENT_INCLUDE = {
  tb_pacientes: true,
  tb_medicos: { include: { tb_especialidades: true } },
  tb_clinicas: true,
  tb_consultas: { select: { id_consulta: true } },
} as const;

function searchVariants(value: string): string[] {
  const plain = value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const accents: Record<string, string> = { a: "á", e: "é", i: "í", n: "ñ", o: "ó", u: "ú" };
  const variants = new Set([value.toLowerCase(), plain]);
  for (let index = 0; index < plain.length; index += 1) {
    const accented = accents[plain[index] ?? ""];
    if (accented) variants.add(`${plain.slice(0, index)}${accented}${plain.slice(index + 1)}`);
  }
  return [...variants];
}

function appointmentSearch(search: string) {
  const terms = search.split(/\s+/).map((term) => term.trim()).filter(Boolean).slice(0, 10);
  return terms.map((term) => ({
    OR: searchVariants(term).flatMap((variant) => [
      { motivo_cita: { contains: variant, mode: "insensitive" as const } },
      { tb_pacientes: { nombres: { contains: variant, mode: "insensitive" as const } } },
      { tb_pacientes: { apellidos: { contains: variant, mode: "insensitive" as const } } },
      { tb_medicos: { nombre: { contains: variant, mode: "insensitive" as const } } },
    ]),
  }));
}

@Injectable()
export class AgendaService {
  constructor(
    private readonly database: DatabaseService,
    private readonly access: CareAccessService,
  ) {}

  async options(user: AuthUser): Promise<AgendaOptions> {
    const scope = await this.access.professionalScope(user);
    const [patients, professionals, clinics] = await Promise.all([
      this.database.client.tb_pacientes.findMany({ orderBy: [{ apellidos: "asc" }, { nombres: "asc" }], take: 500 }),
      this.database.client.tb_medicos.findMany({
        where: scope === null ? undefined : { id: scope },
        include: { tb_especialidades: true },
        orderBy: { nombre: "asc" },
      }),
      this.database.client.tb_clinicas.findMany({
        where: scope === null ? undefined : { id_doctor: scope },
        orderBy: { numero_clinica: "asc" },
      }),
    ]);
    return {
      patients: patients.map((row) => ({ id: row.id_paciente, label: `${row.apellidos}, ${row.nombres}`, active: row.estado })),
      professionals: professionals.map((row) => ({
        id: row.id,
        label: `${row.nombre} · ${row.tb_especialidades.nombre}`,
        active: row.estado && row.tb_especialidades.estado,
      })),
      clinics: clinics.map((row) => ({
        id: row.id_clinica,
        label: `${row.numero_clinica} · ${row.sala}`,
        active: row.estado,
        professionalId: row.id_doctor,
      })),
    };
  }

  async listAppointments(query: ListAppointmentsDto, user: AuthUser): Promise<PaginatedData<AppointmentListItem>> {
    const scope = await this.access.professionalScope(user);
    if (query.professionalId && scope !== null) this.access.ensureScopedProfessional(scope, query.professionalId);
    const search = query.search?.trim();
    const where = {
      ...(query.status === "all" ? {} : { estado: query.status }),
      ...(scope !== null ? { id_doctor: scope } : query.professionalId ? { id_doctor: query.professionalId } : {}),
      ...(query.patientId ? { id_paciente: query.patientId } : {}),
      ...((query.dateFrom || query.dateTo) ? {
        fecha_hora: {
          ...(query.dateFrom ? { gte: this.startOfDate(query.dateFrom) } : {}),
          ...(query.dateTo ? { lte: this.endOfDate(query.dateTo) } : {}),
        },
      } : {}),
      ...(search ? { AND: appointmentSearch(search) } : {}),
    };
    const primaryOrder = query.sortBy === "patient"
      ? { tb_pacientes: { apellidos: query.sortDirection } }
      : query.sortBy === "professional"
        ? { tb_medicos: { nombre: query.sortDirection } }
        : { fecha_hora: query.sortDirection };
    const [rows, totalItems] = await Promise.all([
      this.database.client.tb_citas.findMany({
        where,
        include: APPOINTMENT_INCLUDE,
        orderBy: [primaryOrder, { id_cita: "asc" }],
        skip: paginationOffset(query.page, query.pageSize),
        take: query.pageSize,
      }),
      this.database.client.tb_citas.count({ where }),
    ]);
    return {
      items: rows.map((row) => this.toAppointment(row)),
      pagination: createPageMeta(query.page, query.pageSize, totalItems),
    };
  }

  async createAppointment(input: AppointmentInputDto, user: AuthUser): Promise<AppointmentListItem> {
    const scope = await this.access.professionalScope(user);
    this.access.ensureScopedProfessional(scope, input.professionalId);
    await this.validateAppointmentRelations(input);
    const row = await this.database.client.tb_citas.create({
      data: {
        id_paciente: input.patientId,
        id_doctor: input.professionalId,
        id_clinica: input.clinicId ?? null,
        fecha_hora: new Date(input.scheduledAt),
        motivo_cita: input.reason.trim(),
      },
      include: APPOINTMENT_INCLUDE,
    });
    return this.toAppointment(row);
  }

  async updateAppointment(id: number, input: AppointmentInputDto, user: AuthUser): Promise<AppointmentListItem> {
    const scope = await this.access.professionalScope(user);
    this.access.ensureScopedProfessional(scope, input.professionalId);
    const current = await this.database.client.tb_citas.findUnique({
      where: { id_cita: id },
      include: { tb_consultas: { select: { id_consulta: true } } },
    });
    if (!current) this.notFound("La cita solicitada no existe.");
    this.access.ensureScopedProfessional(scope, current.id_doctor);
    if (current.estado !== "programada" || current.tb_consultas) {
      throw new AppException("RESOURCE_CONFLICT", "Solo las citas programadas y sin expediente pueden editarse.", HttpStatus.CONFLICT);
    }
    await this.validateAppointmentRelations(input);
    const row = await this.database.client.tb_citas.update({
      where: { id_cita: id },
      data: {
        id_paciente: input.patientId,
        id_doctor: input.professionalId,
        id_clinica: input.clinicId ?? null,
        fecha_hora: new Date(input.scheduledAt),
        motivo_cita: input.reason.trim(),
      },
      include: APPOINTMENT_INCLUDE,
    });
    return this.toAppointment(row);
  }

  async setAppointmentStatus(id: number, input: AppointmentStatusInputDto, user: AuthUser): Promise<AppointmentListItem> {
    const scope = await this.access.professionalScope(user);
    const current = await this.database.client.tb_citas.findUnique({
      where: { id_cita: id },
      include: { tb_consultas: { select: { id_consulta: true } } },
    });
    if (!current) this.notFound("La cita solicitada no existe.");
    this.access.ensureScopedProfessional(scope, current.id_doctor);
    if (current.tb_consultas && input.status !== "completada") {
      throw new AppException("RESOURCE_CONFLICT", "Una cita con expediente clínico debe conservar el estado completada.", HttpStatus.CONFLICT);
    }
    if (current.estado !== "programada" && current.estado !== input.status) {
      throw new AppException("RESOURCE_CONFLICT", "El estado final de la cita ya no puede cambiarse.", HttpStatus.CONFLICT);
    }
    const row = await this.database.client.tb_citas.update({
      where: { id_cita: id },
      data: { estado: input.status },
      include: APPOINTMENT_INCLUDE,
    });
    return this.toAppointment(row);
  }

  async listClinics(query: ListClinicsDto, user: AuthUser): Promise<PaginatedData<ClinicListItem>> {
    const scope = await this.access.professionalScope(user);
    const search = query.search?.trim();
    const where = {
      ...(query.status === "all" ? {} : { estado: query.status === "active" }),
      ...(scope === null ? {} : { id_doctor: scope }),
      ...(search ? {
        OR: [
          { numero_clinica: { contains: search, mode: "insensitive" as const } },
          { sala: { contains: search, mode: "insensitive" as const } },
          { tb_medicos: { nombre: { contains: search, mode: "insensitive" as const } } },
        ],
      } : {}),
    };
    const primaryOrder = query.sortBy === "professional"
      ? { tb_medicos: { nombre: query.sortDirection } }
      : query.sortBy === "createdAt"
        ? { fecha_creacion: query.sortDirection }
        : { numero_clinica: query.sortDirection };
    const [rows, totalItems] = await Promise.all([
      this.database.client.tb_clinicas.findMany({
        where,
        include: { tb_medicos: true, _count: { select: { tb_citas: true } } },
        orderBy: [primaryOrder, { id_clinica: "asc" }],
        skip: paginationOffset(query.page, query.pageSize),
        take: query.pageSize,
      }),
      this.database.client.tb_clinicas.count({ where }),
    ]);
    return {
      items: rows.map((row) => this.toClinic(row)),
      pagination: createPageMeta(query.page, query.pageSize, totalItems),
    };
  }

  async createClinic(input: ClinicInputDto, user: AuthUser): Promise<ClinicListItem> {
    const scope = await this.access.professionalScope(user);
    this.access.ensureScopedProfessional(scope, input.professionalId);
    await this.requireActiveProfessional(input.professionalId);
    const row = await this.database.client.tb_clinicas.create({
      data: {
        numero_clinica: input.number.trim(),
        sala: input.room.trim(),
        horario: input.schedule.trim(),
        id_doctor: input.professionalId,
      },
      include: { tb_medicos: true, _count: { select: { tb_citas: true } } },
    });
    return this.toClinic(row);
  }

  async updateClinic(id: number, input: ClinicInputDto, user: AuthUser): Promise<ClinicListItem> {
    const scope = await this.access.professionalScope(user);
    this.access.ensureScopedProfessional(scope, input.professionalId);
    const current = await this.database.client.tb_clinicas.findUnique({ where: { id_clinica: id } });
    if (!current) this.notFound("El consultorio solicitado no existe.");
    this.access.ensureScopedProfessional(scope, current.id_doctor);
    await this.requireActiveProfessional(input.professionalId);
    const row = await this.database.client.tb_clinicas.update({
      where: { id_clinica: id },
      data: {
        numero_clinica: input.number.trim(),
        sala: input.room.trim(),
        horario: input.schedule.trim(),
        id_doctor: input.professionalId,
      },
      include: { tb_medicos: true, _count: { select: { tb_citas: true } } },
    });
    return this.toClinic(row);
  }

  async setClinicStatus(id: number, active: boolean, user: AuthUser): Promise<ClinicListItem> {
    const scope = await this.access.professionalScope(user);
    const current = await this.database.client.tb_clinicas.findUnique({ where: { id_clinica: id } });
    if (!current) this.notFound("El consultorio solicitado no existe.");
    this.access.ensureScopedProfessional(scope, current.id_doctor);
    if (active) await this.requireActiveProfessional(current.id_doctor);
    const row = await this.database.client.tb_clinicas.update({
      where: { id_clinica: id },
      data: { estado: active },
      include: { tb_medicos: true, _count: { select: { tb_citas: true } } },
    });
    return this.toClinic(row);
  }

  private async validateAppointmentRelations(input: AppointmentInputDto): Promise<void> {
    const [patient, professional, clinic] = await Promise.all([
      this.database.client.tb_pacientes.findUnique({ where: { id_paciente: input.patientId } }),
      this.database.client.tb_medicos.findUnique({ where: { id: input.professionalId }, include: { tb_especialidades: true } }),
      input.clinicId ? this.database.client.tb_clinicas.findUnique({ where: { id_clinica: input.clinicId } }) : Promise.resolve(null),
    ]);
    if (!patient) this.notFound("El paciente seleccionado no existe.");
    if (!professional) this.notFound("El profesional seleccionado no existe.");
    if (!patient.estado) this.conflict("patientId", "Seleccione un paciente activo.");
    if (!professional.estado || !professional.tb_especialidades.estado) this.conflict("professionalId", "Seleccione un profesional activo.");
    if (input.clinicId && !clinic) this.notFound("El consultorio seleccionado no existe.");
    if (clinic && (!clinic.estado || clinic.id_doctor !== input.professionalId)) {
      this.conflict("clinicId", "Seleccione un consultorio activo asignado al profesional de la cita.");
    }
  }

  private async requireActiveProfessional(id: number): Promise<void> {
    const professional = await this.database.client.tb_medicos.findUnique({
      where: { id },
      include: { tb_especialidades: true },
    });
    if (!professional) this.notFound("El profesional seleccionado no existe.");
    if (!professional.estado || !professional.tb_especialidades.estado) {
      this.conflict("professionalId", "Seleccione un profesional activo.");
    }
  }

  private startOfDate(value: string): Date {
    return new Date(value.length === 10 ? `${value}T00:00:00.000Z` : value);
  }

  private endOfDate(value: string): Date {
    return new Date(value.length === 10 ? `${value}T23:59:59.999Z` : value);
  }

  private notFound(message: string): never {
    throw new AppException("RESOURCE_NOT_FOUND", message, HttpStatus.NOT_FOUND);
  }

  private conflict(field: string, message: string): never {
    throw new AppException("RESOURCE_CONFLICT", message, HttpStatus.CONFLICT, [{ field, message }]);
  }

  private toAppointment(row: {
    id_cita: number;
    fecha_hora: Date;
    motivo_cita: string;
    estado: string;
    fecha_creacion: Date;
    tb_pacientes: { id_paciente: number; nombres: string; apellidos: string };
    tb_medicos: { id: number; nombre: string; tb_especialidades: { nombre: string } };
    tb_clinicas: { id_clinica: number; numero_clinica: string; sala: string } | null;
    tb_consultas: { id_consulta: number } | null;
  }): AppointmentListItem {
    return {
      id: row.id_cita,
      scheduledAt: row.fecha_hora.toISOString(),
      reason: row.motivo_cita,
      status: row.estado as AppointmentListItem["status"],
      patient: { id: row.tb_pacientes.id_paciente, name: `${row.tb_pacientes.nombres} ${row.tb_pacientes.apellidos}` },
      professional: { id: row.tb_medicos.id, name: row.tb_medicos.nombre, specialty: row.tb_medicos.tb_especialidades.nombre },
      clinic: row.tb_clinicas ? { id: row.tb_clinicas.id_clinica, name: `${row.tb_clinicas.numero_clinica} · ${row.tb_clinicas.sala}` } : null,
      hasClinicalRecord: row.tb_consultas !== null,
      createdAt: row.fecha_creacion.toISOString(),
    };
  }

  private toClinic(row: {
    id_clinica: number;
    numero_clinica: string;
    sala: string;
    horario: string;
    estado: boolean;
    fecha_creacion: Date;
    tb_medicos: { id: number; nombre: string };
    _count: { tb_citas: number };
  }): ClinicListItem {
    return {
      id: row.id_clinica,
      number: row.numero_clinica,
      room: row.sala,
      schedule: row.horario,
      active: row.estado,
      professional: { id: row.tb_medicos.id, name: row.tb_medicos.nombre },
      appointmentCount: row._count.tb_citas,
      createdAt: row.fecha_creacion.toISOString(),
    };
  }
}
