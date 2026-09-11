import { describe, expect, it, vi } from "vitest";
import type { WebContentPreview } from "@ami/contracts";
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

  it("publica únicamente el contenido visible y omite metadatos administrativos", async () => {
    const service = new WebContentService({ client: {} } as DatabaseService);
    const preview: WebContentPreview = {
      generatedAt: "2026-09-11T15:00:00.000Z",
      contact: {
        id: 1,
        companyName: "Clínica AMI",
        shortName: "AMI",
        phone: "2222-2222",
        email: "hola@ami.test",
        facebook: null,
        instagram: null,
        logoUrl: "/logo.png",
        location: "Guatemala",
        googleMapsUrl: null,
        homeVideoUrl: null,
        slogan: "Cuidamos de ti",
        weekdayHours: "08:00-17:00",
        saturdayHours: null,
        active: true,
        createdAt: "2026-01-01T00:00:00.000Z",
      },
      services: [{ id: 2, name: "Consulta", description: "Integral", imageUrl: null, clinicalActive: true, visibleOnWeb: true, webOrder: 1 }],
      professionals: [{ id: 3, name: "Dra. Ana", specialty: "Medicina general", publicProfile: "Perfil", photoUrl: "/ana.jpg", clinicalActive: true, visibleOnWeb: true, webOrder: 1 }],
      gallery: [{ id: 4, title: "Instalaciones", description: null, imageUrl: "/clinica.jpg", active: true, webOrder: 1, createdAt: "2026-01-01T00:00:00.000Z" }],
      promotions: [{ id: 5, title: "Promoción", description: null, startDate: "2026-09-01", endDate: "2026-09-30", imageUrl: null, active: true, publicationState: "active", createdAt: "2026-01-01T00:00:00.000Z" }],
      announcements: [{
        id: 6,
        title: "Anuncio",
        description: "Mensaje",
        style: { id: 7, name: "Principal", backgroundColor: "#ffffff", textColor: "#111111", icon: "heart", position: "centro", active: true },
        promotion: { id: 5, title: "Promoción", active: true },
        startDate: "2026-09-01",
        endDate: "2026-09-30",
        imageUrl: null,
        active: true,
        publicationState: "active",
        createdAt: "2026-01-01T00:00:00.000Z",
      }],
    };
    vi.spyOn(service, "getPreview").mockResolvedValue(preview);

    const result = await service.getPublicContent();

    expect(result).toEqual({
      generatedAt: preview.generatedAt,
      contact: {
        companyName: "Clínica AMI",
        shortName: "AMI",
        phone: "2222-2222",
        email: "hola@ami.test",
        facebook: null,
        instagram: null,
        logoUrl: "/logo.png",
        location: "Guatemala",
        googleMapsUrl: null,
        homeVideoUrl: null,
        slogan: "Cuidamos de ti",
        weekdayHours: "08:00-17:00",
        saturdayHours: null,
      },
      services: [{ id: 2, name: "Consulta", description: "Integral", imageUrl: null }],
      professionals: [{ id: 3, name: "Dra. Ana", specialty: "Medicina general", publicProfile: "Perfil", photoUrl: "/ana.jpg" }],
      gallery: [{ id: 4, title: "Instalaciones", description: null, imageUrl: "/clinica.jpg" }],
      promotions: [{ id: 5, title: "Promoción", description: null, startDate: "2026-09-01", endDate: "2026-09-30", imageUrl: null }],
      announcements: [{
        id: 6,
        title: "Anuncio",
        description: "Mensaje",
        style: { name: "Principal", backgroundColor: "#ffffff", textColor: "#111111", icon: "heart", position: "centro" },
        promotion: { id: 5, title: "Promoción" },
        startDate: "2026-09-01",
        endDate: "2026-09-30",
        imageUrl: null,
      }],
    });
    expect(result.contact).not.toHaveProperty("active");
    expect(result.services[0]).not.toHaveProperty("visibleOnWeb");
    expect(result.announcements[0]).not.toHaveProperty("publicationState");
  });
});
