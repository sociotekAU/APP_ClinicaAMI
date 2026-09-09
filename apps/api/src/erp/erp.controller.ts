import { Body, Controller, Get, Param, ParseIntPipe, Patch, Query, UseGuards } from "@nestjs/common";
import type {
  ApiSuccess,
  AuthUser,
  ErpContext,
  PaginatedResponse,
  PermissionListItem,
  PermissionOptions,
  RolePermissionConfiguration,
} from "@ami/contracts";
import { PermissionGuard } from "../authorization/guards/permission.guard";
import { AdminRoleGuard } from "../authorization/guards/admin-role.guard";
import { RequirePermission } from "../authorization/decorators/require-permission.decorator";
import { AccessTokenGuard } from "../auth/guards/access-token.guard";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { ErpService } from "./erp.service";
import { ListPermissionsDto } from "./dto/list-permissions.dto";
import { UpdateRolePermissionsDto } from "./dto/update-role-permissions.dto";

@Controller("erp")
export class ErpController {
  constructor(private readonly erp: ErpService) {}

  @Get("context")
  @UseGuards(AccessTokenGuard)
  async context(@CurrentUser() user: AuthUser): Promise<ApiSuccess<ErpContext>> {
    return {
      data: await this.erp.getContext(user),
      meta: {
        timestamp: new Date().toISOString(),
      },
    };
  }

  @Get("permissions")
  @UseGuards(AccessTokenGuard, PermissionGuard)
  @RequirePermission("seguridad", "read")
  async permissions(
    @Query() query: ListPermissionsDto,
  ): Promise<PaginatedResponse<PermissionListItem>> {
    const result = await this.erp.listPermissions(query);
    return {
      data: result.items,
      pagination: result.pagination,
      meta: {
        timestamp: new Date().toISOString(),
      },
    };
  }

  @Get("permissions/options")
  @UseGuards(AccessTokenGuard)
  async permissionOptions(@CurrentUser() user: AuthUser): Promise<ApiSuccess<PermissionOptions>> {
    return this.success(await this.erp.permissionOptions(user));
  }

  @Get("permissions/roles/:roleId")
  @UseGuards(AccessTokenGuard, AdminRoleGuard)
  async rolePermissions(
    @Param("roleId", ParseIntPipe) roleId: number,
  ): Promise<ApiSuccess<RolePermissionConfiguration>> {
    return this.success(await this.erp.rolePermissionConfiguration(roleId));
  }

  @Patch("permissions/roles/:roleId")
  @UseGuards(AccessTokenGuard, AdminRoleGuard)
  async updateRolePermissions(
    @Param("roleId", ParseIntPipe) roleId: number,
    @Body() input: UpdateRolePermissionsDto,
  ): Promise<ApiSuccess<RolePermissionConfiguration>> {
    return this.success(await this.erp.updateRolePermissions(roleId, input));
  }

  private success<T>(data: T): ApiSuccess<T> {
    return { data, meta: { timestamp: new Date().toISOString() } };
  }
}
