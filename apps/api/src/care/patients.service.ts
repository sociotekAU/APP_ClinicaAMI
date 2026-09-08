import { HttpStatus, Injectable } from "@nestjs/common";
import type { PaginatedData, PatientListItem } from "@ami/contracts";
import { AppException } from "../common/errors/app.exception";
import { createPageMeta, paginationOffset } from "../common/pagination/pagination";
import { DatabaseService } from "../database/database.service";
import type { PatientInputDto } from "./dto/care-input.dto";
import type { ListPatientsDto } from "./dto/list-care.dto";

function optionalText(value: string | undefined): string | null {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

@Injectable()
export class PatientsService {
  constructor(private readonly database: DatabaseService) {}

  async list(query: ListPatientsDto): Promise<PaginatedData<PatientListItem>> {
    const search = query.search?.trim();
    const where = {
      ...(query.status === "all" ? {} : { estado: query.status === "active" }),
      ...(search ? {
        OR: [
          { nombres: { contains: search, mode: "insensitive" as const } },
          { apellidos: { contains: search, mode: "insensitive" as const } },
          { telefono: { contains: search, mode: "insensitive" as const } },
          { email: { contains: search, mode: "insensitive" as const } },
        ],
      } : {}),
    };
    const primaryOrder = query.sortBy === "birthDate"
      ? { fecha_nacimiento: query.sortDirection }
      : query.sortBy === "createdAt"
        ? { fecha_creacion: query.sortDirection }
        : { apellidos: query.sortDirection };
    const [rows, totalItems] = await Promise.all([
      this.database.client.tb_pacientes.findMany({
        where,
        include: { _count: { select: { tb_citas: true } } },
        orderBy: [primaryOrder, { nombres: "asc" }, { id_paciente: "asc" }],
        skip: paginationOffset(query.page, query.pageSize),
        take: query.pageSize,
      }),
      this.database.client.tb_pacientes.count({ where }),
    ]);
    return {
      items: rows.map((row) => this.toItem(row)),
      pagination: createPageMeta(query.page, query.pageSize, totalItems),
    };
  }

  async create(input: PatientInputDto): Promise<PatientListItem> {
    this.validateBirthDate(input.birthDate);
    const row = await this.database.client.tb_pacientes.create({
      data: this.data(input),
      include: { _count: { select: { tb_citas: true } } },
    });
    return this.toItem(row);
  }

  async update(id: number, input: PatientInputDto): Promise<PatientListItem> {
    this.validateBirthDate(input.birthDate);
    const row = await this.database.client.tb_pacientes.update({
      where: { id_paciente: id },
      data: this.data(input),
      include: { _count: { select: { tb_citas: true } } },
    });
    return this.toItem(row);
  }

  async setStatus(id: number, active: boolean): Promise<PatientListItem> {
    const row = await this.database.client.tb_pacientes.update({
      where: { id_paciente: id },
      data: { estado: active },
      include: { _count: { select: { tb_citas: true } } },
    });
    return this.toItem(row);
  }

  private data(input: PatientInputDto) {
    return {
      nombres: input.firstNames.trim(),
      apellidos: input.lastNames.trim(),
      fecha_nacimiento: new Date(`${input.birthDate.slice(0, 10)}T00:00:00.000Z`),
      genero: optionalText(input.gender),
      telefono: input.phone.trim(),
      email: optionalText(input.email)?.toLowerCase() ?? null,
      tipo_sangre: optionalText(input.bloodType),
      antecedentes_personales: optionalText(input.personalHistory),
    };
  }

  private validateBirthDate(value: string): void {
    const birthDate = new Date(value);
    if (birthDate > new Date()) {
      throw new AppException(
        "VALIDATION_ERROR",
        "La fecha de nacimiento no puede estar en el futuro.",
        HttpStatus.BAD_REQUEST,
        [{ field: "birthDate", message: "Seleccione una fecha igual o anterior a hoy." }],
      );
    }
  }

  private toItem(row: {
    id_paciente: number;
    nombres: string;
    apellidos: string;
    fecha_nacimiento: Date;
    genero: string | null;
    telefono: string;
    email: string | null;
    tipo_sangre: string | null;
    antecedentes_personales: string | null;
    estado: boolean;
    fecha_creacion: Date;
    _count: { tb_citas: number };
  }): PatientListItem {
    return {
      id: row.id_paciente,
      firstNames: row.nombres,
      lastNames: row.apellidos,
      fullName: `${row.nombres} ${row.apellidos}`,
      birthDate: row.fecha_nacimiento.toISOString().slice(0, 10),
      gender: row.genero,
      phone: row.telefono,
      email: row.email,
      bloodType: row.tipo_sangre,
      personalHistory: row.antecedentes_personales,
      active: row.estado,
      appointmentCount: row._count.tb_citas,
      createdAt: row.fecha_creacion.toISOString(),
    };
  }
}
