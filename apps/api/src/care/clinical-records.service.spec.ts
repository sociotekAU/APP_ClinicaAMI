import type { AuthUser } from "@ami/contracts";
import { describe, expect, it, vi } from "vitest";
import type { AuthorizationService } from "../authorization/authorization.service";
import type { DatabaseService } from "../database/database.service";
import type { CareAccessService } from "./care-access.service";
import { ClinicalRecordsService } from "./clinical-records.service";

const psychologist: AuthUser = { id: 8, username: "psicologia", name: "Psicóloga", role: { id: 3, name: "Psicólogo" }, mustChangePassword: false };

describe("ClinicalRecordsService", () => {
  it("filtra expedientes psicológicos por tipo explícito y profesional", async () => {
    const findMany = vi.fn().mockResolvedValue([]);
    const service = new ClinicalRecordsService(
      { client: { tb_consultas: { findMany, count: vi.fn().mockResolvedValue(0) } } } as unknown as DatabaseService,
      { hasPermission: vi.fn().mockResolvedValue(true) } as unknown as AuthorizationService,
      { professionalScope: vi.fn().mockResolvedValue(9) } as unknown as CareAccessService,
    );
    await service.list("psychology", { page: 1, pageSize: 10, sortBy: "recordedAt", sortDirection: "desc" }, psychologist);
    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ tipo_expediente: "psicologia", tb_citas: { id_doctor: 9 } }) }));
  });

  it("no permite abrir un expediente general con una cita de psicología", async () => {
    const transaction = vi.fn();
    const service = new ClinicalRecordsService(
      { client: { tb_citas: { findUnique: vi.fn().mockResolvedValue({ id_doctor: 9, estado: "programada", tb_consultas: null, tb_medicos: { tb_especialidades: { nombre: "Psicología" } } }) }, $transaction: transaction } } as unknown as DatabaseService,
      { hasPermission: vi.fn().mockResolvedValue(true) } as unknown as AuthorizationService,
      { professionalScope: vi.fn().mockResolvedValue(9), ensureScopedProfessional: vi.fn() } as unknown as CareAccessService,
    );
    await expect(service.create("general", { appointmentId: 4, consultationReason: "Control" }, psychologist)).rejects.toMatchObject({ code: "RESOURCE_CONFLICT" });
    expect(transaction).not.toHaveBeenCalled();
  });
});
