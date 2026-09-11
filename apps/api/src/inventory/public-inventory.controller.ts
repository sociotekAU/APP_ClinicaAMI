import type { ApiSuccess, PublicInventoryItem } from "@ami/contracts";
import { Controller, Get, Header, Inject, Param, ParseIntPipe } from "@nestjs/common";
import { InventoryService } from "./inventory.service";

@Controller("public/inventory/items")
export class PublicInventoryController {
  constructor(@Inject(InventoryService) private readonly inventory: InventoryService) {}

  @Get()
  @Header("Cache-Control", "public, max-age=60, s-maxage=300, stale-while-revalidate=600")
  async items(): Promise<ApiSuccess<PublicInventoryItem[]>> {
    return this.success(await this.inventory.listPublicItems());
  }

  @Get(":id")
  @Header("Cache-Control", "public, max-age=60, s-maxage=300, stale-while-revalidate=600")
  async item(@Param("id", ParseIntPipe) id: number): Promise<ApiSuccess<PublicInventoryItem>> {
    return this.success(await this.inventory.publicItem(id));
  }

  private success<T>(data: T): ApiSuccess<T> {
    return { data, meta: { timestamp: new Date().toISOString() } };
  }
}
