import { Injectable } from "@nestjs/common";
import type {
  AuditAction,
  AuditEventDetail,
  AuditEventListItem,
  AuditOptions,
  AuthUser,
  PaginatedData,
} from "@ami/contracts";
import type { Prisma } from "@ami/database";
import { createPageMeta, paginationOffset } from "../common/pagination/pagination";
import { DatabaseService } from "../database/database.service";
import type { ListAuditEventsDto } from "./dto/list-audit-events.dto";

const AUDIT_ACTIONS: AuditAction[] = [
  "creacion", "modificacion", "cambio_estado", "desactivacion",
  "reactivacion", "anulacion", "cancelacion", "finalizacion",
  "eliminacion", "cambio_password", "sistema",
];

const SECRET_KEY = /(password|password_hash|token|secret|cookie|authorization|pin|clave)/i;

interface AuditTarget {
  collection?: boolean;
  entity: string;
  module: string;
  primaryKey: string;
  table: string;
  paramName?: string;
}

interface PreparedAudit {
  before: Record<string, unknown> | null;
  recordId: string | null;
  target: AuditTarget;
}

export interface AuditHttpRequest {
  authUser?: AuthUser;
  body?: unknown;
  headers: Record<string, string | string[] | undefined>;
  id?: string;
  ip?: string;
  method: string;
  params?: unknown;
  url: string;
}

const TARGETS: Array<{ pattern: RegExp; target: AuditTarget }> = [
  { pattern: /^\/web-content\/contact(?:\/|$)/, target: { module: "contenido_web", entity: "contacto_web", table: "tb_contacto", primaryKey: "id", paramName: "id" } },
  { pattern: /^\/web-content\/services(?:\/|$)/, target: { module: "contenido_web", entity: "servicio_web", table: "tb_servicios", primaryKey: "id", paramName: "id" } },
  { pattern: /^\/web-content\/professionals(?:\/|$)/, target: { module: "contenido_web", entity: "profesional_web", table: "tb_medicos", primaryKey: "id", paramName: "id" } },
  { pattern: /^\/web-content\/gallery(?:\/|$)/, target: { module: "contenido_web", entity: "galeria_web", table: "tb_galeria", primaryKey: "id", paramName: "id" } },
  { pattern: /^\/web-content\/promotions(?:\/|$)/, target: { module: "contenido_web", entity: "promocion_web", table: "tb_promociones", primaryKey: "id", paramName: "id" } },
  { pattern: /^\/web-content\/styles(?:\/|$)/, target: { module: "contenido_web", entity: "estilo_anuncio", table: "tb_estilos", primaryKey: "id", paramName: "id" } },
  { pattern: /^\/web-content\/announcements(?:\/|$)/, target: { module: "contenido_web", entity: "anuncio_web", table: "tb_anuncios", primaryKey: "id", paramName: "id" } },
  { pattern: /^\/erp\/permissions\/roles\/\d+$/, target: { module: "seguridad", entity: "permisos_rol", table: "tb_permisos_rol", primaryKey: "id_rol", paramName: "roleId", collection: true } },
  { pattern: /^\/administration\/specialties(?:\/|$)/, target: { module: "seguridad", entity: "especialidad", table: "tb_especialidades", primaryKey: "id", paramName: "id" } },
  { pattern: /^\/administration\/services(?:\/|$)/, target: { module: "seguridad", entity: "servicio", table: "tb_servicios", primaryKey: "id", paramName: "id" } },
  { pattern: /^\/administration\/professionals(?:\/|$)/, target: { module: "seguridad", entity: "profesional", table: "tb_medicos", primaryKey: "id", paramName: "id" } },
  { pattern: /^\/administration\/users(?:\/|$)/, target: { module: "seguridad", entity: "usuario", table: "tb_usuarios", primaryKey: "id_usuario", paramName: "id" } },
  { pattern: /^\/patients(?:\/|$)/, target: { module: "pacientes", entity: "paciente", table: "tb_pacientes", primaryKey: "id_paciente", paramName: "id" } },
  { pattern: /^\/agenda\/appointments(?:\/|$)/, target: { module: "agenda", entity: "cita", table: "tb_citas", primaryKey: "id_cita", paramName: "id" } },
  { pattern: /^\/agenda\/clinics(?:\/|$)/, target: { module: "agenda", entity: "clinica", table: "tb_clinicas", primaryKey: "id_clinica", paramName: "id" } },
  { pattern: /^\/clinical-records\/psychology\/\d+\/vital-signs/, target: { module: "expediente_psicologia", entity: "signos_vitales", table: "tb_signos_vitales_medidas", primaryKey: "id_medicion", paramName: "measurementId" } },
  { pattern: /^\/clinical-records\/general\/\d+\/vital-signs/, target: { module: "expediente_general", entity: "signos_vitales", table: "tb_signos_vitales_medidas", primaryKey: "id_medicion", paramName: "measurementId" } },
  { pattern: /^\/clinical-records\/psychology(?:\/|$)/, target: { module: "expediente_psicologia", entity: "expediente_psicologico", table: "tb_consultas", primaryKey: "id_consulta", paramName: "id" } },
  { pattern: /^\/clinical-records\/general(?:\/|$)/, target: { module: "expediente_general", entity: "expediente_clinico", table: "tb_consultas", primaryKey: "id_consulta", paramName: "id" } },
  { pattern: /^\/medications(?:\/|$)/, target: { module: "recetas", entity: "medicamento", table: "tb_medicamentos", primaryKey: "id_medicamento", paramName: "id" } },
  { pattern: /^\/prescriptions(?:\/|$)/, target: { module: "recetas", entity: "receta", table: "tb_recetas", primaryKey: "id_receta", paramName: "id" } },
  { pattern: /^\/procedures(?:\/|$)/, target: { module: "recetas", entity: "procedimiento", table: "tb_consulta_servicios", primaryKey: "id_detalle", paramName: "id" } },
  { pattern: /^\/laboratory\/tests(?:\/|$)/, target: { module: "laboratorio", entity: "examen_laboratorio", table: "tb_catalogo_examenes", primaryKey: "id_examen", paramName: "id" } },
  { pattern: /^\/laboratory\/orders\/\d+\/results/, target: { module: "laboratorio", entity: "resultado_laboratorio", table: "tb_resultados_laboratorio", primaryKey: "id_resultado", paramName: "resultId" } },
  { pattern: /^\/laboratory\/orders(?:\/|$)/, target: { module: "laboratorio", entity: "orden_laboratorio", table: "tb_ordenes_laboratorio", primaryKey: "id_orden", paramName: "id" } },
  { pattern: /^\/billing\/invoices(?:\/|$)/, target: { module: "facturacion", entity: "factura", table: "tb_facturas", primaryKey: "id_factura", paramName: "id" } },
  { pattern: /^\/inventory\/suppliers(?:\/|$)/, target: { module: "inventario", entity: "proveedor", table: "tb_proveedores", primaryKey: "id_proveedor", paramName: "id" } },
  { pattern: /^\/inventory\/items(?:\/|$)/, target: { module: "inventario", entity: "insumo", table: "tb_insumos_inventario", primaryKey: "id_insumo", paramName: "id" } },
  { pattern: /^\/inventory\/movements(?:\/|$)/, target: { module: "inventario", entity: "movimiento_inventario", table: "tb_movimientos_inventario", primaryKey: "id_movimiento", paramName: "id" } },
  { pattern: /^\/auth\/change-password$/, target: { module: "seguridad", entity: "credencial_usuario", table: "tb_usuarios", primaryKey: "id_usuario" } },
];

