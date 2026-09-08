import { describe, expect, it } from "vitest";
import { buildListQuery, toFieldErrorMap } from "./crud-query";

describe("CRUD query helpers", () => {
  it("omite filtros vacíos y codifica la búsqueda", () => {
    expect(buildListQuery({ page: 2, search: "Médico general", module: "" }))
      .toBe("?page=2&search=M%C3%A9dico+general");
  });

  it("convierte detalles del API en errores de formulario", () => {
    expect(toFieldErrorMap([
      { field: "correo", message: "correo debe ser válido" },
      { message: "Error general" },
    ])).toEqual({ correo: "correo debe ser válido" });
  });
});
