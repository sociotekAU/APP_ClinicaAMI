import { Type } from "class-transformer";
import { IsIn, IsInt, IsOptional, IsString, MaxLength, Min } from "class-validator";
import type { RecordStatusFilter, SortDirection } from "@ami/contracts";
import { PaginationQueryDto } from "../../common/dto/pagination-query.dto";

export class AdministrationListDto extends PaginationQueryDto {
  @IsOptional()
  @IsString({ message: "search debe ser texto." })
  @MaxLength(100, { message: "search no puede superar 100 caracteres." })
  search?: string;

  @IsOptional()
  @IsIn(["all", "active", "inactive"], {
    message: "status debe ser all, active o inactive.",
  })
  status: RecordStatusFilter = "all";

  @IsOptional()
  @IsIn(["asc", "desc"], { message: "sortDirection debe ser asc o desc." })
  sortDirection: SortDirection = "asc";
}

export class ListSpecialtiesDto extends AdministrationListDto {
  @IsOptional()
  @IsIn(["name", "createdAt"], { message: "sortBy debe ser name o createdAt." })
  sortBy: "name" | "createdAt" = "name";
}

export class ListServicesDto extends AdministrationListDto {
  @IsOptional()
  @IsIn(["name", "price", "createdAt"], {
    message: "sortBy debe ser name, price o createdAt.",
  })
  sortBy: "name" | "price" | "createdAt" = "name";
}

export class ListProfessionalsDto extends AdministrationListDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: "specialtyId debe ser un número entero." })
  @Min(1, { message: "specialtyId debe ser mayor que cero." })
  specialtyId?: number;

  @IsOptional()
  @IsIn(["name", "specialty", "createdAt"], {
    message: "sortBy debe ser name, specialty o createdAt.",
  })
  sortBy: "name" | "specialty" | "createdAt" = "name";
}

export class ListUsersDto extends AdministrationListDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: "roleId debe ser un número entero." })
  @Min(1, { message: "roleId debe ser mayor que cero." })
  roleId?: number;

  @IsOptional()
  @IsIn(["username", "name", "role", "lastAccess"], {
    message: "sortBy debe ser username, name, role o lastAccess.",
  })
  sortBy: "username" | "name" | "role" | "lastAccess" = "username";
}
