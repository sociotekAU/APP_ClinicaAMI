import "reflect-metadata";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { describe, expect, it } from "vitest";
import { PrescriptionInputDto } from "./clinical-operations-input.dto";
import { ListProceduresDto } from "./list-clinical-operations.dto";

describe("clinical operations DTOs", () => {
  it("acepta ordenar procedimientos por profesional", async () => {
    const query = plainToInstance(ListProceduresDto, {
      page: "1",
      pageSize: "20",
      status: "all",
      sortBy: "professional",
      sortDirection: "asc",
    });
    expect(await validate(query)).toHaveLength(0);
    expect(query).toMatchObject({ page: 1, pageSize: 20, sortBy: "professional" });
  });

  it("rechaza medicamentos duplicados dentro de una receta", async () => {
    const input = plainToInstance(PrescriptionInputDto, {
      patientId: 1,
      professionalId: 2,
      diagnosis: "Indicación clínica",
      items: [
        { medicationId: 4, dose: "Una tableta", durationDays: 3 },
        { medicationId: 4, dose: "Otra tableta", durationDays: 5 },
      ],
    });
    expect((await validate(input)).map((error) => error.property)).toContain("items");
  });
});
