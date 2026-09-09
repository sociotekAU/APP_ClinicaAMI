import "reflect-metadata";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { describe, expect, it } from "vitest";
import { ListWebServicesDto } from "./list-web-content.dto";
import { AnnouncementInputDto, AnnouncementStyleInputDto, WebContactInputDto } from "./web-content-input.dto";

describe("web content DTOs", () => {
  it("transforma paginación y acepta filtros de visibilidad", async () => {
    const query = plainToInstance(ListWebServicesDto, { page: "2", pageSize: "20", status: "active", sortBy: "order" });
    expect(await validate(query)).toHaveLength(0);
    expect(query).toMatchObject({ page: 2, pageSize: 20, status: "active", sortBy: "order" });
  });

  it("rechaza URLs, colores y posiciones inseguras", async () => {
    const contact = plainToInstance(WebContactInputDto, { companyName: "AMI", phone: "1234", location: "Cobán", facebook: "javascript:alert(1)", active: true });
    const style = plainToInstance(AnnouncementStyleInputDto, { name: "Alerta", backgroundColor: "red", textColor: "#ffffff", position: "flotante" });
    expect((await validate(contact)).map((error) => error.property)).toContain("facebook");
    expect((await validate(style)).map((error) => error.property)).toEqual(expect.arrayContaining(["backgroundColor", "position"]));
  });

  it("exige fechas completas y relaciones válidas para anuncios", async () => {
    const announcement = plainToInstance(AnnouncementInputDto, { title: "Aviso", styleId: 0, startDate: "09/09/2026", endDate: "2026-09-10" });
    expect((await validate(announcement)).map((error) => error.property)).toEqual(expect.arrayContaining(["styleId", "startDate"]));
  });
});
