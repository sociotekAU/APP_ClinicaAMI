import type { AuthUser, RolePermission } from "@ami/contracts";
import { describe, expect, it, vi } from "vitest";
import type { AuthorizationService } from "../authorization/authorization.service";
import type { DatabaseService } from "../database/database.service";
import { ErpService } from "./erp.service";

const psychologist: AuthUser = {
  id: 8,
  username: "psicologia",
  name: "Profesional de Psicología",
  role: { id: 3, name: "Psicólogo" },
  mustChangePassword: false,
};

describe("ErpService", () => {
  it("omite el expediente general para psicología y conserva el psicológico", async () => {
    const permissions: RolePermission[] = [
      { module: "pacientes", canRead: true, canWrite: false, canDelete: false },
      { module: "agenda", canRead: true, canWrite: true, canDelete: false },
      { module: "expediente_psicologia", canRead: true, canWrite: true, canDelete: false },
    ];
    const authorization = {
      getRolePermissions: vi.fn().mockResolvedValue(permissions),
    } as unknown as AuthorizationService;
    const client = {
      tb_pacientes: { count: vi.fn().mockResolvedValue(1) },
      tb_medicos: { count: vi.fn().mockResolvedValue(10) },
      $queryRaw: vi.fn().mockResolvedValue([{ total: 0n }]),
    };
    const service = new ErpService(
      { client } as unknown as DatabaseService,
      authorization,
    );

    const context = await service.getContext(psychologist);
    const modules = context.navigation.map((item) => item.module);

    expect(modules).toContain("expediente_psicologia");
    expect(modules).not.toContain("expediente_general");
    expect(context.metrics.map((metric) => metric.code)).toEqual([
      "active_patients",
      "today_appointments",
      "active_professionals",
    ]);
  });
});
