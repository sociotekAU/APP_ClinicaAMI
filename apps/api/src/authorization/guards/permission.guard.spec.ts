import type { ExecutionContext } from "@nestjs/common";
import type { Reflector } from "@nestjs/core";
import { describe, expect, it, vi } from "vitest";
import type { AuthorizationService } from "../authorization.service";
import { PermissionGuard } from "./permission.guard";

function createContext(hasUser = true) {
  const request = hasUser
    ? { authUser: { role: { id: 3 } } }
    : {};
  return {
    context: {
      switchToHttp: () => ({ getRequest: () => request }),
      getHandler: () => createContext,
      getClass: () => PermissionGuard,
    } as unknown as ExecutionContext,
  };
}

describe("PermissionGuard", () => {
  it("permite una acción concedida por la base de datos", async () => {
    const authorization = {
      hasPermission: vi.fn().mockResolvedValue(true),
    } as unknown as AuthorizationService;
    const reflector = {
      getAllAndOverride: vi.fn().mockReturnValue([
        { module: "expediente_psicologia", action: "read" },
      ]),
    } as unknown as Reflector;
    const guard = new PermissionGuard(authorization, reflector);

    await expect(guard.canActivate(createContext().context)).resolves.toBe(true);
    expect(authorization.hasPermission).toHaveBeenCalledWith(
      3,
      "expediente_psicologia",
      "read",
    );
  });

  it("rechaza con código estable una acción no concedida", async () => {
    const authorization = {
      hasPermission: vi.fn().mockResolvedValue(false),
    } as unknown as AuthorizationService;
    const reflector = {
      getAllAndOverride: vi.fn().mockReturnValue([
        { module: "expediente_general", action: "read" },
      ]),
    } as unknown as Reflector;
    const guard = new PermissionGuard(authorization, reflector);

    await expect(guard.canActivate(createContext().context)).rejects.toMatchObject({
      code: "AUTH_FORBIDDEN",
      status: 403,
    });
  });

  it("rechaza defensivamente una solicitud sin identidad autenticada", async () => {
    const authorization = { hasPermission: vi.fn() } as unknown as AuthorizationService;
    const reflector = {
      getAllAndOverride: vi.fn().mockReturnValue([
        { module: "pacientes", action: "read" },
      ]),
    } as unknown as Reflector;
    const guard = new PermissionGuard(authorization, reflector);

    await expect(guard.canActivate(createContext(false).context)).rejects.toMatchObject({
      code: "AUTH_REQUIRED",
      status: 401,
    });
  });
});
