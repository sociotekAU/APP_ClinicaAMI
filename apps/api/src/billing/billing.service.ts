import { HttpStatus, Injectable } from "@nestjs/common";
import type { AuthUser, BillingOptions, CashSummary, InvoiceDetail, InvoiceListItem, PaginatedData } from "@ami/contracts";
import { AppException } from "../common/errors/app.exception";
import { createPageMeta, paginationOffset } from "../common/pagination/pagination";
import { DatabaseService } from "../database/database.service";
import type { InvoiceInputDto } from "./dto/billing-input.dto";
import type { ListInvoicesDto } from "./dto/list-billing.dto";

const INVOICE_INCLUDE = {
  tb_pacientes: true,
  tb_usuarios: true,
  _count: { select: { tb_detalle_factura: true } },
};

interface CashTotalsRow {
  anuladas: bigint;
  pagadas: bigint;
  total_pagado: unknown;
}

interface CashMethodRow {
  cantidad: bigint;
  metodo_pago: string;
  total: unknown;
}

function optionalText(value: string | undefined): string | null {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

function todayInGuatemala(): string {
  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "America/Guatemala",
  }).format(new Date());
}

@Injectable()
export class BillingService {
  constructor(private readonly database: DatabaseService) {}

  async options(): Promise<BillingOptions> {
    const [patients, services] = await Promise.all([
      this.database.client.tb_pacientes.findMany({ orderBy: [{ apellidos: "asc" }, { nombres: "asc" }], take: 500 }),
      this.database.client.tb_servicios.findMany({ orderBy: { nombre: "asc" } }),
    ]);
    return {
      patients: patients.map((row) => ({ id: row.id_paciente, label: `${row.apellidos}, ${row.nombres}`, active: row.estado })),
      services: services.map((row) => ({ id: row.id, label: row.nombre, active: row.estado, price: Number(row.precio) })),
    };
  }

  async listInvoices(query: ListInvoicesDto): Promise<PaginatedData<InvoiceListItem>> {
    const search = query.search?.trim();
    const where = {
      ...(query.status === "all" ? {} : { estado: query.status }),
      ...(search ? { OR: [
        { observaciones: { contains: search, mode: "insensitive" as const } },
        { motivo_anulacion: { contains: search, mode: "insensitive" as const } },
        { tb_pacientes: { nombres: { contains: search, mode: "insensitive" as const } } },
        { tb_pacientes: { apellidos: { contains: search, mode: "insensitive" as const } } },
        { tb_usuarios: { nombre: { contains: search, mode: "insensitive" as const } } },
      ] } : {}),
    };
    const primaryOrder = query.sortBy === "patient"
      ? { tb_pacientes: { apellidos: query.sortDirection } }
      : query.sortBy === "total"
        ? { total: query.sortDirection }
        : { fecha_emision: query.sortDirection };
    const [rows, totalItems] = await Promise.all([
      this.database.client.tb_facturas.findMany({ where, include: INVOICE_INCLUDE, orderBy: [primaryOrder, { id_factura: "desc" }], skip: paginationOffset(query.page, query.pageSize), take: query.pageSize }),
      this.database.client.tb_facturas.count({ where }),
    ]);
    return { items: rows.map((row) => this.toInvoice(row)), pagination: createPageMeta(query.page, query.pageSize, totalItems) };
  }

  async invoiceDetail(id: number): Promise<InvoiceDetail> {
    const row = await this.database.client.tb_facturas.findUnique({
      where: { id_factura: id },
      include: { ...INVOICE_INCLUDE, tb_detalle_factura: { orderBy: { id_detalle: "asc" } } },
    });
    if (!row) this.notFound("La factura solicitada no existe.");
    return {
      ...this.toInvoice(row),
      lines: row.tb_detalle_factura.map((line) => ({
        id: line.id_detalle,
        concept: line.concepto,
        quantity: Number(line.cantidad),
        unitPrice: Number(line.precio_unitario),
        subtotal: Number(line.subtotal ?? 0),
      })),
    };
  }

