import { Type } from "class-transformer";
import { ArrayMinSize, ArrayUnique, IsArray, IsIn, IsInt, IsOptional, IsString, MaxLength, Min, MinLength } from "class-validator";
import type { LabOrderStatus } from "@ami/contracts";

export class LabTestInputDto {
  @IsString() @MinLength(2) @MaxLength(150)
  name!: string;

  @IsString() @MinLength(2) @MaxLength(100)
  category!: string;

  @IsOptional() @IsString() @MaxLength(255)
  referenceValues?: string;

  @IsOptional() @IsString() @MaxLength(50)
  unit?: string;
}

export class LabOrderInputDto {
  @Type(() => Number) @IsInt() @Min(1)
  patientId!: number;

  @IsOptional() @Type(() => Number) @IsInt() @Min(1)
  professionalId?: number | null;

  @IsOptional() @IsString() @MaxLength(10_000)
  observations?: string;

  @IsArray() @ArrayMinSize(1) @ArrayUnique()
  @Type(() => Number) @IsInt({ each: true }) @Min(1, { each: true })
  testIds!: number[];
}

export class LabResultInputDto {
  @IsString() @MinLength(1) @MaxLength(255)
  value!: string;

  @IsOptional() @IsString() @MaxLength(10_000)
  observations?: string;
}

export class LabOrderStatusInputDto {
  @IsIn(["procesando", "finalizado"])
  status!: Exclude<LabOrderStatus, "pendiente">;
}
