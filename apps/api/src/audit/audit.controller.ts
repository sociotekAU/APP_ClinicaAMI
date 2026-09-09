import { Controller, Get, HttpStatus, Param, ParseIntPipe, Query, UseGuards } from "@nestjs/common";
import type { ApiSuccess, AuditEventDetail, AuditEventListItem, AuditOptions, PaginatedResponse } from "@ami/contracts";
import { AccessTokenGuard } from "../auth/guards/access-token.guard";
import { RequirePermission } from "../authorization/decorators/require-permission.decorator";
import { PermissionGuard } from "../authorization/guards/permission.guard";
import { AppException } from "../common/errors/app.exception";
import { AuditService } from "./audit.service";
import { ListAuditEventsDto } from "./dto/list-audit-events.dto";

@Controller("audit")
@UseGuards(AccessTokenGuard, PermissionGuard)
@RequirePermission("auditoria", "read")
export class AuditController {
  constructor(private readonly audit: AuditService) {}

  @Get()
  async list(@Query() query: ListAuditEventsDto): Promise<PaginatedResponse<AuditEventListItem>> {
    const result = await this.audit.list(query);
    return { data: result.items, pagination: result.pagination, meta: { timestamp: new Date().toISOString() } };
  }

  @Get("options")
  async options(): Promise<ApiSuccess<AuditOptions>> {
    return this.success(await this.audit.options());
  }

  @Get(":id")
  async detail(@Param("id", ParseIntPipe) id: number): Promise<ApiSuccess<AuditEventDetail>> {
    const event = await this.audit.detail(BigInt(id));
    if (!event) throw new AppException("RESOURCE_NOT_FOUND", "El evento de auditoría no existe.", HttpStatus.NOT_FOUND);
    return this.success(event);
  }

  private success<T>(data: T): ApiSuccess<T> {
    return { data, meta: { timestamp: new Date().toISOString() } };
  }
}
