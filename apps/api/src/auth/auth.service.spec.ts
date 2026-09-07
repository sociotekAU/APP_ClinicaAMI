import { JwtService } from "@nestjs/jwt";
import { compare, hashSync } from "bcryptjs";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { DatabaseService } from "../database/database.service";
import type { AuthConfigService } from "./auth-config.service";
import { AuthService } from "./auth.service";

const password = "Temporal#123";

const activeUser = {
  id_usuario: 1,
  username: "admin_ami",
  nombre: "Administrador A.M.I.",
  password_hash: hashSync(password, 4),
  id_rol: 1,
  estado: true,
  debe_cambiar_password: true,
  tb_roles: {
    id_rol: 1,
    nombre_rol: "Administrador",
    estado: true,
  },
};

const authConfig = {
  accessSecret: "access-secret-for-tests-with-more-than-32-characters",
  refreshSecret: "refresh-secret-for-tests-with-more-than-32-characters",
  issuer: "ami-api-test",
  audience: "ami-admin-test",
  secureCookies: false,
} as AuthConfigService;

describe("AuthService", () => {
  let client: {
    tb_usuarios: {
      findFirst: ReturnType<typeof vi.fn>;
      findUnique: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
    };
  };
  let service: AuthService;

  beforeEach(() => {
    client = {
      tb_usuarios: {
        findFirst: vi.fn(),
        findUnique: vi.fn(),
        update: vi.fn(),
      },
    };
    const database = { client } as unknown as DatabaseService;
    service = new AuthService(database, new JwtService(), authConfig);
  });

  it("inicia una sesión y nunca expone el hash de la contraseña", async () => {
    client.tb_usuarios.findFirst.mockResolvedValue(activeUser);
    client.tb_usuarios.update.mockResolvedValue(activeUser);

    const result = await service.login(" ADMIN_AMI ", password);

    expect(client.tb_usuarios.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: { username: { equals: "admin_ami", mode: "insensitive" } },
    }));
    expect(result.user).toEqual({
      id: 1,
      username: "admin_ami",
      name: "Administrador A.M.I.",
      role: { id: 1, name: "Administrador" },
      mustChangePassword: true,
    });
    expect(result.user).not.toHaveProperty("password_hash");
    expect(result.accessToken).toBeTruthy();
    expect(result.refreshToken).toBeTruthy();
  });

  it("usa un error neutro cuando las credenciales son incorrectas", async () => {
    client.tb_usuarios.findFirst.mockResolvedValue(null);

    await expect(service.login("desconocido", "Incorrecta#123"))
      .rejects.toMatchObject({
        code: "AUTH_INVALID_CREDENTIALS",
        message: "Usuario o contraseña incorrectos.",
      });
  });

  it("renueva únicamente un token de actualización válido", async () => {
    client.tb_usuarios.findFirst.mockResolvedValue(activeUser);
    client.tb_usuarios.findUnique.mockResolvedValue(activeUser);
    client.tb_usuarios.update.mockResolvedValue(activeUser);
    const login = await service.login("admin_ami", password);

    const renewed = await service.refresh(login.refreshToken);
    expect(renewed.user.id).toBe(activeUser.id_usuario);

    await expect(service.refresh(login.accessToken)).rejects.toMatchObject({
      code: "AUTH_SESSION_EXPIRED",
    });
  });

  it("cambia la contraseña y desactiva el cambio obligatorio", async () => {
    const updatedUser = { ...activeUser, debe_cambiar_password: false };
    client.tb_usuarios.findUnique.mockResolvedValue(activeUser);
    client.tb_usuarios.update.mockResolvedValue(updatedUser);

    const result = await service.changePassword(1, password, "NuevaClave#2026");

    const firstUpdateCall = client.tb_usuarios.update.mock.calls[0];
    expect(firstUpdateCall).toBeDefined();
    const updateData = firstUpdateCall![0].data;
    expect(updateData.debe_cambiar_password).toBe(false);
    expect(await compare("NuevaClave#2026", updateData.password_hash)).toBe(true);
    expect(result.user.mustChangePassword).toBe(false);
  });
});
