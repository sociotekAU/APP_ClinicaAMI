import { describe, expect, it, vi } from "vitest";
import type { DatabaseService } from "../database/database.service";
import { WebContentService } from "./web-content.service";

describe("WebContentService", () => {
  it("pagina servicios usando una visibilidad independiente del estado clínico", async () => {
    const findMany = vi.fn().mockResolvedValue([{ id: 2, nombre: "Consulta", descripcion: "Integral", imagen_url: null, estado: false, visible_web: true, orden_web: 3 }]);
    const service = new WebContentService({ client: { tb_servicios: { findMany, count: vi.fn().mockResolvedValue(1) } } } as unknown as DatabaseService);
    const result = await service.listServices({ page: 1, pageSize: 10, status: "active", sortBy: "order", sortDirection: "asc" });
    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ visible_web: true }), take: 10 }));
    expect(result.items[0]).toEqual({ id: 2, name: "Consulta", description: "Integral", imageUrl: null, clinicalActive: false, visibleOnWeb: true, webOrder: 3 });
  });

  it("crea promociones como borrador y rechaza vigencias invertidas", async () => {
    const create = vi.fn().mockImplementation(async ({ data }) => ({ id: 5, ...data, estado: false, fecha_creacion: new Date("2026-09-09T12:00:00.000Z") }));
    const service = new WebContentService({ client: { tb_promociones: { create } } } as unknown as DatabaseService);
    await expect(service.createPromotion({ title: "Campaña", startDate: "2026-09-10", endDate: "2026-09-09" })).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    const result = await service.createPromotion({ title: "Campaña", startDate: "2026-09-09", endDate: "2026-09-30" });
    expect(create).toHaveBeenCalledWith({ data: expect.objectContaining({ estado: false }) });
    expect(result.publicationState).toBe("draft");
  });

  it("impide activar un anuncio cuando su estilo está inactivo", async () => {
    const update = vi.fn();
    const service = new WebContentService({ client: { tb_anuncios: { findUnique: vi.fn().mockResolvedValue({ tb_estilos: { estado: false }, tb_promociones: null }), update } } } as unknown as DatabaseService);
    await expect(service.setAnnouncementStatus(7, true)).rejects.toMatchObject({ code: "RESOURCE_CONFLICT" });
    expect(update).not.toHaveBeenCalled();
  });
});
