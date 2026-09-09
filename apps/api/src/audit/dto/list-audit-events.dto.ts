import { Type } from "class-transformer";
import { IsDateString, IsIn, IsInt, IsOptional, IsString, MaxLength, Min } from "class-validator";
import type { AuditAction, SortDirection } from "@ami/contracts";
import { PaginationQueryDto } from "../../common/dto/pagination-query.dto";

export class ListAuditEventsDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;

  @IsOptional()
  @IsIn([
    "creacion", "modificacion", "cambio_estado", "desactivacion",
    "reactivacion", "anulacion", "cancelacion", "finalizacion",
    "eliminacion", "cambio_password", "sistema",
  ])
  action?: AuditAction;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  module?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  entity?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  userId?: number;

  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @IsOptional()
  @IsIn(["occurredAt", "user", "action"])
  sortBy: "occurredAt" | "user" | "action" = "occurredAt";

  @IsOptional()
  @IsIn(["asc", "desc"])
  sortDirection: SortDirection = "desc";
}
