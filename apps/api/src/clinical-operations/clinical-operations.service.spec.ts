import type { AuthUser } from "@ami/contracts";
import { describe, expect, it, vi } from "vitest";
import type { CareAccessService } from "../care/care-access.service";
import type { DatabaseService } from "../database/database.service";
import { ClinicalOperationsService } from "./clinical-operations.service";

const user: AuthUser = {
  id: 1,
  username: "admin_ami",
  name: "Administrador",
  role: { id: 1, name: "Administrador" },
  mustChangePassword: false,
};

describe("ClinicalOperationsService", () => {
  it("pagina procedimientos y permite ordenarlos por profesional", async () => {
    const findMany = vi.fn().mockResolvedValue([]);
    const database = { client: { tb_consulta_servicios: { findMany, count: vi.fn().mockResolvedValue(0) } } } as unknown as DatabaseService;
    const access = { professionalScope: vi.fn().mockResolvedValue(null) } as unknown as CareAccessService;
    const service = new ClinicalOperationsService(database, access);

    await service.listProcedures({ page: 2, pageSize: 10, status: "all", sortBy: "professional", sortDirection: "desc" }, user);

    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({
      orderBy: [
        { tb_consultas: { tb_citas: { tb_medicos: { nombre: "desc" } } } },
        { id_detalle: "desc" },
      ],
      skip: 10,
      take: 10,
    }));
  });

  it("crea la receta y sus medicamentos en una sola transacción", async () => {
    const createRecipe = vi.fn().mockResolvedValue({ id_receta: 9 });
    const createLines = vi.fn().mockResolvedValue({ count: 1 });
    const transaction = vi.fn(async (operation: (client: unknown) => Promise<unknown>) => operation({
      tb_recetas: { create: createRecipe },
      tb_detalle_receta: { createMany: createLines },
    }));
    const prescriptionRow = {
      id_receta: 9,
      fecha_emision: new Date("2026-09-09T14:00:00.000Z"),
      diagnostico: "Reposo e hidratación",
      estado: "emitida",
      fecha_anulacion: null,
      motivo_anulacion: null,
      tb_pacientes: { id_paciente: 1, nombres: "Ana", apellidos: "López" },
      tb_medicos: { id: 2, nombre: "Dra. Mónica", tb_especialidades: { nombre: "Psiquiatría" } },
      _count: { tb_detalle_receta: 1 },
      tb_detalle_receta: [{
        id_detalle: 12,
        dosis: "Una tableta cada 8 horas",
        duracion_dias: 3,
        tb_medicamentos: { id_medicamento: 4, nombre_comercial: "Prueba", concentracion: "10 mg" },
      }],
    };
    const database = { client: {
      $transaction: transaction,
      tb_pacientes: { findUnique: vi.fn().mockResolvedValue({ estado: true }) },
      tb_medicos: { findUnique: vi.fn().mockResolvedValue({ estado: true, tb_especialidades: { estado: true } }) },
      tb_medicamentos: { findMany: vi.fn().mockResolvedValue([{ id_medicamento: 4 }]) },
      tb_recetas: { findFirst: vi.fn().mockResolvedValue(prescriptionRow) },
    } } as unknown as DatabaseService;
    const access = { professionalScope: vi.fn().mockResolvedValue(null), ensureScopedProfessional: vi.fn() } as unknown as CareAccessService;
    const service = new ClinicalOperationsService(database, access);

    const result = await service.createPrescription({
      patientId: 1,
      professionalId: 2,
      diagnosis: " Reposo e hidratación ",
      items: [{ medicationId: 4, dose: " Una tableta cada 8 horas ", durationDays: 3 }],
    }, user);

    expect(createRecipe).toHaveBeenCalledWith({ data: { id_paciente: 1, id_doctor: 2, diagnostico: "Reposo e hidratación" } });
    expect(createLines).toHaveBeenCalledWith({ data: [{ id_receta: 9, id_medicamento: 4, dosis: "Una tableta cada 8 horas", duracion_dias: 3 }] });
    expect(result).toMatchObject({ id: 9, status: "emitida", itemCount: 1 });
  });

  it("impide anular dos veces una receta", async () => {
    const update = vi.fn();
    const database = { client: { tb_recetas: { findFirst: vi.fn().mockResolvedValue({ estado: "anulada" }), update } } } as unknown as DatabaseService;
    const access = { professionalScope: vi.fn().mockResolvedValue(null) } as unknown as CareAccessService;
    const service = new ClinicalOperationsService(database, access);

    await expect(service.annulPrescription(5, "Duplicada por captura", user)).rejects.toMatchObject({ code: "RESOURCE_CONFLICT" });
    expect(update).not.toHaveBeenCalled();
  });

  it("exige reactivar un procedimiento antes de editarlo", async () => {
    const update = vi.fn();
    const database = { client: { tb_consulta_servicios: {
      findUnique: vi.fn().mockResolvedValue({ estado: false, tb_consultas: { tb_citas: { id_doctor: 2 } } }),
      update,
    } } } as unknown as DatabaseService;
    const access = { professionalScope: vi.fn().mockResolvedValue(null), ensureScopedProfessional: vi.fn() } as unknown as CareAccessService;
    const service = new ClinicalOperationsService(database, access);

    await expect(service.updateProcedure(6, { clinicalRecordId: 1, serviceId: 2 }, user)).rejects.toMatchObject({ code: "RESOURCE_CONFLICT" });
    expect(update).not.toHaveBeenCalled();
  });
});
