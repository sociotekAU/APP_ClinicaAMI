import { IsIn, IsOptional, IsString, MaxLength } from "class-validator";
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
  @IsIn(["role", "module"], { message: "sortBy debe ser role o module." })
  sortBy: PermissionSortField = "role";

  @IsOptional()
  @IsIn(["asc", "desc"], { message: "sortDirection debe ser asc o desc." })
  sortDirection: SortDirection = "asc";
}
