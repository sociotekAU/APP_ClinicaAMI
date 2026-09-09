import { HttpStatus, Injectable } from "@nestjs/common";
import type { AuthUser, LabOrderDetail, LabOrderListItem, LabOrderOptions, LabResultItem, LabTestListItem, PaginatedData } from "@ami/contracts";
import { CareAccessService } from "../care/care-access.service";
import { AppException } from "../common/errors/app.exception";
import { createPageMeta, paginationOffset } from "../common/pagination/pagination";
import { DatabaseService } from "../database/database.service";
import type { LabOrderInputDto, LabOrderStatusInputDto, LabResultInputDto, LabTestInputDto } from "./dto/laboratory-input.dto";
import type { ListLabOrdersDto, ListLabTestsDto } from "./dto/list-laboratory.dto";

const ORDER_INCLUDE = {
  tb_pacientes: true,
  tb_medicos: true,
  tb_resultados_laboratorio: { select: { valor_obtenido: true, fecha_resultado: true } },
};

function optionalText(value: string | undefined): string | null {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

@Injectable()
export class LaboratoryService {
  constructor(private readonly database: DatabaseService, private readonly access: CareAccessService) {}

  async options(user: AuthUser): Promise<LabOrderOptions> {
    const scope = await this.access.professionalScope(user);
    const [patients, professionals, tests] = await Promise.all([
      this.database.client.tb_pacientes.findMany({ orderBy: [{ apellidos: "asc" }, { nombres: "asc" }], take: 500 }),
      this.database.client.tb_medicos.findMany({ where: scope === null ? undefined : { id: scope }, include: { tb_especialidades: true }, orderBy: { nombre: "asc" } }),
      this.database.client.tb_catalogo_examenes.findMany({ orderBy: [{ categoria: "asc" }, { nombre: "asc" }] }),
    ]);
    return {
      patients: patients.map((row) => ({ id: row.id_paciente, label: `${row.apellidos}, ${row.nombres}`, active: row.estado })),
      professionals: professionals.map((row) => ({ id: row.id, label: `${row.nombre} · ${row.tb_especialidades.nombre}`, active: row.estado && row.tb_especialidades.estado })),
      tests: tests.map((row) => ({ id: row.id_examen, label: `${row.categoria} · ${row.nombre}`, active: row.estado })),
    };
  }

  async listTests(query: ListLabTestsDto): Promise<PaginatedData<LabTestListItem>> {
    const search = query.search?.trim();
    const where = {
      ...(query.status === "all" ? {} : { estado: query.status === "active" }),
      ...(search ? { OR: [
        { nombre: { contains: search, mode: "insensitive" as const } },
        { categoria: { contains: search, mode: "insensitive" as const } },
        { valores_referencia: { contains: search, mode: "insensitive" as const } },
      ] } : {}),
    };
    const primaryOrder = query.sortBy === "category" ? { categoria: query.sortDirection } : query.sortBy === "createdAt" ? { fecha_creacion: query.sortDirection } : { nombre: query.sortDirection };
    const [rows, totalItems] = await Promise.all([
      this.database.client.tb_catalogo_examenes.findMany({ where, include: { _count: { select: { tb_resultados_laboratorio: true } } }, orderBy: [primaryOrder, { id_examen: "asc" }], skip: paginationOffset(query.page, query.pageSize), take: query.pageSize }),
      this.database.client.tb_catalogo_examenes.count({ where }),
    ]);
    return { items: rows.map((row) => this.toTest(row)), pagination: createPageMeta(query.page, query.pageSize, totalItems) };
  }

  async createTest(input: LabTestInputDto): Promise<LabTestListItem> {
    const row = await this.database.client.tb_catalogo_examenes.create({ data: this.testData(input), include: { _count: { select: { tb_resultados_laboratorio: true } } } });
    return this.toTest(row);
  }

  async updateTest(id: number, input: LabTestInputDto): Promise<LabTestListItem> {
    const row = await this.database.client.tb_catalogo_examenes.update({ where: { id_examen: id }, data: this.testData(input), include: { _count: { select: { tb_resultados_laboratorio: true } } } });
    return this.toTest(row);
  }

  async setTestStatus(id: number, active: boolean): Promise<LabTestListItem> {
    const row = await this.database.client.tb_catalogo_examenes.update({ where: { id_examen: id }, data: { estado: active }, include: { _count: { select: { tb_resultados_laboratorio: true } } } });
    return this.toTest(row);
  }

  async listOrders(query: ListLabOrdersDto, user: AuthUser): Promise<PaginatedData<LabOrderListItem>> {
    const scope = await this.access.professionalScope(user);
    const search = query.search?.trim();
    const where = {
      ...(query.status === "all" ? {} : { estado: query.status }),
      ...(scope === null ? {} : { id_doctor: scope }),
      ...(search ? { OR: [
        { observaciones: { contains: search, mode: "insensitive" as const } },
        { tb_pacientes: { nombres: { contains: search, mode: "insensitive" as const } } },
        { tb_pacientes: { apellidos: { contains: search, mode: "insensitive" as const } } },
        { tb_medicos: { nombre: { contains: search, mode: "insensitive" as const } } },
      ] } : {}),
    };
    const primaryOrder = query.sortBy === "patient" ? { tb_pacientes: { apellidos: query.sortDirection } } : query.sortBy === "professional" ? { tb_medicos: { nombre: query.sortDirection } } : { fecha_orden: query.sortDirection };
    const [rows, totalItems] = await Promise.all([
      this.database.client.tb_ordenes_laboratorio.findMany({ where, include: ORDER_INCLUDE, orderBy: [primaryOrder, { id_orden: "desc" }], skip: paginationOffset(query.page, query.pageSize), take: query.pageSize }),
      this.database.client.tb_ordenes_laboratorio.count({ where }),
    ]);
    return { items: rows.map((row) => this.toOrder(row)), pagination: createPageMeta(query.page, query.pageSize, totalItems) };
  }

  async orderDetail(id: number, user: AuthUser): Promise<LabOrderDetail> {
    const scope = await this.access.professionalScope(user);
    const row = await this.database.client.tb_ordenes_laboratorio.findFirst({
      where: { id_orden: id, ...(scope === null ? {} : { id_doctor: scope }) },
      include: { tb_pacientes: true, tb_medicos: true, tb_resultados_laboratorio: { include: { tb_catalogo_examenes: true }, orderBy: { tb_catalogo_examenes: { nombre: "asc" } } } },
    });
    if (!row) this.notFound("La orden solicitada no existe o no está disponible para su cuenta.");
    return { ...this.toOrder(row), results: row.tb_resultados_laboratorio.map((result) => this.toResult(result)) };
  }

  async createOrder(input: LabOrderInputDto, user: AuthUser): Promise<LabOrderDetail> {
    const scope = await this.access.professionalScope(user);
    if (input.professionalId) this.access.ensureScopedProfessional(scope, input.professionalId);
    const [patient, professional, tests] = await Promise.all([
      this.database.client.tb_pacientes.findUnique({ where: { id_paciente: input.patientId } }),
      input.professionalId ? this.database.client.tb_medicos.findUnique({ where: { id: input.professionalId }, include: { tb_especialidades: true } }) : Promise.resolve(null),
      this.database.client.tb_catalogo_examenes.findMany({ where: { id_examen: { in: input.testIds }, estado: true } }),
    ]);
    if (!patient) this.notFound("El paciente seleccionado no existe.");
    if (!patient.estado) this.conflict("patientId", "Seleccione un paciente activo.");
    if (input.professionalId && !professional) this.notFound("El profesional seleccionado no existe.");
    if (professional && (!professional.estado || !professional.tb_especialidades.estado)) this.conflict("professionalId", "Seleccione un profesional activo.");
    if (tests.length !== input.testIds.length) this.conflict("testIds", "Todos los exámenes deben estar activos.");
    const row = await this.database.client.tb_ordenes_laboratorio.create({
      data: {
        id_paciente: input.patientId,
        id_doctor: input.professionalId ?? null,
        observaciones: optionalText(input.observations),
        tb_resultados_laboratorio: { create: input.testIds.map((id) => ({ id_examen: id })) },
      },
    });
    return this.orderDetail(row.id_orden, user);
  }

  async saveResult(orderId: number, resultId: number, input: LabResultInputDto, user: AuthUser): Promise<LabOrderDetail> {
    const scope = await this.access.professionalScope(user);
    const result = await this.database.client.tb_resultados_laboratorio.findUnique({ where: { id_resultado: resultId }, include: { tb_ordenes_laboratorio: true } });
    if (!result || result.id_orden !== orderId) this.notFound("El resultado no pertenece a la orden solicitada.");
    if (result.tb_ordenes_laboratorio.id_doctor) this.access.ensureScopedProfessional(scope, result.tb_ordenes_laboratorio.id_doctor);
    if (result.tb_ordenes_laboratorio.estado === "finalizado") this.conflict("value", "Los resultados de una orden finalizada son inmutables.");
    await this.database.client.$transaction([
      this.database.client.tb_resultados_laboratorio.update({ where: { id_resultado: resultId }, data: { valor_obtenido: input.value.trim(), observaciones: optionalText(input.observations), fecha_resultado: new Date() } }),
      ...(result.tb_ordenes_laboratorio.estado === "pendiente" ? [this.database.client.tb_ordenes_laboratorio.update({ where: { id_orden: orderId }, data: { estado: "procesando" } })] : []),
    ]);
    return this.orderDetail(orderId, user);
  }

  async setOrderStatus(id: number, input: LabOrderStatusInputDto, user: AuthUser): Promise<LabOrderDetail> {
    const scope = await this.access.professionalScope(user);
    const current = await this.database.client.tb_ordenes_laboratorio.findFirst({ where: { id_orden: id, ...(scope === null ? {} : { id_doctor: scope }) }, include: { tb_resultados_laboratorio: true } });
    if (!current) this.notFound("La orden solicitada no existe o no está disponible para su cuenta.");
    if (current.estado === "finalizado") this.conflict("status", "La orden finalizada ya no puede modificarse.");
    if (input.status === "finalizado" && (current.tb_resultados_laboratorio.length === 0 || current.tb_resultados_laboratorio.some((result) => !result.valor_obtenido?.trim() || !result.fecha_resultado))) {
      this.conflict("status", "Complete todos los resultados antes de finalizar la orden.");
    }
    await this.database.client.tb_ordenes_laboratorio.update({ where: { id_orden: id }, data: { estado: input.status } });
    return this.orderDetail(id, user);
  }

  private testData(input: LabTestInputDto) { return { nombre: input.name.trim(), categoria: input.category.trim(), valores_referencia: optionalText(input.referenceValues), unidad_medida: optionalText(input.unit) }; }
  private notFound(message: string): never { throw new AppException("RESOURCE_NOT_FOUND", message, HttpStatus.NOT_FOUND); }
  private conflict(field: string, message: string): never { throw new AppException("RESOURCE_CONFLICT", message, HttpStatus.CONFLICT, [{ field, message }]); }

  private toTest(row: { id_examen: number; nombre: string; categoria: string; valores_referencia: string | null; unidad_medida: string | null; estado: boolean; fecha_creacion: Date; _count: { tb_resultados_laboratorio: number } }): LabTestListItem {
    return { id: row.id_examen, name: row.nombre, category: row.categoria, referenceValues: row.valores_referencia, unit: row.unidad_medida, active: row.estado, orderCount: row._count.tb_resultados_laboratorio, createdAt: row.fecha_creacion.toISOString() };
  }

  private toOrder(row: { id_orden: number; fecha_orden: Date; estado: string; observaciones: string | null; fecha_finalizacion: Date | null; tb_pacientes: { id_paciente: number; nombres: string; apellidos: string }; tb_medicos: { id: number; nombre: string } | null; tb_resultados_laboratorio: Array<{ valor_obtenido: string | null; fecha_resultado: Date | null }> }): LabOrderListItem {
    return { id: row.id_orden, orderedAt: row.fecha_orden.toISOString(), status: row.estado as LabOrderListItem["status"], observations: row.observaciones, finalizedAt: row.fecha_finalizacion?.toISOString() ?? null, patient: { id: row.tb_pacientes.id_paciente, name: `${row.tb_pacientes.nombres} ${row.tb_pacientes.apellidos}` }, professional: row.tb_medicos ? { id: row.tb_medicos.id, name: row.tb_medicos.nombre } : null, resultCount: row.tb_resultados_laboratorio.length, completedResultCount: row.tb_resultados_laboratorio.filter((result) => Boolean(result.valor_obtenido?.trim() && result.fecha_resultado)).length };
  }

  private toResult(row: { id_resultado: number; valor_obtenido: string | null; observaciones: string | null; fecha_resultado: Date | null; tb_catalogo_examenes: { id_examen: number; nombre: string; categoria: string; valores_referencia: string | null; unidad_medida: string | null } }): LabResultItem {
    return { id: row.id_resultado, test: { id: row.tb_catalogo_examenes.id_examen, name: row.tb_catalogo_examenes.nombre, category: row.tb_catalogo_examenes.categoria, referenceValues: row.tb_catalogo_examenes.valores_referencia, unit: row.tb_catalogo_examenes.unidad_medida }, value: row.valor_obtenido, observations: row.observaciones, resultedAt: row.fecha_resultado?.toISOString() ?? null };
  }
}
