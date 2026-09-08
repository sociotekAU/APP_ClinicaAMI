import { Type } from "class-transformer";
import { IsDateString, IsIn, IsInt, IsOptional, IsString, MaxLength, Min } from "class-validator";
import type { AppointmentStatus, RecordStatusFilter, SortDirection } from "@ami/contracts";
import { PaginationQueryDto } from "../../common/dto/pagination-query.dto";

export class CareListDto extends PaginationQueryDto {
  @IsOptional()
  @IsString({ message: "search debe ser texto." })
  @MaxLength(100, { message: "search no puede superar 100 caracteres." })
  search?: string;

  @IsOptional()
  @IsIn(["asc", "desc"], { message: "sortDirection debe ser asc o desc." })
  sortDirection: SortDirection = "asc";
}

export class ListPatientsDto extends CareListDto {
  @IsOptional()
  @IsIn(["all", "active", "inactive"], { message: "status debe ser all, active o inactive." })
  status: RecordStatusFilter = "all";

  @IsOptional()
  @IsIn(["lastName", "birthDate", "createdAt"], {
    message: "sortBy debe ser lastName, birthDate o createdAt.",
  })
  sortBy: "lastName" | "birthDate" | "createdAt" = "lastName";
}

export class ListAppointmentsDto extends CareListDto {
  @IsOptional()
  @IsIn(["all", "programada", "completada", "cancelada", "no_asistio"], {
    message: "status no corresponde a un estado de cita válido.",
  })
  status: AppointmentStatus | "all" = "all";

  @IsOptional()
  @IsDateString({}, { message: "dateFrom debe ser una fecha válida." })
  dateFrom?: string;

  @IsOptional()
  @IsDateString({}, { message: "dateTo debe ser una fecha válida." })
  dateTo?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: "professionalId debe ser un número entero." })
  @Min(1, { message: "professionalId debe ser mayor que cero." })
  professionalId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: "patientId debe ser un número entero." })
  @Min(1, { message: "patientId debe ser mayor que cero." })
  patientId?: number;

  @IsOptional()
  @IsIn(["scheduledAt", "patient", "professional"], {
    message: "sortBy debe ser scheduledAt, patient o professional.",
  })
  sortBy: "scheduledAt" | "patient" | "professional" = "scheduledAt";
}

export class ListClinicsDto extends CareListDto {
  @IsOptional()
  @IsIn(["all", "active", "inactive"], { message: "status debe ser all, active o inactive." })
  status: RecordStatusFilter = "all";

  @IsOptional()
  @IsIn(["number", "professional", "createdAt"], {
    message: "sortBy debe ser number, professional o createdAt.",
  })
  sortBy: "number" | "professional" | "createdAt" = "number";
}

export class ListClinicalRecordsDto extends CareListDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: "patientId debe ser un número entero." })
  @Min(1, { message: "patientId debe ser mayor que cero." })
  patientId?: number;

  @IsOptional()
  @IsIn(["recordedAt", "patient", "professional"], {
    message: "sortBy debe ser recordedAt, patient o professional.",
  })
  sortBy: "recordedAt" | "patient" | "professional" = "recordedAt";
}
