import "reflect-metadata";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { describe, expect, it } from "vitest";
import { ListProfessionalsDto, ListUsersDto } from "./list-resources.dto";
import { ProfessionalInputDto, ServiceInputDto, SpecialtyInputDto, UserCreateInputDto } from "./resource-input.dto";

describe("administration DTOs", () => {
  it("transforma paginación y filtros numéricos", async () => {
    const query = plainToInstance(ListProfessionalsDto, {
      page: "2",
      pageSize: "20",
      specialtyId: "7",
      status: "active",
      sortBy: "specialty",
    });
    expect(await validate(query)).toHaveLength(0);
    expect(query).toMatchObject({ page: 2, pageSize: 20, specialtyId: 7, status: "active" });
  });

  it("rechaza filtros y ordenamientos fuera del contrato", async () => {
    const query = plainToInstance(ListUsersDto, { status: "deleted", roleId: "0", sortBy: "password" });
    const errors = await validate(query);
    expect(errors.map((error) => error.property)).toEqual(expect.arrayContaining([
      "status",
      "roleId",
      "sortBy",
    ]));
  });

  it("valida reglas clínicas y comerciales", async () => {
    const professional = plainToInstance(ProfessionalInputDto, {
      name: "A",
      dpi: "123",
      specialtyId: 0,
    });
    const service = plainToInstance(ServiceInputDto, {
      name: "Consulta",
      price: "-1",
      imageUrl: "javascript:alert(1)",
    });
    expect((await validate(professional)).map((error) => error.property)).toEqual(expect.arrayContaining([
      "name",
      "dpi",
      "specialtyId",
    ]));
    expect((await validate(service)).map((error) => error.property)).toEqual(expect.arrayContaining([
      "price",
      "imageUrl",
    ]));
  });

  it("exige una contraseña temporal robusta", async () => {
    const user = plainToInstance(UserCreateInputDto, {
      username: "nuevo.usuario",
      name: "Nuevo Usuario",
      roleId: 1,
      temporaryPassword: "debil",
    });
    expect((await validate(user)).map((error) => error.property)).toContain("temporaryPassword");
  });

  it("valida la elegibilidad psicológica como un valor booleano", async () => {
    const specialty = plainToInstance(SpecialtyInputDto, {
      name: "Neuropsicología clínica",
      psychologicalRecordEligible: "sí",
    });
    expect((await validate(specialty)).map((error) => error.property)).toContain(
      "psychologicalRecordEligible",
    );
  });
});
