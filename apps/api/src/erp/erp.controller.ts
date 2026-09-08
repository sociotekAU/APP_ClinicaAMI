import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import type {
  ApiSuccess,
  AuthUser,
  ErpContext,
  PaginatedResponse,
  PermissionListItem,
} from "@ami/contracts";
import { PermissionGuard } from "../authorization/guards/permission.guard";
import { RequirePermission } from "../authorization/decorators/require-permission.decorator";
import { AccessTokenGuard } from "../auth/guards/access-token.guard";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { ErpService } from "./erp.service";
import { ListPermissionsDto } from "./dto/list-permissions.dto";

@Controller("erp")
export class ErpController {
  constructor(private readonly erp: ErpService) {}

  @Get("context")
  @UseGuards(AccessTokenGuard, PermissionGuard)
  @RequirePermission("pacientes", "read")
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
}
