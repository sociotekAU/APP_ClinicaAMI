import type { ExecutionContext } from "@nestjs/common";
import type { Reflector } from "@nestjs/core";
import { describe, expect, it, vi } from "vitest";
import type { AuthService } from "../auth.service";
import { AccessTokenGuard } from "./access-token.guard";

function createContext(cookies: Record<string, string> = {}) {
  const request = { cookies };
  const context = {
    switchToHttp: () => ({ getRequest: () => request }),
    getHandler: () => createContext,
    getClass: () => AccessTokenGuard,
  } as unknown as ExecutionContext;
  return { context, request };
}

describe("AccessTokenGuard", () => {
  it("rechaza solicitudes sin cookie de acceso", async () => {
    const authService = { authenticateAccessToken: vi.fn() } as unknown as AuthService;
    const reflector = { getAllAndOverride: vi.fn() } as unknown as Reflector;
    const guard = new AccessTokenGuard(authService, reflector);

    await expect(guard.canActivate(createContext().context)).rejects.toMatchObject({
      code: "AUTH_REQUIRED",
    });
  });

  it("bloquea otros módulos mientras exista una contraseña temporal", async () => {
    const authService = {
      authenticateAccessToken: vi.fn().mockResolvedValue({ mustChangePassword: true }),
    } as unknown as AuthService;
    const reflector = {
      getAllAndOverride: vi.fn().mockReturnValue(false),
    } as unknown as Reflector;
    const guard = new AccessTokenGuard(authService, reflector);

    await expect(guard.canActivate(createContext({ ami_access: "token" }).context))
      .rejects.toMatchObject({ code: "AUTH_PASSWORD_CHANGE_REQUIRED" });
  });

  it("permite el endpoint explícito para cambiar la contraseña", async () => {
    const authService = {
      authenticateAccessToken: vi.fn().mockResolvedValue({ mustChangePassword: true }),
    } as unknown as AuthService;
    const reflector = {
      getAllAndOverride: vi.fn().mockReturnValue(true),
    } as unknown as Reflector;
    const guard = new AccessTokenGuard(authService, reflector);
    const { context, request } = createContext({ ami_access: "token" });

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(request).toHaveProperty("authUser.mustChangePassword", true);
  });
});
