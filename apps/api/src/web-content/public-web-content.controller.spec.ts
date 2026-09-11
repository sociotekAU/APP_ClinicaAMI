import { FastifyAdapter, type NestFastifyApplication } from "@nestjs/platform-fastify";
import { Test } from "@nestjs/testing";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PublicWebContentController } from "./public-web-content.controller";
import { WebContentService } from "./web-content.service";

describe("PublicWebContentController", () => {
  let app: NestFastifyApplication | undefined;

  afterEach(async () => {
    await app?.close();
  });

  it("expone GET /api/v1/public/web-content sin autenticación", async () => {
    const getPublicContent = vi.fn().mockResolvedValue({
      generatedAt: "2026-09-11T15:00:00.000Z",
      contact: null,
      services: [],
      professionals: [],
      gallery: [],
      promotions: [],
      announcements: [],
    });
    const testingModule = await Test.createTestingModule({
      controllers: [PublicWebContentController],
      providers: [{ provide: WebContentService, useValue: { getPublicContent } }],
    }).compile();
    app = testingModule.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
    app.setGlobalPrefix("api/v1");
    await app.init();
    await app.getHttpAdapter().getInstance().ready();

    const response = await app.inject({ method: "GET", url: "/api/v1/public/web-content" });

    expect(response.statusCode).toBe(200);
    expect(response.headers["cache-control"]).toBe("public, max-age=60, s-maxage=300, stale-while-revalidate=600");
    expect(response.json()).toMatchObject({
      data: { contact: null, services: [], professionals: [], gallery: [], promotions: [], announcements: [] },
      meta: { timestamp: expect.any(String) },
    });
    expect(getPublicContent).toHaveBeenCalledOnce();
  });
});
