import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import type {
  AdministrationOptions,
  ApiSuccess,
  AuthUser,
  PaginatedResponse,
  ProfessionalListItem,
  ServiceListItem,
  SpecialtyListItem,
  UserListItem,
} from "@ami/contracts";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { AccessTokenGuard } from "../auth/guards/access-token.guard";
import { RequirePermission } from "../authorization/decorators/require-permission.decorator";
import { PermissionGuard } from "../authorization/guards/permission.guard";
import { AdministrationService } from "./administration.service";
import {
  ListProfessionalsDto,
  ListServicesDto,
  ListSpecialtiesDto,
  ListUsersDto,
} from "./dto/list-resources.dto";
import {
  ProfessionalInputDto,
  ServiceInputDto,
  SpecialtyInputDto,
  StatusInputDto,
  UserCreateInputDto,
  UserUpdateInputDto,
} from "./dto/resource-input.dto";

@Controller("administration")
@UseGuards(AccessTokenGuard, PermissionGuard)
export class AdministrationController {
  constructor(private readonly administration: AdministrationService) {}

  @Get("options")
  @RequirePermission("seguridad", "read")
  async options(): Promise<ApiSuccess<AdministrationOptions>> {
    return this.success(await this.administration.getOptions());
  }

  @Get("specialties")
  @RequirePermission("seguridad", "read")
  async specialties(
    @Query() query: ListSpecialtiesDto,
  ): Promise<PaginatedResponse<SpecialtyListItem>> {
    return this.paginated(await this.administration.listSpecialties(query));
  }

  @Post("specialties")
  @RequirePermission("seguridad", "write")
  async createSpecialty(@Body() input: SpecialtyInputDto): Promise<ApiSuccess<SpecialtyListItem>> {
    return this.success(await this.administration.createSpecialty(input));
  }

  @Patch("specialties/:id")
  @RequirePermission("seguridad", "write")
  async updateSpecialty(
    @Param("id", ParseIntPipe) id: number,
    @Body() input: SpecialtyInputDto,
  ): Promise<ApiSuccess<SpecialtyListItem>> {
    return this.success(await this.administration.updateSpecialty(id, input));
  }

  @Patch("specialties/:id/status")
  @RequirePermission("seguridad", "write")
  async specialtyStatus(
    @Param("id", ParseIntPipe) id: number,
    @Body() input: StatusInputDto,
  ): Promise<ApiSuccess<SpecialtyListItem>> {
    return this.success(await this.administration.setSpecialtyStatus(id, input.active));
  }

  @Get("services")
  @RequirePermission("seguridad", "read")
  async services(@Query() query: ListServicesDto): Promise<PaginatedResponse<ServiceListItem>> {
    return this.paginated(await this.administration.listServices(query));
  }

  @Post("services")
  @RequirePermission("seguridad", "write")
  async createService(@Body() input: ServiceInputDto): Promise<ApiSuccess<ServiceListItem>> {
    return this.success(await this.administration.createService(input));
  }

  @Patch("services/:id")
  @RequirePermission("seguridad", "write")
  async updateService(
    @Param("id", ParseIntPipe) id: number,
    @Body() input: ServiceInputDto,
  ): Promise<ApiSuccess<ServiceListItem>> {
    return this.success(await this.administration.updateService(id, input));
  }

  @Patch("services/:id/status")
  @RequirePermission("seguridad", "write")
  async serviceStatus(
    @Param("id", ParseIntPipe) id: number,
    @Body() input: StatusInputDto,
  ): Promise<ApiSuccess<ServiceListItem>> {
    return this.success(await this.administration.setServiceStatus(id, input.active));
  }

  @Get("professionals")
  @RequirePermission("seguridad", "read")
  async professionals(
    @Query() query: ListProfessionalsDto,
  ): Promise<PaginatedResponse<ProfessionalListItem>> {
    return this.paginated(await this.administration.listProfessionals(query));
  }

  @Post("professionals")
  @RequirePermission("seguridad", "write")
  async createProfessional(
    @Body() input: ProfessionalInputDto,
  ): Promise<ApiSuccess<ProfessionalListItem>> {
    return this.success(await this.administration.createProfessional(input));
  }

  @Patch("professionals/:id")
  @RequirePermission("seguridad", "write")
  async updateProfessional(
    @Param("id", ParseIntPipe) id: number,
    @Body() input: ProfessionalInputDto,
  ): Promise<ApiSuccess<ProfessionalListItem>> {
    return this.success(await this.administration.updateProfessional(id, input));
  }

  @Patch("professionals/:id/status")
  @RequirePermission("seguridad", "write")
  async professionalStatus(
    @Param("id", ParseIntPipe) id: number,
    @Body() input: StatusInputDto,
  ): Promise<ApiSuccess<ProfessionalListItem>> {
    return this.success(await this.administration.setProfessionalStatus(id, input.active));
  }

  @Get("users")
  @RequirePermission("seguridad", "read")
  async users(@Query() query: ListUsersDto): Promise<PaginatedResponse<UserListItem>> {
    return this.paginated(await this.administration.listUsers(query));
  }

  @Post("users")
  @RequirePermission("seguridad", "write")
  async createUser(@Body() input: UserCreateInputDto): Promise<ApiSuccess<UserListItem>> {
    return this.success(await this.administration.createUser(input));
  }

  @Patch("users/:id")
  @RequirePermission("seguridad", "write")
  async updateUser(
    @Param("id", ParseIntPipe) id: number,
    @Body() input: UserUpdateInputDto,
  ): Promise<ApiSuccess<UserListItem>> {
    return this.success(await this.administration.updateUser(id, input));
  }

  @Patch("users/:id/status")
  @RequirePermission("seguridad", "write")
  async userStatus(
    @Param("id", ParseIntPipe) id: number,
    @Body() input: StatusInputDto,
    @CurrentUser() user: AuthUser,
  ): Promise<ApiSuccess<UserListItem>> {
    return this.success(await this.administration.setUserStatus(id, input.active, user.id));
  }

  private success<T>(data: T): ApiSuccess<T> {
    return { data, meta: { timestamp: new Date().toISOString() } };
  }

  private paginated<T>(result: { items: T[]; pagination: PaginatedResponse<T>["pagination"] }): PaginatedResponse<T> {
    return {
      data: result.items,
      pagination: result.pagination,
      meta: { timestamp: new Date().toISOString() },
    };
  }
}
