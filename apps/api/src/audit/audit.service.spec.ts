import type { AuthUser } from "@ami/contracts";
import { describe, expect, it, vi } from "vitest";
import type { DatabaseService } from "../database/database.service";
import { AuditService, sanitizeAuditValue, type AuditHttpRequest } from "./audit.service";

const user: AuthUser = {
  id: 7,
  username: "admin.pruebas",
  name: "Administración",
  role: { id: 1, name: "Administrador" },
  mustChangePassword: false,
};

function request(overrides: Partial<AuditHttpRequest> = {}): AuditHttpRequest {
  return {
    authUser: user,
    body: { active: true },
    headers: { "user-agent": "vitest" },
    id: "req-audit-1",
    ip: "127.0.0.1",
    method: "PATCH",
    params: { id: "3" },
    url: "/api/v1/patients/3/status",
    ...overrides,
  };
}

describe("AuditService", () => {
  it("elimina credenciales y secretos de snapshots anidados", () => {
    expect(sanitizeAuditValue({
      username: "demo",
      password: "visible-no",
      nested: { refreshToken: "visible-no", ruta_documento: "consents/secreto.pdf", note: "conservar" },
    })).toEqual({
      username: "demo",
      password: "[REDACTADO]",
      nested: { refreshToken: "[REDACTADO]", ruta_documento: "[REDACTADO]", note: "conservar" },
    });
  });

  it("registra una reactivación con actor, fecha implícita y comparación", async () => {
    const snapshot = vi.fn()
      .mockResolvedValueOnce([{ snapshot: { id_paciente: 3, estado: false, password_hash: "no-exponer" } }])
      .mockResolvedValueOnce([{ snapshot: { id_paciente: 3, estado: true, password_hash: "no-exponer" } }]);
    const create = vi.fn().mockResolvedValue({});
    const service = new AuditService({ client: { $queryRawUnsafe: snapshot, tb_auditoria: { create } } } as unknown as DatabaseService);
    const mutation = request();
    const prepared = await service.prepare(mutation);
    await service.record(mutation, { data: { id: 3, active: true } }, prepared);

    expect(create).toHaveBeenCalledWith({ data: expect.objectContaining({
      accion: "reactivacion",
      id_usuario: 7,
      usuario: "admin.pruebas",
      modulo: "pacientes",
      entidad: "paciente",
      id_registro: "3",
      campos_modificados: ["estado"],
      datos_anteriores: expect.objectContaining({ password_hash: "[REDACTADO]" }),
      datos_nuevos: expect.objectContaining({ password_hash: "[REDACTADO]" }),
    }) });
  });

  it("clasifica cancelaciones y conserva el motivo de una anulación", async () => {
    const snapshot = vi.fn().mockResolvedValue([{ snapshot: { id_receta: 5, estado: "emitida" } }]);
    const create = vi.fn().mockResolvedValue({});
    const service = new AuditService({ client: { $queryRawUnsafe: snapshot, tb_auditoria: { create } } } as unknown as DatabaseService);

    const cancelRequest = request({ url: "/api/v1/agenda/appointments/3/status", body: { status: "cancelada" } });
    await service.record(cancelRequest, { data: { id: 3, status: "cancelada" } }, await service.prepare(cancelRequest));
    expect(create.mock.calls[0]?.[0]?.data.accion).toBe("cancelacion");

    const annulRequest = request({ url: "/api/v1/prescriptions/5/annul", params: { id: "5" }, body: { reason: "Duplicada por error de captura" } });
    await service.record(annulRequest, { data: { id: 5, status: "anulada" } }, await service.prepare(annulRequest));
    expect(create.mock.calls[1]?.[0]?.data).toMatchObject({ accion: "anulacion", motivo: "Duplicada por error de captura" });
  });

  it("pagina eventos sin exponer el bigint del motor", async () => {
    const row = {
      id_auditoria: 12n,
      fecha_evento: new Date("2026-09-08T12:00:00.000Z"),
      id_usuario: 7,
      usuario: "admin.pruebas",
      rol: "Administrador",
      modulo: "seguridad",
      entidad: "usuario",
      id_registro: "9",
      accion: "modificacion",
      datos_anteriores: null,
      datos_nuevos: null,
      campos_modificados: ["nombre"],
      motivo: null,
      request_id: "req-12",
      direccion_ip: "127.0.0.1",
      agente_usuario: "vitest",
      ruta: "/administration/users/9",
      metodo: "PATCH",
      origen: "api",
    };
    const findMany = vi.fn().mockResolvedValue([row]);
    const service = new AuditService({ client: { tb_auditoria: { findMany, count: vi.fn().mockResolvedValue(21) } } } as unknown as DatabaseService);
    const result = await service.list({ page: 2, pageSize: 10, sortBy: "occurredAt", sortDirection: "desc" });

    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({ skip: 10, take: 10 }));
    expect(result.pagination).toEqual({ page: 2, pageSize: 10, totalItems: 21, totalPages: 3 });
    expect(result.items[0]).toMatchObject({ id: "12", action: "modificacion", user: { username: "admin.pruebas" } });
  });

  it("omite lecturas y autenticación sin actor", () => {
    const service = new AuditService({} as DatabaseService);
    expect(service.shouldAudit(request({ method: "GET" }))).toBe(false);
    expect(service.shouldAudit(request({ authUser: undefined, method: "POST", url: "/api/v1/auth/login" }))).toBe(false);
  });

  it("incluye los cambios del contenido web en la trazabilidad", async () => {
    const snapshot = vi.fn().mockResolvedValue([{ snapshot: { id: 4, estado: false } }]);
    const service = new AuditService({ client: { $queryRawUnsafe: snapshot } } as unknown as DatabaseService);
    const prepared = await service.prepare(request({ url: "/api/v1/web-content/gallery/4/status", params: { id: "4" } }));
    expect(prepared).toMatchObject({ recordId: "4", target: { module: "contenido_web", entity: "galeria_web", table: "tb_galeria" } });
  });

  it("incluye medicamentos y resultados en los snapshots clínicos compuestos", async () => {
    const snapshot = vi.fn().mockResolvedValue([{ snapshot: { id: 5 } }]);
    const service = new AuditService({ client: { $queryRawUnsafe: snapshot } } as unknown as DatabaseService);

    await service.prepare(request({ url: "/api/v1/prescriptions/5/annul", params: { id: "5" } }));
    await service.prepare(request({ url: "/api/v1/laboratory/orders/8/status", params: { id: "8" } }));

    expect(snapshot.mock.calls[0]?.[0]).toContain("tb_detalle_receta");
    expect(snapshot.mock.calls[0]?.[0]).toContain("medicamentos");
    expect(snapshot.mock.calls[1]?.[0]).toContain("tb_resultados_laboratorio");
    expect(snapshot.mock.calls[1]?.[0]).toContain("resultados");
  });

  it("incluye conceptos de factura y movimientos de inventario en auditoría", async () => {
    const snapshot = vi.fn().mockResolvedValue([{ snapshot: { id: 9 } }]);
    const service = new AuditService({ client: { $queryRawUnsafe: snapshot } } as unknown as DatabaseService);

    const invoice = await service.prepare(request({ url: "/api/v1/billing/invoices/9/annul", params: { id: "9" } }));
    const movement = await service.prepare(request({ url: "/api/v1/inventory/movements", method: "POST", params: {} }));

    expect(invoice).toMatchObject({ target: { module: "facturacion", entity: "factura", table: "tb_facturas" } });
    expect(snapshot.mock.calls[0]?.[0]).toContain("tb_detalle_factura");
    expect(snapshot.mock.calls[0]?.[0]).toContain("conceptos");
    expect(movement).toMatchObject({ target: { module: "inventario", entity: "movimiento_inventario", table: "tb_movimientos_inventario" } });
  });

  it("incluye archivos privados y decisiones de consentimiento en la trazabilidad", async () => {
    const snapshot = vi.fn().mockResolvedValue([{ snapshot: { id: 14 } }]);
    const service = new AuditService({ client: { $queryRawUnsafe: snapshot } } as unknown as DatabaseService);

    const study = await service.prepare(request({ url: "/api/v1/study-files/14/status", params: { id: "14" } }));
    const consent = request({ url: "/api/v1/consents/6/status", params: { id: "6" }, body: { status: "revocado", reason: "Solicitud expresa del paciente" } });
    const preparedConsent = await service.prepare(consent);
    const create = vi.fn().mockResolvedValue({});
    (service as unknown as { database: { client: { tb_auditoria: { create: typeof create } } } }).database.client.tb_auditoria = { create };
    await service.record(consent, { data: { id: 6, status: "revocado" } }, preparedConsent);

    expect(study).toMatchObject({ target: { module: "archivos_estudios", entity: "archivo_estudio", table: "tb_archivos_estudios" } });
    expect(preparedConsent).toMatchObject({ target: { module: "consentimientos", entity: "consentimiento_informado", table: "tb_consentimientos_informados" } });
    expect(create).toHaveBeenCalledWith({ data: expect.objectContaining({ accion: "anulacion", motivo: "Solicitud expresa del paciente" }) });
  });
});
