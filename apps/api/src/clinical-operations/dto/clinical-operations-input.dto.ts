import { Type } from "class-transformer";
import { ArrayMinSize, ArrayUnique, IsArray, IsInt, IsOptional, IsString, MaxLength, Min, MinLength, ValidateNested } from "class-validator";

export class MedicationInputDto {
  @IsString() @MinLength(2) @MaxLength(150)
  commercialName!: string;

  @IsString() @MinLength(2) @MaxLength(150)
  activeIngredient!: string;

  @IsString() @MinLength(2) @MaxLength(50)
  presentation!: string;

  @IsString() @MinLength(1) @MaxLength(50)
  concentration!: string;
}

export class PrescriptionLineDto {
  @Type(() => Number) @IsInt() @Min(1)
  medicationId!: number;

  @IsString() @MinLength(2) @MaxLength(100)
  dose!: string;

  @Type(() => Number) @IsInt() @Min(1)
  durationDays!: number;
}

export class PrescriptionInputDto {
  @Type(() => Number) @IsInt() @Min(1)
  patientId!: number;

  @Type(() => Number) @IsInt() @Min(1)
  professionalId!: number;

  @IsString() @MinLength(3) @MaxLength(10_000)
  diagnosis!: string;

  @IsArray() @ArrayMinSize(1) @ArrayUnique((line: PrescriptionLineDto) => line.medicationId)
  @ValidateNested({ each: true }) @Type(() => PrescriptionLineDto)
  items!: PrescriptionLineDto[];
}

export class PrescriptionAnnulDto {
  @IsString() @MinLength(5) @MaxLength(2000)
  reason!: string;
}

export class ProcedureInputDto {
  @Type(() => Number) @IsInt() @Min(1)
  clinicalRecordId!: number;

  @Type(() => Number) @IsInt() @Min(1)
  serviceId!: number;

  @IsOptional() @IsString() @MaxLength(10_000)
  observations?: string;
}
