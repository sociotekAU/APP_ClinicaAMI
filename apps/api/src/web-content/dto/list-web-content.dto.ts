import { IsIn, IsOptional, IsString, MaxLength } from "class-validator";
import type { RecordStatusFilter, SortDirection } from "@ami/contracts";
import { PaginationQueryDto } from "../../common/dto/pagination-query.dto";

export class WebContentListDto extends PaginationQueryDto {
  @IsOptional()
  @IsString({ message: "search debe ser texto." })
  @MaxLength(100, { message: "search no puede superar 100 caracteres." })
  search?: string;

  @IsOptional()
  @IsIn(["all", "active", "inactive"], { message: "status debe ser all, active o inactive." })
  status: RecordStatusFilter = "all";

  @IsOptional()
  @IsIn(["asc", "desc"], { message: "sortDirection debe ser asc o desc." })
  sortDirection: SortDirection = "asc";
}

export class ListWebServicesDto extends WebContentListDto {
  @IsOptional()
  @IsIn(["name", "order"], { message: "sortBy debe ser name u order." })
  sortBy: "name" | "order" = "order";
}

export class ListWebProfessionalsDto extends WebContentListDto {
  @IsOptional()
  @IsIn(["name", "specialty", "order"], { message: "sortBy debe ser name, specialty u order." })
  sortBy: "name" | "specialty" | "order" = "order";
}

export class ListGalleryDto extends WebContentListDto {
  @IsOptional()
  @IsIn(["title", "order", "createdAt"], { message: "sortBy debe ser title, order o createdAt." })
  sortBy: "title" | "order" | "createdAt" = "order";
}

export class ListPromotionsDto extends WebContentListDto {
  @IsOptional()
  @IsIn(["title", "startDate", "endDate", "createdAt"], {
    message: "sortBy debe ser title, startDate, endDate o createdAt.",
  })
  sortBy: "title" | "startDate" | "endDate" | "createdAt" = "startDate";
}

export class ListStylesDto extends WebContentListDto {
  @IsOptional()
  @IsIn(["name", "position", "createdAt"], { message: "sortBy debe ser name, position o createdAt." })
  sortBy: "name" | "position" | "createdAt" = "name";
}

export class ListAnnouncementsDto extends WebContentListDto {
  @IsOptional()
  @IsIn(["title", "startDate", "endDate", "createdAt"], {
    message: "sortBy debe ser title, startDate, endDate o createdAt.",
  })
  sortBy: "title" | "startDate" | "endDate" | "createdAt" = "startDate";
}
