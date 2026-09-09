import "reflect-metadata";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { describe, expect, it } from "vitest";
import { ListPermissionsDto } from "./list-permissions.dto";

describe("ListPermissionsDto", () => {
  it("transforma la paginación y conserva valores predeterminados seguros", async () => {
    const query = plainToInstance(ListPermissionsDto, { page: "2", pageSize: "20" });
    expect(await validate(query)).toHaveLength(0);
    expect(query).toMatchObject({
      page: 2,
      pageSize: 20,
      sortBy: "role",
      sortDirection: "asc",
    });
  });

  it("rechaza tamaños y módulos fuera del contrato", async () => {
    const query = plainToInstance(ListPermissionsDto, {
      pageSize: "500",
      module: "expediente_sin_control",
    });
    const errors = await validate(query);
    expect(errors.map((error) => error.property)).toEqual(expect.arrayContaining([
      "pageSize",
      "module",
    ]));
  });

  it("acepta el filtro de permisos sin escritura y rechaza valores desconocidos", async () => {
    const valid = plainToInstance(ListPermissionsDto, { writeAccess: "without" });
    expect(await validate(valid)).toHaveLength(0);

    const invalid = plainToInstance(ListPermissionsDto, { writeAccess: "none" });
    expect((await validate(invalid)).map((error) => error.property)).toContain("writeAccess");
  });

  it("acepta filtros por rol y capacidades ausentes", async () => {
    const valid = plainToInstance(ListPermissionsDto, {
      roleId: "3",
      capability: "delete",
      capabilityAccess: "without",
    });
    expect(await validate(valid)).toHaveLength(0);
    expect(valid.roleId).toBe(3);
  });
});
