import { FastifyAdapter, type NestFastifyApplication } from "@nestjs/platform-fastify";
import { Test } from "@nestjs/testing";
import { afterEach, describe, expect, it, vi } from "vitest";
import { InventoryService } from "./inventory.service";
import { PublicInventoryController } from "./public-inventory.controller";

describe("PublicInventoryController", () => {
  let app: NestFastifyApplication | undefined;

  afterEach(async () => {
    await app?.close();
  });

  it("expone el catálogo y el detalle sin autenticación ni campos administrativos", async () => {
    const product = {
      id: 7,
      name: "Vitamina C",
      type: "medicamento" as const,
      unit: "frasco",
      availability: "available" as const,
      medicationName: "Ácido ascórbico",
    };
    const listPublicItems = vi.fn().mockResolvedValue([product]);
    const publicItem = vi.fn().mockResolvedValue(product);
    const testingModule = await Test.createTestingModule({
      controllers: [PublicInventoryController],
      providers: [{ provide: InventoryService, useValue: { listPublicItems, publicItem } }],
    }).compile();
    app = testingModule.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
    app.setGlobalPrefix("api/v1");
    await app.init();
    await app.getHttpAdapter().getInstance().ready();

    const listResponse = await app.inject({ method: "GET", url: "/api/v1/public/inventory/items" });
    const detailResponse = await app.inject({ method: "GET", url: "/api/v1/public/inventory/items/7" });

    expect(listResponse.statusCode).toBe(200);
    expect(detailResponse.statusCode).toBe(200);
    expect(listResponse.headers["cache-control"]).toContain("public");
    expect(listResponse.json().data).toEqual([product]);
    expect(detailResponse.json().data).toEqual(product);
    expect(listResponse.json().data[0]).not.toHaveProperty("supplier");
    expect(listResponse.json().data[0]).not.toHaveProperty("costPrice");
    expect(listResponse.json().data[0]).not.toHaveProperty("currentStock");
    expect(listPublicItems).toHaveBeenCalledOnce();
    expect(publicItem).toHaveBeenCalledWith(7);
  });
});
