import { compare } from "bcryptjs";
import { describe, expect, it, vi } from "vitest";
import type { DatabaseService } from "../database/database.service";
import { AdministrationService } from "./administration.service";

const specialtyRow = {
  id: 1,
  nombre: "Medicina integrativa",
  descripcion: "Atención integral",
  estado: true,
  fecha_creacion: new Date("2026-01-01T00:00:00.000Z"),
  _count: { tb_medicos: 3 },
};

describe("AdministrationService", () => {
  it("pagina y transforma especialidades sin exponer nombres de columnas", async () => {
    const findMany = vi.fn().mockResolvedValue([specialtyRow]);
    const count = vi.fn().mockResolvedValue(10);
    const service = new AdministrationService({
      client: { tb_especialidades: { findMany, count } },
    } as unknown as DatabaseService);

    const result = await service.listSpecialties({
      page: 2,
      pageSize: 5,
      status: "active",
      sortBy: "name",
      sortDirection: "asc",
    });

    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({ skip: 5, take: 5 }));
    expect(result.pagination).toEqual({ page: 2, pageSize: 5, totalItems: 10, totalPages: 2 });
    expect(result.items[0]).toEqual({
      id: 1,
      name: "Medicina integrativa",
      description: "Atención integral",
      active: true,
      professionalCount: 3,
      createdAt: "2026-01-01T00:00:00.000Z",
    });
  });

  it("normaliza el usuario y guarda únicamente el hash de la contraseña", async () => {
    const create = vi.fn().mockImplementation(async ({ data }) => ({
      id_usuario: 9,
      username: data.username,
      nombre: data.nombre,
      correo: data.correo,
      password_hash: data.password_hash,
      estado: true,
      debe_cambiar_password: true,
      ultimo_acceso: null,
      fecha_creacion: new Date("2026-01-01T00:00:00.000Z"),
      tb_roles: { id_rol: 1, nombre_rol: "Administrador" },
      tb_medicos: null,
    }));
    const service = new AdministrationService({
      client: {
        tb_roles: { findUnique: vi.fn().mockResolvedValue({ id_rol: 1, estado: true }) },
        tb_medicos: { findUnique: vi.fn() },
        tb_usuarios: { create },
      },
    } as unknown as DatabaseService);

    const result = await service.createUser({
      username: "  Nueva.Cuenta  ",
      name: "  Usuario de Prueba  ",
      email: "  PERSONA@AMI.TEST  ",
      roleId: 1,
      temporaryPassword: "Temporal#2026Segura",
    });

    const data = create.mock.calls[0]?.[0]?.data;
    expect(data.username).toBe("nueva.cuenta");
    expect(data.password_hash).not.toBe("Temporal#2026Segura");
    expect(await compare("Temporal#2026Segura", data.password_hash)).toBe(true);
    expect(result).not.toHaveProperty("password_hash");
  });

  it("impide que el usuario activo deshabilite su propia cuenta", async () => {
    const update = vi.fn();
    const service = new AdministrationService({
      client: { tb_usuarios: { update } },
    } as unknown as DatabaseService);

    await expect(service.setUserStatus(4, false, 4)).rejects.toMatchObject({ code: "RESOURCE_CONFLICT" });
    expect(update).not.toHaveBeenCalled();
  });

  it("desactiva la cuenta vinculada junto con el profesional", async () => {
    const updateUser = vi.fn().mockResolvedValue({ count: 1 });
    const updateProfessional = vi.fn().mockResolvedValue({});
    const findUnique = vi.fn()
      .mockResolvedValueOnce({ id: 3, tb_especialidades: { estado: true } })
      .mockResolvedValueOnce({
        id: 3,
        nombre: "Profesional",
        dpi: null,
        colegiado: null,
        numero_telefono: null,
        correo: null,
        fecha_inicio: null,
        estado: false,
        fecha_creacion: new Date("2026-01-01T00:00:00.000Z"),
        tb_especialidades: { id: 1, nombre: "Especialidad" },
        tb_usuarios: { id_usuario: 2 },
      });
    const client = {
      tb_medicos: { findUnique, update: updateProfessional, findUniqueOrThrow: findUnique },
      tb_usuarios: { updateMany: updateUser },
      $transaction: vi.fn(async (operations: Array<Promise<unknown>>) => Promise.all(operations)),
    };
    const service = new AdministrationService({ client } as unknown as DatabaseService);

    await service.setProfessionalStatus(3, false);

    expect(updateProfessional).toHaveBeenCalledWith({ where: { id: 3 }, data: { estado: false } });
    expect(updateUser).toHaveBeenCalledWith({ where: { id_doctor: 3 }, data: { estado: false } });
  });
});
