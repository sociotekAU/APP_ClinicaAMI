import { HttpStatus, Injectable } from "@nestjs/common";
import type {
  AuthUser,
  ClinicalRecordDetail,
  ClinicalRecordListItem,
  ClinicalRecordOptions,
  ClinicalRecordType,
  ErpModuleCode,
  PaginatedData,
  PermissionAction,
  VitalSignsItem,
} from "@ami/contracts";
import { AuthorizationService } from "../authorization/authorization.service";
import { AppException } from "../common/errors/app.exception";
import { createPageMeta, paginationOffset } from "../common/pagination/pagination";
import { DatabaseService } from "../database/database.service";
import { CareAccessService } from "./care-access.service";
import type { ClinicalRecordInputDto, VitalSignsInputDto } from "./dto/care-input.dto";
import type { ListClinicalRecordsDto } from "./dto/list-care.dto";

const RECORD_LIST_INCLUDE = {
  tb_citas: {
    include: {
      tb_pacientes: true,
      tb_medicos: { include: { tb_especialidades: true } },
    },
  },
  tb_signos_vitales_medidas: { orderBy: [{ fecha_medicion: "desc" as const }, { id_medicion: "desc" as const }], take: 1 },
  _count: { select: { tb_signos_vitales_medidas: true } },
};

export function normalizeHeightCm(value: number | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  return value <= 3 ? Math.round(value * 10_000) / 100 : value;
}

@Injectable()
export class ClinicalRecordsService {
  constructor(
    private readonly database: DatabaseService,
    private readonly authorization: AuthorizationService,
    private readonly access: CareAccessService,
  ) {}

  async options(rawType: string, user: AuthUser): Promise<ClinicalRecordOptions> {
    const type = await this.ensureAccess(rawType, user, "read");
    const scope = await this.access.professionalScope(user);
    const rows = await this.database.client.tb_citas.findMany({
      where: {
        ...(scope === null ? {} : { id_doctor: scope }),
        estado: { in: ["programada", "completada"] },
        tb_consultas: { is: null },
        tb_medicos: {
          tb_especialidades: {
            admite_expediente_psicologico: type === "psychology",
          },
        },
      },
      include: {
        tb_pacientes: true,
        tb_medicos: { include: { tb_especialidades: true } },
      },
      orderBy: [{ fecha_hora: "desc" }, { id_cita: "desc" }],
      take: 500,
    });
    return {
      appointments: rows.map((row) => ({
          id: row.id_cita,
          label: `${row.tb_pacientes.apellidos}, ${row.tb_pacientes.nombres} · ${row.fecha_hora.toLocaleString("es-GT")}`,
          patientId: row.id_paciente,
          professionalId: row.id_doctor,
          scheduledAt: row.fecha_hora.toISOString(),
          patient: {
            id: row.id_paciente,
            name: `${row.tb_pacientes.nombres} ${row.tb_pacientes.apellidos}`,
          },
          professional: {
            id: row.id_doctor,
            name: row.tb_medicos.nombre,
            specialty: row.tb_medicos.tb_especialidades.nombre,
          },
        })),
    };
  }

