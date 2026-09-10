import { IsIn, IsOptional } from "class-validator";
import type { ConsentStatus, RecordStatusFilter } from "@ami/contracts";
import { CareListDto } from "../../care/dto/list-care.dto";

export class ListStudyFilesDto extends CareListDto {
  @IsOptional() @IsIn(["all", "active", "inactive"])
  status: RecordStatusFilter = "all";

  @IsOptional() @IsIn(["uploadedAt", "patient", "studyType"])
  sortBy: "uploadedAt" | "patient" | "studyType" = "uploadedAt";
}

export class ListConsentsDto extends CareListDto {
  @IsOptional() @IsIn(["all", "pendiente", "firmado", "rechazado", "revocado"])
  status: ConsentStatus | "all" = "all";

  @IsOptional() @IsIn(["createdAt", "patient", "service"])
  sortBy: "createdAt" | "patient" | "service" = "createdAt";
}
