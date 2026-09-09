import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query, UseGuards } from "@nestjs/common";
import type { ApiSuccess, AuthUser, LabOrderDetail, LabOrderListItem, LabOrderOptions, LabTestListItem, PaginatedResponse } from "@ami/contracts";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { AccessTokenGuard } from "../auth/guards/access-token.guard";
import { RequirePermission } from "../authorization/decorators/require-permission.decorator";
import { PermissionGuard } from "../authorization/guards/permission.guard";
import { BooleanStatusInputDto } from "../care/dto/care-input.dto";
import { LabOrderInputDto, LabOrderStatusInputDto, LabResultInputDto, LabTestInputDto } from "./dto/laboratory-input.dto";
import { ListLabOrdersDto, ListLabTestsDto } from "./dto/list-laboratory.dto";
import { LaboratoryService } from "./laboratory.service";

@Controller("laboratory")
@UseGuards(AccessTokenGuard, PermissionGuard)
export class LaboratoryController {
  constructor(private readonly laboratory: LaboratoryService) {}

  @Get("options") @RequirePermission("laboratorio", "read")
  async options(@CurrentUser() user: AuthUser): Promise<ApiSuccess<LabOrderOptions>> { return this.success(await this.laboratory.options(user)); }

  @Get("tests") @RequirePermission("laboratorio", "read")
  async tests(@Query() query: ListLabTestsDto): Promise<PaginatedResponse<LabTestListItem>> { return this.paginated(await this.laboratory.listTests(query)); }

  @Post("tests") @RequirePermission("laboratorio", "write")
  async createTest(@Body() input: LabTestInputDto): Promise<ApiSuccess<LabTestListItem>> { return this.success(await this.laboratory.createTest(input)); }

  @Patch("tests/:id") @RequirePermission("laboratorio", "write")
  async updateTest(@Param("id", ParseIntPipe) id: number, @Body() input: LabTestInputDto): Promise<ApiSuccess<LabTestListItem>> { return this.success(await this.laboratory.updateTest(id, input)); }

  @Patch("tests/:id/status") @RequirePermission("laboratorio", "write")
  async testStatus(@Param("id", ParseIntPipe) id: number, @Body() input: BooleanStatusInputDto): Promise<ApiSuccess<LabTestListItem>> { return this.success(await this.laboratory.setTestStatus(id, input.active)); }

  @Get("orders") @RequirePermission("laboratorio", "read")
  async orders(@Query() query: ListLabOrdersDto, @CurrentUser() user: AuthUser): Promise<PaginatedResponse<LabOrderListItem>> { return this.paginated(await this.laboratory.listOrders(query, user)); }

  @Get("orders/:id") @RequirePermission("laboratorio", "read")
  async order(@Param("id", ParseIntPipe) id: number, @CurrentUser() user: AuthUser): Promise<ApiSuccess<LabOrderDetail>> { return this.success(await this.laboratory.orderDetail(id, user)); }

  @Post("orders") @RequirePermission("laboratorio", "write")
  async createOrder(@Body() input: LabOrderInputDto, @CurrentUser() user: AuthUser): Promise<ApiSuccess<LabOrderDetail>> { return this.success(await this.laboratory.createOrder(input, user)); }

  @Patch("orders/:id/status") @RequirePermission("laboratorio", "write")
  async orderStatus(@Param("id", ParseIntPipe) id: number, @Body() input: LabOrderStatusInputDto, @CurrentUser() user: AuthUser): Promise<ApiSuccess<LabOrderDetail>> { return this.success(await this.laboratory.setOrderStatus(id, input, user)); }

  @Patch("orders/:orderId/results/:resultId") @RequirePermission("laboratorio", "write")
  async result(@Param("orderId", ParseIntPipe) orderId: number, @Param("resultId", ParseIntPipe) resultId: number, @Body() input: LabResultInputDto, @CurrentUser() user: AuthUser): Promise<ApiSuccess<LabOrderDetail>> { return this.success(await this.laboratory.saveResult(orderId, resultId, input, user)); }

  private success<T>(data: T): ApiSuccess<T> { return { data, meta: { timestamp: new Date().toISOString() } }; }
  private paginated<T>(result: { items: T[]; pagination: PaginatedResponse<T>["pagination"] }): PaginatedResponse<T> { return { data: result.items, pagination: result.pagination, meta: { timestamp: new Date().toISOString() } }; }
}
