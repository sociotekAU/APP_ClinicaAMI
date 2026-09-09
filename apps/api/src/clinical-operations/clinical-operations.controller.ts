import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query, UseGuards } from "@nestjs/common";
import type { ApiSuccess, AuthUser, ClinicalOperationsOptions, MedicationListItem, PaginatedResponse, PrescriptionDetail, PrescriptionListItem, ProcedureListItem } from "@ami/contracts";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { AccessTokenGuard } from "../auth/guards/access-token.guard";
import { RequirePermission } from "../authorization/decorators/require-permission.decorator";
import { PermissionGuard } from "../authorization/guards/permission.guard";
import { BooleanStatusInputDto } from "../care/dto/care-input.dto";
import { ClinicalOperationsService } from "./clinical-operations.service";
import { MedicationInputDto, PrescriptionAnnulDto, PrescriptionInputDto, ProcedureInputDto } from "./dto/clinical-operations-input.dto";
import { ListMedicationsDto, ListPrescriptionsDto, ListProceduresDto } from "./dto/list-clinical-operations.dto";

@Controller()
@UseGuards(AccessTokenGuard, PermissionGuard)
export class ClinicalOperationsController {
  constructor(private readonly operations: ClinicalOperationsService) {}

  @Get("clinical-operations/options") @RequirePermission("recetas", "read")
  async options(@CurrentUser() user: AuthUser): Promise<ApiSuccess<ClinicalOperationsOptions>> { return this.success(await this.operations.options(user)); }

  @Get("medications") @RequirePermission("recetas", "read")
  async medications(@Query() query: ListMedicationsDto): Promise<PaginatedResponse<MedicationListItem>> { return this.paginated(await this.operations.listMedications(query)); }

  @Post("medications") @RequirePermission("recetas", "write")
  async createMedication(@Body() input: MedicationInputDto): Promise<ApiSuccess<MedicationListItem>> { return this.success(await this.operations.createMedication(input)); }

  @Patch("medications/:id") @RequirePermission("recetas", "write")
  async updateMedication(@Param("id", ParseIntPipe) id: number, @Body() input: MedicationInputDto): Promise<ApiSuccess<MedicationListItem>> { return this.success(await this.operations.updateMedication(id, input)); }

  @Patch("medications/:id/status") @RequirePermission("recetas", "write")
  async medicationStatus(@Param("id", ParseIntPipe) id: number, @Body() input: BooleanStatusInputDto): Promise<ApiSuccess<MedicationListItem>> { return this.success(await this.operations.setMedicationStatus(id, input.active)); }

  @Get("prescriptions") @RequirePermission("recetas", "read")
  async prescriptions(@Query() query: ListPrescriptionsDto, @CurrentUser() user: AuthUser): Promise<PaginatedResponse<PrescriptionListItem>> { return this.paginated(await this.operations.listPrescriptions(query, user)); }

  @Get("prescriptions/:id") @RequirePermission("recetas", "read")
  async prescription(@Param("id", ParseIntPipe) id: number, @CurrentUser() user: AuthUser): Promise<ApiSuccess<PrescriptionDetail>> { return this.success(await this.operations.prescriptionDetail(id, user)); }

  @Post("prescriptions") @RequirePermission("recetas", "write")
  async createPrescription(@Body() input: PrescriptionInputDto, @CurrentUser() user: AuthUser): Promise<ApiSuccess<PrescriptionDetail>> { return this.success(await this.operations.createPrescription(input, user)); }

  @Patch("prescriptions/:id/annul") @RequirePermission("recetas", "write")
  async annulPrescription(@Param("id", ParseIntPipe) id: number, @Body() input: PrescriptionAnnulDto, @CurrentUser() user: AuthUser): Promise<ApiSuccess<PrescriptionDetail>> { return this.success(await this.operations.annulPrescription(id, input.reason, user)); }

  @Get("procedures") @RequirePermission("recetas", "read")
  async procedures(@Query() query: ListProceduresDto, @CurrentUser() user: AuthUser): Promise<PaginatedResponse<ProcedureListItem>> { return this.paginated(await this.operations.listProcedures(query, user)); }

  @Post("procedures") @RequirePermission("recetas", "write")
  async createProcedure(@Body() input: ProcedureInputDto, @CurrentUser() user: AuthUser): Promise<ApiSuccess<ProcedureListItem>> { return this.success(await this.operations.createProcedure(input, user)); }

  @Patch("procedures/:id") @RequirePermission("recetas", "write")
  async updateProcedure(@Param("id", ParseIntPipe) id: number, @Body() input: ProcedureInputDto, @CurrentUser() user: AuthUser): Promise<ApiSuccess<ProcedureListItem>> { return this.success(await this.operations.updateProcedure(id, input, user)); }

  @Patch("procedures/:id/status") @RequirePermission("recetas", "write")
  async procedureStatus(@Param("id", ParseIntPipe) id: number, @Body() input: BooleanStatusInputDto, @CurrentUser() user: AuthUser): Promise<ApiSuccess<ProcedureListItem>> { return this.success(await this.operations.setProcedureStatus(id, input.active, user)); }

  private success<T>(data: T): ApiSuccess<T> { return { data, meta: { timestamp: new Date().toISOString() } }; }
  private paginated<T>(result: { items: T[]; pagination: PaginatedResponse<T>["pagination"] }): PaginatedResponse<T> { return { data: result.items, pagination: result.pagination, meta: { timestamp: new Date().toISOString() } }; }
}
