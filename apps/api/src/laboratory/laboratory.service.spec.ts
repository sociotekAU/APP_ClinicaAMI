import type { AuthUser } from "@ami/contracts";
import { describe, expect, it, vi } from "vitest";
import type { CareAccessService } from "../care/care-access.service";
import type { DatabaseService } from "../database/database.service";
import { LaboratoryService } from "./laboratory.service";

const user: AuthUser = {
  id: 1,
  username: "admin_ami",
  name: "Administrador",
  role: { id: 1, name: "Administrador" },
  mustChangePassword: false,
};

describe("LaboratoryService", () => {
  it("impide crear una orden con exámenes inactivos o inexistentes", async () => {
    const create = vi.fn();
    const database = { client: {
      tb_pacientes: { findUnique: vi.fn().mockResolvedValue({ estado: true }) },
      tb_medicos: { findUnique: vi.fn().mockResolvedValue({ estado: true, tb_especialidades: { estado: true } }) },
      tb_catalogo_examenes: { findMany: vi.fn().mockResolvedValue([{ id_examen: 3 }]) },
      tb_ordenes_laboratorio: { create },
    } } as unknown as DatabaseService;
    const access = { professionalScope: vi.fn().mockResolvedValue(null), ensureScopedProfessional: vi.fn() } as unknown as CareAccessService;
    const service = new LaboratoryService(database, access);

    await expect(service.createOrder({ patientId: 1, professionalId: 2, testIds: [3, 4] }, user)).rejects.toMatchObject({ code: "RESOURCE_CONFLICT" });
    expect(create).not.toHaveBeenCalled();
  });

  it("impide finalizar una orden mientras existan resultados pendientes", async () => {
    const update = vi.fn();
    const database = { client: { tb_ordenes_laboratorio: {
      findFirst: vi.fn().mockResolvedValue({ estado: "procesando", tb_resultados_laboratorio: [{ valor_obtenido: null, fecha_resultado: null }] }),
      update,
    } } } as unknown as DatabaseService;
    const access = { professionalScope: vi.fn().mockResolvedValue(null) } as unknown as CareAccessService;
    const service = new LaboratoryService(database, access);

    await expect(service.setOrderStatus(8, { status: "finalizado" }, user)).rejects.toMatchObject({ code: "RESOURCE_CONFLICT" });
    expect(update).not.toHaveBeenCalled();
  });

  it("bloquea cambios de resultados después de finalizar la orden", async () => {
    const update = vi.fn();
    const database = { client: {
      tb_resultados_laboratorio: { findUnique: vi.fn().mockResolvedValue({ id_orden: 8, tb_ordenes_laboratorio: { id_doctor: null, estado: "finalizado" } }), update },
      tb_ordenes_laboratorio: { update: vi.fn() },
    } } as unknown as DatabaseService;
    const access = { professionalScope: vi.fn().mockResolvedValue(null), ensureScopedProfessional: vi.fn() } as unknown as CareAccessService;
    const service = new LaboratoryService(database, access);

    await expect(service.saveResult(8, 12, { value: "92" }, user)).rejects.toMatchObject({ code: "RESOURCE_CONFLICT" });
    expect(update).not.toHaveBeenCalled();
  });
});
