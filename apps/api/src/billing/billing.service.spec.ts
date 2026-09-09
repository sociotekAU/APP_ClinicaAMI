import type { AuthUser } from "@ami/contracts";
import { describe, expect, it, vi } from "vitest";
import type { DatabaseService } from "../database/database.service";
import { BillingService } from "./billing.service";

const user: AuthUser = { id: 1, username: "admin_ami", name: "Administrador", role: { id: 1, name: "Administrador" }, mustChangePassword: false };

const invoiceRow = {
  id_factura: 12,
  fecha_emision: new Date("2026-09-09T15:00:00.000Z"),
  total: 25,
  metodo_pago: "efectivo",
  estado: "pagada",
  observaciones: null,
  fecha_anulacion: null,
  motivo_anulacion: null,
  tb_pacientes: { id_paciente: 3, nombres: "Ana", apellidos: "López" },
  tb_usuarios: { id_usuario: 1, nombre: "Administrador", username: "admin_ami" },
  _count: { tb_detalle_factura: 2 },
  tb_detalle_factura: [
    { id_detalle: 1, concepto: "Consulta", cantidad: 2, precio_unitario: 10, subtotal: 20 },
    { id_detalle: 2, concepto: "Material", cantidad: 1, precio_unitario: 5, subtotal: 5 },
  ],
};

describe("BillingService", () => {
  it("crea cabecera y detalles en una transacción y devuelve el total calculado", async () => {
    const invoiceCreate = vi.fn().mockResolvedValue({ id_factura: 12 });
    const detailCreateMany = vi.fn().mockResolvedValue({ count: 2 });
    const transaction = vi.fn(async (callback: (client: unknown) => Promise<number>) => callback({ tb_facturas: { create: invoiceCreate }, tb_detalle_factura: { createMany: detailCreateMany } }));
    const database = { client: {
      tb_pacientes: { findUnique: vi.fn().mockResolvedValue({ estado: true }) },
      tb_facturas: { findUnique: vi.fn().mockResolvedValue(invoiceRow) },
      $transaction: transaction,
    } } as unknown as DatabaseService;
    const service = new BillingService(database);

    const result = await service.createInvoice({ patientId: 3, paymentMethod: "efectivo", lines: [{ concept: "Consulta", quantity: 2, unitPrice: 10 }, { concept: "Material", quantity: 1, unitPrice: 5 }] }, user);

    expect(transaction).toHaveBeenCalledOnce();
    expect(detailCreateMany).toHaveBeenCalledWith({ data: expect.arrayContaining([expect.objectContaining({ id_factura: 12, concepto: "Consulta" })]) });
    expect(result).toMatchObject({ id: 12, total: 25, lineCount: 2 });
  });

  it("impide anular dos veces el mismo comprobante", async () => {
    const update = vi.fn();
    const database = { client: { tb_facturas: { findUnique: vi.fn().mockResolvedValue({ estado: "anulada" }), update } } } as unknown as DatabaseService;
    const service = new BillingService(database);
    await expect(service.annulInvoice(12, "Error de captura" )).rejects.toMatchObject({ code: "RESOURCE_CONFLICT" });
    expect(update).not.toHaveBeenCalled();
  });

  it("separa facturas pagadas, anuladas y formas de pago en caja", async () => {
    const query = vi.fn().mockResolvedValueOnce([{ pagadas: 2n, anuladas: 1n, total_pagado: 125 }]).mockResolvedValueOnce([{ metodo_pago: "tarjeta", cantidad: 2n, total: 125 }]);
    const service = new BillingService({ client: { $queryRawUnsafe: query } } as unknown as DatabaseService);
    await expect(service.cashSummary("2026-09-09")).resolves.toEqual({ date: "2026-09-09", paidInvoiceCount: 2, annulledInvoiceCount: 1, paidTotal: 125, byPaymentMethod: [{ method: "tarjeta", invoiceCount: 2, total: 125 }] });
  });
});