function normalizedPath(url: string): string {
  return url.split("?", 1)[0]?.replace(/^\/api\/v1/, "") || "/";
}

function objectValue(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

export function sanitizeAuditValue(value: unknown): unknown {
  if (typeof value === "bigint") return value.toString();
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map((item) => sanitizeAuditValue(item));
  const object = objectValue(value);
  if (!object) return value;
  return Object.fromEntries(Object.entries(object).map(([key, child]) => [
    key,
    SECRET_KEY.test(key) ? "[REDACTADO]" : sanitizeAuditValue(child),
  ]));
}

function changedFields(before: Record<string, unknown> | null, after: Record<string, unknown> | null): string[] {
  if (!after) return [];
  if (!before) return Object.keys(after).sort();
  return [...new Set([...Object.keys(before), ...Object.keys(after)])]
    .filter((key) => JSON.stringify(before[key]) !== JSON.stringify(after[key]))
    .sort();
}

@Injectable()
export class AuditService {
  constructor(private readonly database: DatabaseService) {}

  shouldAudit(request: AuditHttpRequest): boolean {
    return request.method !== "GET"
      && request.method !== "HEAD"
      && request.method !== "OPTIONS"
      && Boolean(request.authUser)
      && !/^\/auth\/(login|refresh|logout)$/.test(normalizedPath(request.url));
  }

  async prepare(request: AuditHttpRequest): Promise<PreparedAudit | null> {
    const path = normalizedPath(request.url);
    const target = TARGETS.find((candidate) => candidate.pattern.test(path))?.target;
    if (!target) return null;
    const params = objectValue(request.params);
    const recordId = target.paramName ? this.stringId(params?.[target.paramName]) : this.stringId(request.authUser?.id);
    return { target, recordId, before: recordId ? await this.snapshot(target, recordId) : null };
  }

  async record(request: AuditHttpRequest, response: unknown, prepared: PreparedAudit | null): Promise<void> {
    if (!prepared || !request.authUser) return;
    const responseData = objectValue(response)?.data;
    const recordId = prepared.recordId ?? this.responseRecordId(responseData, prepared.target.entity);
    const databaseAfter = recordId ? await this.snapshot(prepared.target, recordId) : null;
    const after = databaseAfter ?? objectValue(sanitizeAuditValue(responseData));
    const action = this.action(request);
    const body = objectValue(request.body);
    const fields = action === "cambio_password" ? ["password"] : changedFields(prepared.before, after);
    const userAgent = request.headers["user-agent"];
    const route = normalizedPath(request.url);

    await this.database.client.tb_auditoria.create({
      data: {
        id_usuario: request.authUser.id,
        usuario: request.authUser.username,
        rol: request.authUser.role.name,
        modulo: prepared.target.module,
        entidad: prepared.target.entity,
        id_registro: recordId,
        accion: action,
        ...(prepared.before ? { datos_anteriores: prepared.before as Prisma.InputJsonValue } : {}),
        ...(after ? { datos_nuevos: after as Prisma.InputJsonValue } : {}),
        campos_modificados: fields,
        motivo: this.reason(body),
        request_id: request.id ? String(request.id).slice(0, 100) : null,
        direccion_ip: request.ip?.slice(0, 64) ?? null,
        agente_usuario: (Array.isArray(userAgent) ? userAgent.join("; ") : userAgent)?.slice(0, 500) ?? null,
        ruta: route.slice(0, 500),
        metodo: request.method.slice(0, 10),
        origen: "api",
      },
    });
  }

  async list(query: ListAuditEventsDto): Promise<PaginatedData<AuditEventListItem>> {
    const search = query.search?.trim();
    const dateTo = query.dateTo ? new Date(query.dateTo) : undefined;
    if (dateTo && /^\d{4}-\d{2}-\d{2}$/.test(query.dateTo ?? "")) dateTo.setUTCDate(dateTo.getUTCDate() + 1);
    const where = {
      ...(query.action ? { accion: query.action } : {}),
      ...(query.module ? { modulo: query.module } : {}),
      ...(query.entity ? { entidad: query.entity } : {}),
      ...(query.userId ? { id_usuario: query.userId } : {}),
      ...(query.dateFrom || dateTo ? { fecha_evento: { ...(query.dateFrom ? { gte: new Date(query.dateFrom) } : {}), ...(dateTo ? { lt: dateTo } : {}) } } : {}),
      ...(search ? { OR: [
        { usuario: { contains: search, mode: "insensitive" as const } },
        { rol: { contains: search, mode: "insensitive" as const } },
        { entidad: { contains: search, mode: "insensitive" as const } },
        { id_registro: { contains: search, mode: "insensitive" as const } },
        { motivo: { contains: search, mode: "insensitive" as const } },
        { request_id: { contains: search, mode: "insensitive" as const } },
      ] } : {}),
    };
    const primaryOrder = query.sortBy === "user"
      ? { usuario: query.sortDirection }
      : query.sortBy === "action"
        ? { accion: query.sortDirection }
        : { fecha_evento: query.sortDirection };
    const [rows, totalItems] = await Promise.all([
      this.database.client.tb_auditoria.findMany({ where, orderBy: [primaryOrder, { id_auditoria: "desc" }], skip: paginationOffset(query.page, query.pageSize), take: query.pageSize }),
      this.database.client.tb_auditoria.count({ where }),
    ]);
    return { items: rows.map((row) => this.toListItem(row)), pagination: createPageMeta(query.page, query.pageSize, totalItems) };
  }

  async detail(id: bigint): Promise<AuditEventDetail | null> {
    const row = await this.database.client.tb_auditoria.findUnique({ where: { id_auditoria: id } });
    if (!row) return null;
    return {
      ...this.toListItem(row),
      previousData: objectValue(row.datos_anteriores),
      newData: objectValue(row.datos_nuevos),
      userAgent: row.agente_usuario,
    };
  }

  async options(): Promise<AuditOptions> {
    const [modules, users] = await Promise.all([
      this.database.client.tb_auditoria.findMany({ distinct: ["modulo"], select: { modulo: true }, orderBy: { modulo: "asc" } }),
      this.database.client.tb_usuarios.findMany({ select: { id_usuario: true, username: true, nombre: true }, orderBy: { username: "asc" } }),
    ]);
    return {
      actions: AUDIT_ACTIONS,
      modules: modules.map((row) => row.modulo),
      users: users.map((row) => ({ id: row.id_usuario, label: `${row.username} · ${row.nombre}` })),
    };
  }

  private async snapshot(target: AuditTarget, recordId: string): Promise<Record<string, unknown> | null> {
    const numericId = Number(recordId);
    if (!Number.isSafeInteger(numericId) || numericId < 1) return null;
    const childCollection = target.entity === "receta"
      ? "jsonb_build_object('medicamentos', COALESCE((SELECT jsonb_agg(to_jsonb(detail_row) ORDER BY detail_row.id_detalle) FROM tb_detalle_receta detail_row WHERE detail_row.id_receta = source_row.id_receta), '[]'::jsonb))"
      : target.entity === "factura"
        ? "jsonb_build_object('conceptos', COALESCE((SELECT jsonb_agg(to_jsonb(detail_row) ORDER BY detail_row.id_detalle) FROM tb_detalle_factura detail_row WHERE detail_row.id_factura = source_row.id_factura), '[]'::jsonb))"
      : target.entity === "orden_laboratorio"
        ? "jsonb_build_object('resultados', COALESCE((SELECT jsonb_agg(to_jsonb(result_row) ORDER BY result_row.id_resultado) FROM tb_resultados_laboratorio result_row WHERE result_row.id_orden = source_row.id_orden), '[]'::jsonb))"
        : null;
    const expression = target.collection
      ? "jsonb_build_object('permissions', COALESCE(jsonb_agg(to_jsonb(source_row) ORDER BY source_row.modulo), '[]'::jsonb))"
      : childCollection
        ? `to_jsonb(source_row) || ${childCollection}`
        : "to_jsonb(source_row)";
    const rows = await this.database.client.$queryRawUnsafe<Array<{ snapshot: unknown }>>(
      `SELECT ${expression} AS snapshot FROM ${target.table} source_row WHERE ${target.primaryKey} = $1${target.collection ? "" : " LIMIT 1"}`,
      numericId,
    );
    return objectValue(sanitizeAuditValue(rows[0]?.snapshot));
  }

  private responseRecordId(responseData: unknown, entity: string): string | null {
    const data = objectValue(responseData);
    if (!data) return null;
    if (entity === "signos_vitales") return this.stringId(objectValue(data.latestVitalSigns)?.id);
    return this.stringId(data.id);
  }

  private stringId(value: unknown): string | null {
    if (typeof value === "number" && Number.isSafeInteger(value)) return String(value);
    if (typeof value === "bigint") return value.toString();
    if (typeof value === "string" && /^\d+$/.test(value)) return value;
    return null;
  }

  private action(request: AuditHttpRequest): AuditAction {
    const path = normalizedPath(request.url);
    const body = objectValue(request.body);
    if (path === "/auth/change-password") return "cambio_password";
    if (/\/annul$/.test(path)) return "anulacion";
    if (/\/status$/.test(path)) {
      if (body?.status === "cancelada") return "cancelacion";
      if (body?.status === "finalizado") return "finalizacion";
      if (body?.active === true) return "reactivacion";
      if (body?.active === false) return "desactivacion";
      return "cambio_estado";
    }
    if (request.method === "POST") return "creacion";
    if (request.method === "DELETE") return "eliminacion";
    return "modificacion";
  }

  private reason(body: Record<string, unknown> | null): string | null {
    const value = body?.reason ?? body?.motivo;
    return typeof value === "string" && value.trim() ? value.trim().slice(0, 10_000) : null;
  }

  private toListItem(row: {
    accion: string; agente_usuario: string | null; campos_modificados: string[];
    direccion_ip: string | null; entidad: string; fecha_evento: Date; id_auditoria: bigint;
    id_registro: string | null; id_usuario: number | null; metodo: string | null;
    modulo: string; motivo: string | null; origen: string; request_id: string | null;
    rol: string | null; ruta: string | null; usuario: string;
  }): AuditEventListItem {
    return {
      id: row.id_auditoria.toString(),
      occurredAt: row.fecha_evento.toISOString(),
      user: { id: row.id_usuario, username: row.usuario, role: row.rol },
      module: row.modulo,
      entity: row.entidad,
      recordId: row.id_registro,
      action: row.accion as AuditAction,
      changedFields: row.campos_modificados,
      reason: row.motivo,
      requestId: row.request_id,
      ipAddress: row.direccion_ip,
      route: row.ruta,
      method: row.metodo,
      origin: row.origen as AuditEventListItem["origin"],
    };
  }
}
