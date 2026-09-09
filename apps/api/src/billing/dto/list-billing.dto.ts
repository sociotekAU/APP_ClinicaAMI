import { IsDateString, IsIn, IsOptional, Matches } from "class-validator";
import type { InvoiceStatus } from "@ami/contracts";
import { CareListDto } from "../../care/dto/list-care.dto";

export class ListInvoicesDto extends CareListDto {
  @IsOptional() @IsIn(["all", "pagada", "anulada"])
  status: InvoiceStatus | "all" = "all";

  @IsOptional() @IsIn(["issuedAt", "patient", "total"])
  sortBy: "issuedAt" | "patient" | "total" = "issuedAt";
}

export class CashSummaryQueryDto {
  @IsOptional() @Matches(/^\d{4}-\d{2}-\d{2}$/) @IsDateString()
  date?: string;
}
