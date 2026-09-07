import { describe, expect, it, vi } from "vitest";
import type { DatabaseService } from "../database/database.service";
import { AuthorizationService } from "./authorization.service";

describe("AuthorizationService", () => {
  it("transforma únicamente módulos ERP conocidos", async () => {
    const client = {
      tb_permisos_rol: {
        findMany: vi.fn().mockResolvedValue([
          {
            id_rol: 3,
            modulo: "expediente_psicologia",
            puede_leer: true,
            puede_escribir: true,
            puede_borrar: false,
          },
          {
            id_rol: 3,
            modulo: "modulo_fuera_del_contrato",
            puede_leer: true,
            puede_escribir: true,
            puede_borrar: true,
          },
        ]),
      },
    };
    const service = new AuthorizationService({ client } as unknown as DatabaseService);

    await expect(service.getRolePermissions(3)).resolves.toEqual([
      {
        module: "expediente_psicologia",
        canRead: true,
        canWrite: true,
        canDelete: false,
      },
    ]);
  });

  it("consulta la clave compuesta y la acción exacta", async () => {
    const client = {
      tb_permisos_rol: {
        findUnique: vi.fn().mockResolvedValue({
          puede_leer: true,
          puede_escribir: false,
          puede_borrar: false,
        }),
      },
    };
    const service = new AuthorizationService({ client } as unknown as DatabaseService);

    await expect(service.hasPermission(2, "laboratorio", "read")).resolves.toBe(true);
    await expect(service.hasPermission(2, "laboratorio", "write")).resolves.toBe(false);
    expect(client.tb_permisos_rol.findUnique).toHaveBeenCalledWith({
      where: { id_rol_modulo: { id_rol: 2, modulo: "laboratorio" } },
    });
  });
});
