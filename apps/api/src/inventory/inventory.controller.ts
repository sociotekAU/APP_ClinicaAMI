import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query, UseGuards } from "@nestjs/common";
import type { ApiSuccess, AuthUser, InventoryItemListItem, InventoryMovementListItem, InventoryOptions, PaginatedResponse, SupplierListItem } from "@ami/contracts";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { AccessTokenGuard } from "../auth/guards/access-token.guard";
import { RequirePermission } from "../authorization/decorators/require-permission.decorator";
import { PermissionGuard } from "../authorization/guards/permission.guard";
import { BooleanStatusInputDto } from "../care/dto/care-input.dto";
import { InventoryItemInputDto, InventoryMovementInputDto, SupplierInputDto } from "./dto/inventory-input.dto";
import { ListInventoryItemsDto, ListInventoryMovementsDto, ListSuppliersDto } from "./dto/list-inventory.dto";
import { InventoryService } from "./inventory.service";

@Controller("inventory")
@UseGuards(AccessTokenGuard, PermissionGuard)
export class InventoryController {
  constructor(private readonly inventory: InventoryService) {}

  @Get("options") @RequirePermission("inventario", "read")
  async options(): Promise<ApiSuccess<InventoryOptions>> { return this.success(await this.inventory.options()); }

  @Get("suppliers") @RequirePermission("inventario", "read")
  async suppliers(@Query() query: ListSuppliersDto): Promise<PaginatedResponse<SupplierListItem>> { return this.paginated(await this.inventory.listSuppliers(query)); }

  @Post("suppliers") @RequirePermission("inventario", "write")
  async createSupplier(@Body() input: SupplierInputDto): Promise<ApiSuccess<SupplierListItem>> { return this.success(await this.inventory.createSupplier(input)); }

  @Patch("suppliers/:id") @RequirePermission("inventario", "write")
  async updateSupplier(@Param("id", ParseIntPipe) id: number, @Body() input: SupplierInputDto): Promise<ApiSuccess<SupplierListItem>> { return this.success(await this.inventory.updateSupplier(id, input)); }

  @Patch("suppliers/:id/status") @RequirePermission("inventario", "write")
  async supplierStatus(@Param("id", ParseIntPipe) id: number, @Body() input: BooleanStatusInputDto): Promise<ApiSuccess<SupplierListItem>> { return this.success(await this.inventory.setSupplierStatus(id, input.active)); }

  @Get("items") @RequirePermission("inventario", "read")
  async items(@Query() query: ListInventoryItemsDto): Promise<PaginatedResponse<InventoryItemListItem>> { return this.paginated(await this.inventory.listItems(query)); }

  @Post("items") @RequirePermission("inventario", "write")
  async createItem(@Body() input: InventoryItemInputDto): Promise<ApiSuccess<InventoryItemListItem>> { return this.success(await this.inventory.createItem(input)); }

  @Patch("items/:id") @RequirePermission("inventario", "write")
  async updateItem(@Param("id", ParseIntPipe) id: number, @Body() input: InventoryItemInputDto): Promise<ApiSuccess<InventoryItemListItem>> { return this.success(await this.inventory.updateItem(id, input)); }

  @Patch("items/:id/status") @RequirePermission("inventario", "write")
  async itemStatus(@Param("id", ParseIntPipe) id: number, @Body() input: BooleanStatusInputDto): Promise<ApiSuccess<InventoryItemListItem>> { return this.success(await this.inventory.setItemStatus(id, input.active)); }

  @Get("movements") @RequirePermission("inventario", "read")
  async movements(@Query() query: ListInventoryMovementsDto): Promise<PaginatedResponse<InventoryMovementListItem>> { return this.paginated(await this.inventory.listMovements(query)); }

  @Post("movements") @RequirePermission("inventario", "write")
  async createMovement(@Body() input: InventoryMovementInputDto, @CurrentUser() user: AuthUser): Promise<ApiSuccess<InventoryMovementListItem>> { return this.success(await this.inventory.createMovement(input, user)); }

  private success<T>(data: T): ApiSuccess<T> { return { data, meta: { timestamp: new Date().toISOString() } }; }
  private paginated<T>(result: { items: T[]; pagination: PaginatedResponse<T>["pagination"] }): PaginatedResponse<T> { return { data: result.items, pagination: result.pagination, meta: { timestamp: new Date().toISOString() } }; }
}
