import type { AuthUser } from "@ami/contracts";
import { describe, expect, it, vi } from "vitest";
import type { DatabaseService } from "../database/database.service";
import type { CareAccessService } from "./care-access.service";
import { AgendaService } from "./agenda.service";

const user: AuthUser = { id: 2, username: "doctor", name: "Doctor", role: { id: 2, name: "Médico" }, mustChangePassword: false };

describe("AgendaService", () => {
  it("aplica el alcance profesional a listados de citas", async () => {
    const findMany = vi.fn().mockResolvedValue([]);
    const database = { client: { tb_citas: { findMany, count: vi.fn().mockResolvedValue(0) } } } as unknown as DatabaseService;
    const access = { professionalScope: vi.fn().mockResolvedValue(7), ensureScopedProfessional: vi.fn() } as unknown as CareAccessService;
    const service = new AgendaService(database, access);
    await service.listAppointments({ page: 1, pageSize: 10, status: "all", sortBy: "scheduledAt", sortDirection: "asc" }, user);
    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ id_doctor: 7 }) }));
  });

  it("impide cambiar una cita con expediente a un estado incompatible", async () => {
    const update = vi.fn();
    const database = { client: { tb_citas: { findUnique: vi.fn().mockResolvedValue({ id_doctor: 7, estado: "completada", tb_consultas: { id_consulta: 4 } }), update } } } as unknown as DatabaseService;
    const access = { professionalScope: vi.fn().mockResolvedValue(7), ensureScopedProfessional: vi.fn() } as unknown as CareAccessService;
    const service = new AgendaService(database, access);
    await expect(service.setAppointmentStatus(1, { status: "cancelada" }, user)).rejects.toMatchObject({ code: "RESOURCE_CONFLICT" });
    expect(update).not.toHaveBeenCalled();
  });
});
