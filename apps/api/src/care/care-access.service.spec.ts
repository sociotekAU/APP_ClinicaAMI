import type { AuthUser } from "@ami/contracts";
import { describe, expect, it, vi } from "vitest";
import type { DatabaseService } from "../database/database.service";
import { CareAccessService } from "./care-access.service";

const medicalUser: AuthUser = { id: 7, username: "medico", name: "Médico", role: { id: 2, name: "Médico" }, mustChangePassword: false };

describe("CareAccessService", () => {
  it("limita una cuenta clínica al profesional vinculado", async () => {
    const service = new CareAccessService({ client: { tb_usuarios: { findUnique: vi.fn().mockResolvedValue({ id_doctor: 12 }) } } } as unknown as DatabaseService);
    await expect(service.professionalScope(medicalUser)).resolves.toBe(12);
    expect(() => service.ensureScopedProfessional(12, 99)).toThrowError(expect.objectContaining({ code: "AUTH_FORBIDDEN" }));
  });

  it("bloquea una cuenta médica sin vínculo profesional", async () => {
    const service = new CareAccessService({ client: { tb_usuarios: { findUnique: vi.fn().mockResolvedValue({ id_doctor: null }) } } } as unknown as DatabaseService);
    await expect(service.professionalScope(medicalUser)).rejects.toMatchObject({ code: "AUTH_FORBIDDEN" });
  });
});