  async list(rawType: string, query: ListClinicalRecordsDto, user: AuthUser): Promise<PaginatedData<ClinicalRecordListItem>> {
    const type = await this.ensureAccess(rawType, user, "read");
    const scope = await this.access.professionalScope(user);
    const search = query.search?.trim();
    const where = {
      tipo_expediente: this.databaseType(type),
      ...(scope === null ? {} : { tb_citas: { id_doctor: scope } }),
      ...(query.patientId ? { tb_citas: { ...(scope === null ? {} : { id_doctor: scope }), id_paciente: query.patientId } } : {}),
      ...(search ? {
        OR: [
          { motivo_consulta: { contains: search, mode: "insensitive" as const } },
          { diagnostico_cie10: { contains: search, mode: "insensitive" as const } },
          { tb_citas: { tb_pacientes: { nombres: { contains: search, mode: "insensitive" as const } } } },
          { tb_citas: { tb_pacientes: { apellidos: { contains: search, mode: "insensitive" as const } } } },
          { tb_citas: { tb_medicos: { nombre: { contains: search, mode: "insensitive" as const } } } },
        ],
      } : {}),
    };
    const primaryOrder = query.sortBy === "patient"
      ? { tb_citas: { tb_pacientes: { apellidos: query.sortDirection } } }
      : query.sortBy === "professional"
        ? { tb_citas: { tb_medicos: { nombre: query.sortDirection } } }
        : { fecha_registro: query.sortDirection };
    const [rows, totalItems] = await Promise.all([
      this.database.client.tb_consultas.findMany({
        where,
        include: RECORD_LIST_INCLUDE,
        orderBy: [primaryOrder, { id_consulta: "desc" }],
        skip: paginationOffset(query.page, query.pageSize),
        take: query.pageSize,
      }),
      this.database.client.tb_consultas.count({ where }),
    ]);
    return {
      items: rows.map((row) => this.toListItem(row, type)),
      pagination: createPageMeta(query.page, query.pageSize, totalItems),
    };
  }

  async detail(rawType: string, id: number, user: AuthUser): Promise<ClinicalRecordDetail> {
    const type = await this.ensureAccess(rawType, user, "read");
    const row = await this.requireScopedRecord(id, type, user, true);
    return this.toDetail(row, type);
  }

  async create(rawType: string, input: ClinicalRecordInputDto, user: AuthUser): Promise<ClinicalRecordDetail> {
    const type = await this.ensureAccess(rawType, user, "write");
    const scope = await this.access.professionalScope(user);
    const appointment = await this.database.client.tb_citas.findUnique({
      where: { id_cita: input.appointmentId },
      include: {
        tb_consultas: { select: { id_consulta: true } },
        tb_medicos: { include: { tb_especialidades: true } },
      },
    });
    if (!appointment) this.notFound("La cita seleccionada no existe.");
    this.access.ensureScopedProfessional(scope, appointment.id_doctor);
    if (appointment.tb_consultas) this.conflict("appointmentId", "La cita seleccionada ya tiene un expediente.");
    if (appointment.estado === "cancelada" || appointment.estado === "no_asistio") {
      this.conflict("appointmentId", "No se puede abrir un expediente para una cita cancelada o marcada como inasistencia.");
    }
    if (this.professionalRecordType(appointment.tb_medicos.tb_especialidades.admite_expediente_psicologico) !== type) {
      this.conflict("appointmentId", "La especialidad de la cita no corresponde al tipo de expediente.");
    }

    const created = await this.database.client.$transaction(async (transaction) => {
      const record = await transaction.tb_consultas.create({
        data: {
          id_cita: input.appointmentId,
          tipo_expediente: this.databaseType(type),
          motivo_consulta: input.consultationReason.trim(),
          notas_evolucion: this.optionalText(input.evolutionNotes),
          diagnostico_cie10: this.optionalText(input.diagnosisCie10)?.toUpperCase() ?? null,
        },
      });
      await transaction.tb_citas.update({
        where: { id_cita: input.appointmentId },
        data: { estado: "completada" },
      });
      return record;
    });
    return this.detail(rawType, created.id_consulta, user);
  }

  async update(rawType: string, id: number, input: ClinicalRecordInputDto, user: AuthUser): Promise<ClinicalRecordDetail> {
    const type = await this.ensureAccess(rawType, user, "write");
    const current = await this.requireScopedRecord(id, type, user, false);
    if (input.appointmentId !== current.id_cita) {
      this.conflict("appointmentId", "La cita de un expediente existente no puede sustituirse.");
    }
    await this.database.client.tb_consultas.update({
      where: { id_consulta: id },
      data: {
        motivo_consulta: input.consultationReason.trim(),
        notas_evolucion: this.optionalText(input.evolutionNotes),
        diagnostico_cie10: this.optionalText(input.diagnosisCie10)?.toUpperCase() ?? null,
      },
    });
    return this.detail(rawType, id, user);
  }

