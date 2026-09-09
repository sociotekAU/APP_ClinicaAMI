import { Type } from "class-transformer";
import { IsIn, IsInt, IsOptional, IsString, MaxLength, Min } from "class-validator";
import type {
  ErpModuleCode,
  PermissionAction,
  PermissionSortField,
  SortDirection,
} from "@ami/contracts";
import { ERP_MODULE_CODES } from "../../authorization/authorization.constants";
import { PaginationQueryDto } from "../../common/dto/pagination-query.dto";

export class ListPermissionsDto extends PaginationQueryDto {
  @IsOptional()
  @IsString({ message: "search debe ser texto." })
  @MaxLength(100, { message: "search no puede superar 100 caracteres." })
  search?: string;

  @IsOptional()
  @IsIn(ERP_MODULE_CODES, { message: "module no corresponde a un módulo ERP válido." })
  module?: ErpModuleCode;

  @IsOptional()
  @IsIn(["read", "write", "delete"], { message: "capability debe ser read, write o delete." })
  capability?: PermissionAction;

  @IsOptional()
  @IsIn(["with", "without"], { message: "capabilityAccess debe ser with o without." })
  capabilityAccess?: "with" | "without";

  @IsOptional()
  @IsIn(["with", "without"], { message: "writeAccess debe ser with o without." })
  writeAccess?: "with" | "without";

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: "roleId debe ser un número entero." })
  @Min(1, { message: "roleId debe ser mayor que cero." })
  roleId?: number;

  @IsOptional()
  @IsIn(["role", "module"], { message: "sortBy debe ser role o module." })
  sortBy: PermissionSortField = "role";

  @IsOptional()
  @IsIn(["asc", "desc"], { message: "sortDirection debe ser asc o desc." })
  sortDirection: SortDirection = "asc";
}
