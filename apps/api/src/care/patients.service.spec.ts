import { describe, expect, it, vi } from "vitest";
import type { DatabaseService } from "../database/database.service";
import { PatientsService } from "./patients.service";

describe("PatientsService", () => {
  it("pagina y transforma pacientes sin exponer columnas de PostgreSQL", async () => {
    const findMany = vi.fn().mockResolvedValue([{ id_paciente: 1, nombres: "Ana", apellidos: "López", fecha_nacimiento: new Date("1990-01-02T00:00:00.000Z"), genero: "Femenino", telefono: "5555", email: null, tipo_sangre: "O+", antecedentes_personales: null, estado: true, fecha_creacion: new Date("2026-01-01T00:00:00.000Z"), _count: { tb_citas: 2 } }]);
    const service = new PatientsService({ client: { tb_pacientes: { findMany, count: vi.fn().mockResolvedValue(11) } } } as unknown as DatabaseService);
    const result = await service.list({ page: 2, pageSize: 10, status: "active", sortBy: "lastName", sortDirection: "asc" });
    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({ skip: 10, take: 10 }));
    expect(result.pagination).toEqual({ page: 2, pageSize: 10, totalItems: 11, totalPages: 2 });
    expect(result.items[0]).toMatchObject({ id: 1, fullName: "Ana López", birthDate: "1990-01-02", appointmentCount: 2 });
    expect(result.items[0]).not.toHaveProperty("antecedentes_personales");
  });

  it("rechaza fechas de nacimiento futuras antes de escribir", async () => {
    const create = vi.fn();
    const service = new PatientsService({ client: { tb_pacientes: { create } } } as unknown as DatabaseService);
    await expect(service.create({ firstNames: "Persona", lastNames: "Futura", birthDate: "2999-01-01", phone: "5555" })).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    expect(create).not.toHaveBeenCalled();
  });
});