  async addVitalSigns(rawType: string, id: number, input: VitalSignsInputDto, user: AuthUser): Promise<ClinicalRecordDetail> {
    const type = await this.ensureAccess(rawType, user, "write");
    await this.requireScopedRecord(id, type, user, false);
    this.validateVitalSigns(input);
    await this.database.client.tb_signos_vitales_medidas.create({
      data: { id_consulta: id, ...this.vitalData(input) },
    });
    return this.detail(rawType, id, user);
  }

  async updateVitalSigns(rawType: string, id: number, measurementId: number, input: VitalSignsInputDto, user: AuthUser): Promise<ClinicalRecordDetail> {
    const type = await this.ensureAccess(rawType, user, "write");
    await this.requireScopedRecord(id, type, user, false);
    this.validateVitalSigns(input);
    const measurement = await this.database.client.tb_signos_vitales_medidas.findUnique({ where: { id_medicion: measurementId } });
    if (!measurement || measurement.id_consulta !== id) this.notFound("La medición solicitada no pertenece a este expediente.");
    await this.database.client.tb_signos_vitales_medidas.update({
      where: { id_medicion: measurementId },
      data: this.vitalData(input),
    });
    return this.detail(rawType, id, user);
  }

  private async ensureAccess(rawType: string, user: AuthUser, action: PermissionAction): Promise<ClinicalRecordType> {
    const type = this.parseType(rawType);
    const module: ErpModuleCode = type === "general" ? "expediente_general" : "expediente_psicologia";
    if (!(await this.authorization.hasPermission(user.role.id, module, action))) {
      throw new AppException("AUTH_FORBIDDEN", "Su rol no tiene permiso para este expediente.", HttpStatus.FORBIDDEN);
    }
    return type;
  }

  private parseType(value: string): ClinicalRecordType {
    if (value === "general" || value === "psychology") return value;
    this.notFound("El tipo de expediente solicitado no existe.");
  }

  private databaseType(type: ClinicalRecordType): string {
    return type === "general" ? "general" : "psicologia";
  }

  private professionalRecordType(psychologicalRecordEligible: boolean): ClinicalRecordType {
    return psychologicalRecordEligible ? "psychology" : "general";
  }

  private async requireScopedRecord(id: number, type: ClinicalRecordType, user: AuthUser, withVitals: boolean) {
    const scope = await this.access.professionalScope(user);
    const row = await this.database.client.tb_consultas.findFirst({
      where: {
        id_consulta: id,
        tipo_expediente: this.databaseType(type),
        ...(scope === null ? {} : { tb_citas: { id_doctor: scope } }),
      },
      include: {
        tb_citas: {
          include: {
            tb_pacientes: true,
            tb_medicos: { include: { tb_especialidades: true } },
          },
        },
        tb_signos_vitales_medidas: {
          orderBy: [{ fecha_medicion: "desc" }, { id_medicion: "desc" }],
          ...(withVitals ? {} : { take: 1 }),
        },
        _count: { select: { tb_signos_vitales_medidas: true } },
      },
    });
    if (!row) this.notFound("El expediente solicitado no existe o no está disponible para su cuenta.");
    return row;
  }

  private optionalText(value: string | undefined): string | null {
    const normalized = value?.trim();
    return normalized ? normalized : null;
  }

  private validateVitalSigns(input: VitalSignsInputDto): void {
    if (![input.weightKg, input.heightCm, input.bloodPressure, input.heartRate, input.temperature].some((value) => value !== undefined && value !== null && value !== "")) {
      throw new AppException(
        "VALIDATION_ERROR",
        "Registre al menos un signo vital.",
        HttpStatus.BAD_REQUEST,
        [{ field: "weightKg", message: "Ingrese al menos una medición." }],
      );
    }
    if (input.heightCm !== undefined && input.heightCm !== null && input.heightCm > 3 && input.heightCm < 50) {
      throw new AppException(
        "VALIDATION_ERROR",
        "La estatura debe escribirse en metros (por ejemplo, 1.70) o centímetros (por ejemplo, 170).",
        HttpStatus.BAD_REQUEST,
        [{ field: "heightCm", message: "Use un valor entre 0.50 y 3.00 m, o entre 50 y 300 cm." }],
      );
    }
  }