  async createInvoice(input: InvoiceInputDto, user: AuthUser): Promise<InvoiceDetail> {
    const patient = await this.database.client.tb_pacientes.findUnique({ where: { id_paciente: input.patientId } });
    if (!patient) this.notFound("El paciente seleccionado no existe.");
    if (!patient.estado) this.conflict("patientId", "Seleccione un paciente activo.");
    const created = await this.database.client.$transaction(async (transaction) => {
      const invoice = await transaction.tb_facturas.create({ data: {
        id_paciente: input.patientId,
        id_usuario: user.id,
        metodo_pago: input.paymentMethod,
        observaciones: optionalText(input.observations),
      } });
      await transaction.tb_detalle_factura.createMany({ data: input.lines.map((line) => ({
        id_factura: invoice.id_factura,
        concepto: line.concept.trim(),
        cantidad: line.quantity,
        precio_unitario: line.unitPrice,
      })) });
      return invoice.id_factura;
    });
    return this.invoiceDetail(created);
  }

  async annulInvoice(id: number, reason: string): Promise<InvoiceDetail> {
    const current = await this.database.client.tb_facturas.findUnique({ where: { id_factura: id } });
    if (!current) this.notFound("La factura solicitada no existe.");
    if (current.estado === "anulada") this.conflict("reason", "La factura ya se encuentra anulada.");
    await this.database.client.tb_facturas.update({ where: { id_factura: id }, data: {
      estado: "anulada",
      fecha_anulacion: new Date(),
      motivo_anulacion: reason.trim(),
    } });
    return this.invoiceDetail(id);
  }

  async cashSummary(date?: string): Promise<CashSummary> {
    const selectedDate = date ?? todayInGuatemala();
    const [totals, methods] = await Promise.all([
      this.database.client.$queryRawUnsafe<CashTotalsRow[]>(`
        SELECT
          COUNT(*) FILTER (WHERE estado = 'pagada')::bigint AS pagadas,
          COUNT(*) FILTER (WHERE estado = 'anulada')::bigint AS anuladas,
          COALESCE(SUM(total) FILTER (WHERE estado = 'pagada'), 0)::numeric AS total_pagado
        FROM tb_facturas
        WHERE fecha_emision::date = $1::date
      `, selectedDate),
      this.database.client.$queryRawUnsafe<CashMethodRow[]>(`
        SELECT metodo_pago, COUNT(*)::bigint AS cantidad, COALESCE(SUM(total), 0)::numeric AS total
        FROM tb_facturas
        WHERE fecha_emision::date = $1::date AND estado = 'pagada'
        GROUP BY metodo_pago
        ORDER BY metodo_pago
      `, selectedDate),
    ]);
    return {
      date: selectedDate,
      paidInvoiceCount: Number(totals[0]?.pagadas ?? 0n),
      annulledInvoiceCount: Number(totals[0]?.anuladas ?? 0n),
      paidTotal: Number(totals[0]?.total_pagado ?? 0),
      byPaymentMethod: methods.map((row) => ({
        method: row.metodo_pago as CashSummary["byPaymentMethod"][number]["method"],
        invoiceCount: Number(row.cantidad),
        total: Number(row.total),
      })),
    };
  }

  private toInvoice(row: {
    id_factura: number; fecha_emision: Date; total: unknown; metodo_pago: string; estado: string;
    observaciones: string | null; fecha_anulacion: Date | null; motivo_anulacion: string | null;
    tb_pacientes: { id_paciente: number; nombres: string; apellidos: string };
    tb_usuarios: { id_usuario: number; nombre: string; username: string };
    _count: { tb_detalle_factura: number };
  }): InvoiceListItem {
    return {
      id: row.id_factura,
      issuedAt: row.fecha_emision.toISOString(),
      total: Number(row.total),
      paymentMethod: row.metodo_pago as InvoiceListItem["paymentMethod"],
      status: row.estado as InvoiceListItem["status"],
      observations: row.observaciones,
      annulledAt: row.fecha_anulacion?.toISOString() ?? null,
      annulmentReason: row.motivo_anulacion,
      patient: { id: row.tb_pacientes.id_paciente, name: `${row.tb_pacientes.nombres} ${row.tb_pacientes.apellidos}` },
      cashier: { id: row.tb_usuarios.id_usuario, name: row.tb_usuarios.nombre, username: row.tb_usuarios.username },
      lineCount: row._count.tb_detalle_factura,
    };
  }

  private notFound(message: string): never { throw new AppException("RESOURCE_NOT_FOUND", message, HttpStatus.NOT_FOUND); }
  private conflict(field: string, message: string): never { throw new AppException("RESOURCE_CONFLICT", message, HttpStatus.CONFLICT, [{ field, message }]); }
}
