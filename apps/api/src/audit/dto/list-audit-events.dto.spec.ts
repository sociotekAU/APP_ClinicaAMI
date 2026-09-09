import "reflect-metadata";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { describe, expect, it } from "vitest";
import { ListAuditEventsDto } from "./list-audit-events.dto";

describe("ListAuditEventsDto", () => {
  it("transforma paginación y filtros válidos", async () => {
    const query = plainToInstance(ListAuditEventsDto, {
      page: "2",
      pageSize: "20",
      action: "anulacion",
      module: "recetas",
      userId: "4",
      dateFrom: "2026-01-01",
      dateTo: "2026-01-31",
      sortBy: "user",
      sortDirection: "asc",
    });

    expect(await validate(query)).toHaveLength(0);
    expect(query).toMatchObject({ page: 2, pageSize: 20, action: "anulacion", userId: 4 });
  });

  it("rechaza acciones, fechas y usuarios fuera del contrato", async () => {
    const query = plainToInstance(ListAuditEventsDto, {
      action: "borrar_todo",
      userId: "0",
      dateFrom: "ayer",
      sortBy: "password",
    });
    expect((await validate(query)).map((error) => error.property)).toEqual(
      expect.arrayContaining(["action", "userId", "dateFrom", "sortBy"]),
    );
  });
});