  private vitalData(input: VitalSignsInputDto) {
    return {
      peso_kg: input.weightKg ?? null,
      estatura_cm: normalizeHeightCm(input.heightCm),
      presion_arterial: this.optionalText(input.bloodPressure),
      frecuencia_cardiaca: input.heartRate ?? null,
      temperatura: input.temperature ?? null,
    };
  }

  private notFound(message: string): never {
    throw new AppException("RESOURCE_NOT_FOUND", message, HttpStatus.NOT_FOUND);
  }

  private conflict(field: string, message: string): never {
    throw new AppException("RESOURCE_CONFLICT", message, HttpStatus.CONFLICT, [{ field, message }]);
  }

  private toListItem(row: {
    id_consulta: number;
    id_cita: number;
    motivo_consulta: string;
    notas_evolucion: string | null;
    diagnostico_cie10: string | null;
    fecha_registro: Date;
    tb_citas: {
      fecha_hora: Date;
      tb_pacientes: { id_paciente: number; nombres: string; apellidos: string; antecedentes_personales: string | null };
      tb_medicos: { id: number; nombre: string; tb_especialidades: { nombre: string } };
    };
    tb_signos_vitales_medidas: Array<{
      id_medicion: number;
      peso_kg: { toString(): string } | null;
      estatura_cm: { toString(): string } | null;
      presion_arterial: string | null;
      frecuencia_cardiaca: number | null;
      temperatura: { toString(): string } | null;
      imc: { toString(): string } | null;
      fecha_medicion: Date;
    }>;
    _count: { tb_signos_vitales_medidas: number };
  }, type: ClinicalRecordType): ClinicalRecordListItem {
    return {
      id: row.id_consulta,
      type,
      appointmentId: row.id_cita,
      appointmentAt: row.tb_citas.fecha_hora.toISOString(),
      consultationReason: row.motivo_consulta,
      evolutionNotes: row.notas_evolucion,
      diagnosisCie10: row.diagnostico_cie10,
      recordedAt: row.fecha_registro.toISOString(),
      patient: { id: row.tb_citas.tb_pacientes.id_paciente, name: `${row.tb_citas.tb_pacientes.nombres} ${row.tb_citas.tb_pacientes.apellidos}` },
      professional: { id: row.tb_citas.tb_medicos.id, name: row.tb_citas.tb_medicos.nombre, specialty: row.tb_citas.tb_medicos.tb_especialidades.nombre },
      measurementCount: row._count.tb_signos_vitales_medidas,
      latestVitalSigns: row.tb_signos_vitales_medidas[0] ? this.toVital(row.tb_signos_vitales_medidas[0]) : null,
    };
  }

  private toDetail(row: Parameters<ClinicalRecordsService["toListItem"]>[0], type: ClinicalRecordType): ClinicalRecordDetail {
    return {
      ...this.toListItem(row, type),
      personalHistory: row.tb_citas.tb_pacientes.antecedentes_personales,
      vitalSigns: row.tb_signos_vitales_medidas.map((measurement) => this.toVital(measurement)),
    };
  }

  private toVital(row: Parameters<ClinicalRecordsService["toListItem"]>[0]["tb_signos_vitales_medidas"][number]): VitalSignsItem {
    return {
      id: row.id_medicion,
      weightKg: row.peso_kg === null ? null : Number(row.peso_kg.toString()),
      heightCm: row.estatura_cm === null ? null : Number(row.estatura_cm.toString()),
      bloodPressure: row.presion_arterial,
      heartRate: row.frecuencia_cardiaca,
      temperature: row.temperatura === null ? null : Number(row.temperatura.toString()),
      bmi: row.imc === null ? null : Number(row.imc.toString()),
      measuredAt: row.fecha_medicion.toISOString(),
    };
  }
}
