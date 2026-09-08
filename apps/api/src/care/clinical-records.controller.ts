import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query, UseGuards } from "@nestjs/common";
import type { ApiSuccess, AuthUser, ClinicalRecordDetail, ClinicalRecordListItem, ClinicalRecordOptions, PaginatedResponse } from "@ami/contracts";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { AccessTokenGuard } from "../auth/guards/access-token.guard";
import { ClinicalRecordsService } from "./clinical-records.service";
import { ClinicalRecordInputDto, VitalSignsInputDto } from "./dto/care-input.dto";
import { ListClinicalRecordsDto } from "./dto/list-care.dto";

@Controller("clinical-records")
@UseGuards(AccessTokenGuard)
export class ClinicalRecordsController {
  constructor(private readonly records: ClinicalRecordsService) {}

  @Get(":type/options")
  async options(@Param("type") type: string, @CurrentUser() user: AuthUser): Promise<ApiSuccess<ClinicalRecordOptions>> {
    return this.success(await this.records.options(type, user));
  }

  @Get(":type")
  async list(@Param("type") type: string, @Query() query: ListClinicalRecordsDto, @CurrentUser() user: AuthUser): Promise<PaginatedResponse<ClinicalRecordListItem>> {
    return this.paginated(await this.records.list(type, query, user));
  }

  @Get(":type/:id")
  async detail(@Param("type") type: string, @Param("id", ParseIntPipe) id: number, @CurrentUser() user: AuthUser): Promise<ApiSuccess<ClinicalRecordDetail>> {
    return this.success(await this.records.detail(type, id, user));
  }

  @Post(":type")
  async create(@Param("type") type: string, @Body() input: ClinicalRecordInputDto, @CurrentUser() user: AuthUser): Promise<ApiSuccess<ClinicalRecordDetail>> {
    return this.success(await this.records.create(type, input, user));
  }

  @Patch(":type/:id")
  async update(@Param("type") type: string, @Param("id", ParseIntPipe) id: number, @Body() input: ClinicalRecordInputDto, @CurrentUser() user: AuthUser): Promise<ApiSuccess<ClinicalRecordDetail>> {
    return this.success(await this.records.update(type, id, input, user));
  }

  @Post(":type/:id/vital-signs")
  async addVitalSigns(@Param("type") type: string, @Param("id", ParseIntPipe) id: number, @Body() input: VitalSignsInputDto, @CurrentUser() user: AuthUser): Promise<ApiSuccess<ClinicalRecordDetail>> {
    return this.success(await this.records.addVitalSigns(type, id, input, user));
  }

  @Patch(":type/:id/vital-signs/:measurementId")
  async updateVitalSigns(@Param("type") type: string, @Param("id", ParseIntPipe) id: number, @Param("measurementId", ParseIntPipe) measurementId: number, @Body() input: VitalSignsInputDto, @CurrentUser() user: AuthUser): Promise<ApiSuccess<ClinicalRecordDetail>> {
    return this.success(await this.records.updateVitalSigns(type, id, measurementId, input, user));
  }

  private success<T>(data: T): ApiSuccess<T> {
    return { data, meta: { timestamp: new Date().toISOString() } };
  }

  private paginated<T>(result: { items: T[]; pagination: PaginatedResponse<T>["pagination"] }): PaginatedResponse<T> {
    return { data: result.items, pagination: result.pagination, meta: { timestamp: new Date().toISOString() } };
  }
}
