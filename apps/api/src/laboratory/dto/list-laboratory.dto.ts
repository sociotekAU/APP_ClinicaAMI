import { IsIn, IsOptional } from "class-validator";
import type { LabOrderStatus, RecordStatusFilter } from "@ami/contracts";
import { CareListDto } from "../../care/dto/list-care.dto";

export class ListLabTestsDto extends CareListDto {
  @IsOptional() @IsIn(["all", "active", "inactive"])
  status: RecordStatusFilter = "all";

  @IsOptional() @IsIn(["name", "category", "createdAt"])
  sortBy: "name" | "category" | "createdAt" = "name";
}

export class ListLabOrdersDto extends CareListDto {
  @IsOptional() @IsIn(["all", "pendiente", "procesando", "finalizado"])
  status: LabOrderStatus | "all" = "all";

  @IsOptional() @IsIn(["orderedAt", "patient", "professional"])
  sortBy: "orderedAt" | "patient" | "professional" = "orderedAt";
}
