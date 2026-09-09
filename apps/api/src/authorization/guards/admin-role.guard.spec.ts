import { describe, expect, it } from "vitest";
import { isAdministratorRole } from "./admin-role.guard";

describe("isAdministratorRole", () => {
  it("reconoce variantes administrativas sin confundir otros roles", () => {
    expect(isAdministratorRole("Administrador")).toBe(true);
    expect(isAdministratorRole("Superadministrador")).toBe(true);
    expect(isAdministratorRole("Admin")).toBe(true);
    expect(isAdministratorRole("Recepción")).toBe(false);
  });
});
