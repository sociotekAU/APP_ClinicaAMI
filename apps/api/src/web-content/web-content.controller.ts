import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query, UseGuards } from "@nestjs/common";
import type {
  ApiSuccess,
  PaginatedResponse,
  WebAnnouncementItem,
  WebAnnouncementStyleItem,
  WebContact,
  WebContentOptions,
  WebContentPreview,
  WebGalleryItem,
  WebProfessionalListItem,
  WebPromotionItem,
  WebServiceListItem,
} from "@ami/contracts";
import { AccessTokenGuard } from "../auth/guards/access-token.guard";
import { RequirePermission } from "../authorization/decorators/require-permission.decorator";
import { PermissionGuard } from "../authorization/guards/permission.guard";
import {
  ListAnnouncementsDto,
  ListGalleryDto,
  ListPromotionsDto,
  ListStylesDto,
  ListWebProfessionalsDto,
  ListWebServicesDto,
} from "./dto/list-web-content.dto";
import {
  AnnouncementInputDto,
  AnnouncementStyleInputDto,
  GalleryInputDto,
  PromotionInputDto,
  WebContactInputDto,
  WebProfessionalInputDto,
  WebServiceInputDto,
  WebStatusInputDto,
} from "./dto/web-content-input.dto";
import { WebContentService } from "./web-content.service";

@Controller("web-content")
@UseGuards(AccessTokenGuard, PermissionGuard)
export class WebContentController {
  constructor(private readonly content: WebContentService) {}

  @Get("contact") @RequirePermission("contenido_web", "read")
  async contact(): Promise<ApiSuccess<WebContact | null>> { return this.success(await this.content.getContact()); }

  @Patch("contact/:id") @RequirePermission("contenido_web", "write")
  async updateContact(@Param("id", ParseIntPipe) id: number, @Body() input: WebContactInputDto): Promise<ApiSuccess<WebContact>> {
    return this.success(await this.content.updateContact(id, input));
  }

  @Get("services") @RequirePermission("contenido_web", "read")
  async services(@Query() query: ListWebServicesDto): Promise<PaginatedResponse<WebServiceListItem>> {
    return this.paginated(await this.content.listServices(query));
  }

  @Patch("services/:id") @RequirePermission("contenido_web", "write")
  async updateService(@Param("id", ParseIntPipe) id: number, @Body() input: WebServiceInputDto): Promise<ApiSuccess<WebServiceListItem>> {
    return this.success(await this.content.updateService(id, input));
  }

  @Get("professionals") @RequirePermission("contenido_web", "read")
  async professionals(@Query() query: ListWebProfessionalsDto): Promise<PaginatedResponse<WebProfessionalListItem>> {
    return this.paginated(await this.content.listProfessionals(query));
  }

  @Patch("professionals/:id") @RequirePermission("contenido_web", "write")
  async updateProfessional(@Param("id", ParseIntPipe) id: number, @Body() input: WebProfessionalInputDto): Promise<ApiSuccess<WebProfessionalListItem>> {
    return this.success(await this.content.updateProfessional(id, input));
  }

  @Get("gallery") @RequirePermission("contenido_web", "read")
  async gallery(@Query() query: ListGalleryDto): Promise<PaginatedResponse<WebGalleryItem>> { return this.paginated(await this.content.listGallery(query)); }
  @Post("gallery") @RequirePermission("contenido_web", "write")
  async createGallery(@Body() input: GalleryInputDto): Promise<ApiSuccess<WebGalleryItem>> { return this.success(await this.content.createGallery(input)); }
  @Patch("gallery/:id") @RequirePermission("contenido_web", "write")
  async updateGallery(@Param("id", ParseIntPipe) id: number, @Body() input: GalleryInputDto): Promise<ApiSuccess<WebGalleryItem>> { return this.success(await this.content.updateGallery(id, input)); }
  @Patch("gallery/:id/status") @RequirePermission("contenido_web", "write")
  async galleryStatus(@Param("id", ParseIntPipe) id: number, @Body() input: WebStatusInputDto): Promise<ApiSuccess<WebGalleryItem>> { return this.success(await this.content.setGalleryStatus(id, input.active)); }

