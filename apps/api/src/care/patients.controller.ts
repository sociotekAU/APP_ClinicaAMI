import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query, UseGuards } from "@nestjs/common";
import type { ApiSuccess, PaginatedResponse, PatientListItem } from "@ami/contracts";
import { AccessTokenGuard } from "../auth/guards/access-token.guard";
import { RequirePermission } from "../authorization/decorators/require-permission.decorator";
import { PermissionGuard } from "../authorization/guards/permission.guard";
import { BooleanStatusInputDto, PatientInputDto } from "./dto/care-input.dto";
import { ListPatientsDto } from "./dto/list-care.dto";
import { PatientsService } from "./patients.service";

@Controller("patients")
@UseGuards(AccessTokenGuard, PermissionGuard)
export class PatientsController {
  constructor(private readonly patients: PatientsService) {}

  @Get()
  @RequirePermission("pacientes", "read")
  async list(@Query() query: ListPatientsDto): Promise<PaginatedResponse<PatientListItem>> {
    const result = await this.patients.list(query);
    return { data: result.items, pagination: result.pagination, meta: { timestamp: new Date().toISOString() } };
  }

  @Post()
  @RequirePermission("pacientes", "write")
  async create(@Body() input: PatientInputDto): Promise<ApiSuccess<PatientListItem>> {
    return this.success(await this.patients.create(input));
  }

  @Patch(":id")
  @RequirePermission("pacientes", "write")
  async update(@Param("id", ParseIntPipe) id: number, @Body() input: PatientInputDto): Promise<ApiSuccess<PatientListItem>> {
    return this.success(await this.patients.update(id, input));
  }

  @Patch(":id/status")
  @RequirePermission("pacientes", "write")
  async status(@Param("id", ParseIntPipe) id: number, @Body() input: BooleanStatusInputDto): Promise<ApiSuccess<PatientListItem>> {
    return this.success(await this.patients.setStatus(id, input.active));
  }

  private success<T>(data: T): ApiSuccess<T> {
    return { data, meta: { timestamp: new Date().toISOString() } };
  }
}
