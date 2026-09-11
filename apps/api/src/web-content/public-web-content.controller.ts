import type { ApiSuccess, PublicWebContent } from "@ami/contracts";
import { Controller, Get, Header, Inject } from "@nestjs/common";
import { WebContentService } from "./web-content.service";

@Controller("public/web-content")
export class PublicWebContentController {
  constructor(@Inject(WebContentService) private readonly content: WebContentService) {}

  @Get()
  @Header("Cache-Control", "public, max-age=60, s-maxage=300, stale-while-revalidate=600")
  async get(): Promise<ApiSuccess<PublicWebContent>> {
    return {
      data: await this.content.getPublicContent(),
      meta: { timestamp: new Date().toISOString() },
    };
  }
}