  @Get("promotions") @RequirePermission("contenido_web", "read")
  async promotions(@Query() query: ListPromotionsDto): Promise<PaginatedResponse<WebPromotionItem>> { return this.paginated(await this.content.listPromotions(query)); }
  @Post("promotions") @RequirePermission("contenido_web", "write")
  async createPromotion(@Body() input: PromotionInputDto): Promise<ApiSuccess<WebPromotionItem>> { return this.success(await this.content.createPromotion(input)); }
  @Patch("promotions/:id") @RequirePermission("contenido_web", "write")
  async updatePromotion(@Param("id", ParseIntPipe) id: number, @Body() input: PromotionInputDto): Promise<ApiSuccess<WebPromotionItem>> { return this.success(await this.content.updatePromotion(id, input)); }
  @Patch("promotions/:id/status") @RequirePermission("contenido_web", "write")
  async promotionStatus(@Param("id", ParseIntPipe) id: number, @Body() input: WebStatusInputDto): Promise<ApiSuccess<WebPromotionItem>> { return this.success(await this.content.setPromotionStatus(id, input.active)); }

  @Get("styles") @RequirePermission("contenido_web", "read")
  async styles(@Query() query: ListStylesDto): Promise<PaginatedResponse<WebAnnouncementStyleItem>> { return this.paginated(await this.content.listStyles(query)); }
  @Post("styles") @RequirePermission("contenido_web", "write")
  async createStyle(@Body() input: AnnouncementStyleInputDto): Promise<ApiSuccess<WebAnnouncementStyleItem>> { return this.success(await this.content.createStyle(input)); }
  @Patch("styles/:id") @RequirePermission("contenido_web", "write")
  async updateStyle(@Param("id", ParseIntPipe) id: number, @Body() input: AnnouncementStyleInputDto): Promise<ApiSuccess<WebAnnouncementStyleItem>> { return this.success(await this.content.updateStyle(id, input)); }
  @Patch("styles/:id/status") @RequirePermission("contenido_web", "write")
  async styleStatus(@Param("id", ParseIntPipe) id: number, @Body() input: WebStatusInputDto): Promise<ApiSuccess<WebAnnouncementStyleItem>> { return this.success(await this.content.setStyleStatus(id, input.active)); }

  @Get("announcements") @RequirePermission("contenido_web", "read")
  async announcements(@Query() query: ListAnnouncementsDto): Promise<PaginatedResponse<WebAnnouncementItem>> { return this.paginated(await this.content.listAnnouncements(query)); }
  @Post("announcements") @RequirePermission("contenido_web", "write")
  async createAnnouncement(@Body() input: AnnouncementInputDto): Promise<ApiSuccess<WebAnnouncementItem>> { return this.success(await this.content.createAnnouncement(input)); }
  @Patch("announcements/:id") @RequirePermission("contenido_web", "write")
  async updateAnnouncement(@Param("id", ParseIntPipe) id: number, @Body() input: AnnouncementInputDto): Promise<ApiSuccess<WebAnnouncementItem>> { return this.success(await this.content.updateAnnouncement(id, input)); }
  @Patch("announcements/:id/status") @RequirePermission("contenido_web", "write")
  async announcementStatus(@Param("id", ParseIntPipe) id: number, @Body() input: WebStatusInputDto): Promise<ApiSuccess<WebAnnouncementItem>> { return this.success(await this.content.setAnnouncementStatus(id, input.active)); }

  @Get("options") @RequirePermission("contenido_web", "read")
  async options(): Promise<ApiSuccess<WebContentOptions>> { return this.success(await this.content.getOptions()); }

  @Get("preview") @RequirePermission("contenido_web", "read")
  async preview(): Promise<ApiSuccess<WebContentPreview>> { return this.success(await this.content.getPreview()); }

  private success<T>(data: T): ApiSuccess<T> { return { data, meta: { timestamp: new Date().toISOString() } }; }
  private paginated<T>(result: { items: T[]; pagination: PaginatedResponse<T>["pagination"] }): PaginatedResponse<T> {
    return { data: result.items, pagination: result.pagination, meta: { timestamp: new Date().toISOString() } };
  }
}
