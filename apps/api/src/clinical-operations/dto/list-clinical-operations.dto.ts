import { IsIn, IsOptional } from "class-validator";
import type { PrescriptionStatus, RecordStatusFilter } from "@ami/contracts";
import { CareListDto } from "../../care/dto/list-care.dto";

export class ListMedicationsDto extends CareListDto {
  @IsOptional()
  @IsIn(["all", "active", "inactive"])
  status: RecordStatusFilter = "all";

  @IsOptional()
  @IsIn(["commercialName", "activeIngredient", "createdAt"])
  sortBy: "commercialName" | "activeIngredient" | "createdAt" = "commercialName";
}

export class ListPrescriptionsDto extends CareListDto {
  @IsOptional()
  @IsIn(["all", "emitida", "anulada"])
  status: PrescriptionStatus | "all" = "all";

  @IsOptional()
  @IsIn(["issuedAt", "patient", "professional"])
  sortBy: "issuedAt" | "patient" | "professional" = "issuedAt";
}

export class ListProceduresDto extends CareListDto {
  @IsOptional()
  @IsIn(["all", "active", "inactive"])
  status: RecordStatusFilter = "all";

  @IsOptional()
  @IsIn(["recordedAt", "patient", "service"])
  sortBy: "recordedAt" | "patient" | "service" = "recordedAt";
}
