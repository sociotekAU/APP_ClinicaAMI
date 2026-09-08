import { describe, expect, it } from "vitest";
import { classifyDatabaseError, validationDetail } from "./error-catalog";

describe("error catalog", () => {
  it("convierte duplicados en un conflicto seguro", () => {
    expect(classifyDatabaseError({ code: "P2002", meta: { target: "correo" } }))
      .toMatchObject({ code: "RESOURCE_CONFLICT", status: 409 });
  });

  it("no clasifica códigos desconocidos", () => {
    expect(classifyDatabaseError({ code: "P9999" })).toBeNull();
  });

  it("convierte restricciones de datos en validaciones seguras", () => {
    expect(classifyDatabaseError({ code: "P2004" }))
      .toMatchObject({ code: "VALIDATION_ERROR", status: 400 });
  });

  it("identifica el campo en mensajes de validación", () => {
    expect(validationDetail("page must not be less than 1")).toEqual({
      field: "page",
      message: "page must not be less than 1",
    });
  });
});
