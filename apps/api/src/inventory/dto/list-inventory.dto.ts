import { IsIn, IsOptional } from "class-validator";
import type { InventoryMovementType, RecordStatusFilter } from "@ami/contracts";
import { CareListDto } from "../../care/dto/list-care.dto";

export class ListSuppliersDto extends CareListDto {
  @IsOptional() @IsIn(["all", "active", "inactive"])
  status: RecordStatusFilter = "all";

  @IsOptional() @IsIn(["companyName", "createdAt"])
  sortBy: "companyName" | "createdAt" = "companyName";
}

export class ListInventoryItemsDto extends CareListDto {
  @IsOptional() @IsIn(["all", "active", "inactive", "low"])
  status: RecordStatusFilter | "low" = "all";

  @IsOptional() @IsIn(["name", "stock", "type", "createdAt"])
  sortBy: "name" | "stock" | "type" | "createdAt" = "name";
}

export class ListInventoryMovementsDto extends CareListDto {
  @IsOptional() @IsIn(["all", "entrada", "salida", "merma"])
  status: InventoryMovementType | "all" = "all";

  @IsOptional() @IsIn(["recordedAt", "item", "quantity"])
  sortBy: "recordedAt" | "item" | "quantity" = "recordedAt";
}
