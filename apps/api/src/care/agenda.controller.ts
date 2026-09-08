import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query, UseGuards } from "@nestjs/common";
import type { AgendaOptions, ApiSuccess, AppointmentListItem, AuthUser, ClinicListItem, PaginatedResponse } from "@ami/contracts";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { AccessTokenGuard } from "../auth/guards/access-token.guard";
import { RequirePermission } from "../authorization/decorators/require-permission.decorator";
import { PermissionGuard } from "../authorization/guards/permission.guard";
import { AgendaService } from "./agenda.service";
import { AppointmentInputDto, AppointmentStatusInputDto, BooleanStatusInputDto, ClinicInputDto } from "./dto/care-input.dto";
import { ListAppointmentsDto, ListClinicsDto } from "./dto/list-care.dto";

@Controller("agenda")
@UseGuards(AccessTokenGuard, PermissionGuard)
export class AgendaController {
  constructor(private readonly agenda: AgendaService) {}

  @Get("options")
  @RequirePermission("agenda", "read")
  async options(@CurrentUser() user: AuthUser): Promise<ApiSuccess<AgendaOptions>> {
    return this.success(await this.agenda.options(user));
  }

  @Get("appointments")
  @RequirePermission("agenda", "read")
  async appointments(@Query() query: ListAppointmentsDto, @CurrentUser() user: AuthUser): Promise<PaginatedResponse<AppointmentListItem>> {
    return this.paginated(await this.agenda.listAppointments(query, user));
  }

  @Post("appointments")
  @RequirePermission("agenda", "write")
  async createAppointment(@Body() input: AppointmentInputDto, @CurrentUser() user: AuthUser): Promise<ApiSuccess<AppointmentListItem>> {
    return this.success(await this.agenda.createAppointment(input, user));
  }

  @Patch("appointments/:id")
  @RequirePermission("agenda", "write")
  async updateAppointment(@Param("id", ParseIntPipe) id: number, @Body() input: AppointmentInputDto, @CurrentUser() user: AuthUser): Promise<ApiSuccess<AppointmentListItem>> {
    return this.success(await this.agenda.updateAppointment(id, input, user));
  }

  @Patch("appointments/:id/status")
  @RequirePermission("agenda", "write")
  async appointmentStatus(@Param("id", ParseIntPipe) id: number, @Body() input: AppointmentStatusInputDto, @CurrentUser() user: AuthUser): Promise<ApiSuccess<AppointmentListItem>> {
    return this.success(await this.agenda.setAppointmentStatus(id, input, user));
  }

  @Get("clinics")
  @RequirePermission("agenda", "read")
  async clinics(@Query() query: ListClinicsDto, @CurrentUser() user: AuthUser): Promise<PaginatedResponse<ClinicListItem>> {
    return this.paginated(await this.agenda.listClinics(query, user));
  }

  @Post("clinics")
  @RequirePermission("agenda", "write")
  async createClinic(@Body() input: ClinicInputDto, @CurrentUser() user: AuthUser): Promise<ApiSuccess<ClinicListItem>> {
    return this.success(await this.agenda.createClinic(input, user));
  }

  @Patch("clinics/:id")
  @RequirePermission("agenda", "write")
  async updateClinic(@Param("id", ParseIntPipe) id: number, @Body() input: ClinicInputDto, @CurrentUser() user: AuthUser): Promise<ApiSuccess<ClinicListItem>> {
    return this.success(await this.agenda.updateClinic(id, input, user));
  }

  @Patch("clinics/:id/status")
  @RequirePermission("agenda", "write")
  async clinicStatus(@Param("id", ParseIntPipe) id: number, @Body() input: BooleanStatusInputDto, @CurrentUser() user: AuthUser): Promise<ApiSuccess<ClinicListItem>> {
    return this.success(await this.agenda.setClinicStatus(id, input.active, user));
  }

  private success<T>(data: T): ApiSuccess<T> {
    return { data, meta: { timestamp: new Date().toISOString() } };
  }

  private paginated<T>(result: { items: T[]; pagination: PaginatedResponse<T>["pagination"] }): PaginatedResponse<T> {
    return { data: result.items, pagination: result.pagination, meta: { timestamp: new Date().toISOString() } };
  }
}
