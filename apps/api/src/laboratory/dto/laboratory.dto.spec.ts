import "reflect-metadata";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { describe, expect, it } from "vitest";
import { LabOrderInputDto, LabOrderStatusInputDto } from "./laboratory-input.dto";
import { ListLabOrdersDto } from "./list-laboratory.dto";

describe("laboratory DTOs", () => {
  it("transforma la paginación y acepta los órdenes permitidos", async () => {
    const query = plainToInstance(ListLabOrdersDto, { page: "2", pageSize: "25", status: "procesando", sortBy: "professional", sortDirection: "asc" });
    expect(await validate(query)).toHaveLength(0);
    expect(query).toMatchObject({ page: 2, pageSize: 25, status: "procesando", sortBy: "professional" });
  });

  it("rechaza exámenes duplicados y reapertura de órdenes", async () => {
    const order = plainToInstance(LabOrderInputDto, { patientId: 1, testIds: [2, 2] });
    const status = plainToInstance(LabOrderStatusInputDto, { status: "pendiente" });
    expect((await validate(order)).map((error) => error.property)).toContain("testIds");
    expect((await validate(status)).map((error) => error.property)).toContain("status");
  });
});
