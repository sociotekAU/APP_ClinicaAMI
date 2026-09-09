import { Type } from "class-transformer";
import { ArrayMinSize, IsArray, IsIn, IsInt, IsNumber, IsOptional, IsString, MaxLength, Min, MinLength, ValidateNested } from "class-validator";
import type { InvoicePaymentMethod } from "@ami/contracts";

export class InvoiceLineInputDto {
  @IsString() @MinLength(2) @MaxLength(255)
  concept!: string;

  @Type(() => Number) @IsNumber({ maxDecimalPlaces: 2 }) @Min(0.01)
  quantity!: number;

  @Type(() => Number) @IsNumber({ maxDecimalPlaces: 2 }) @Min(0)
  unitPrice!: number;
}

export class InvoiceInputDto {
  @Type(() => Number) @IsInt() @Min(1)
  patientId!: number;

  @IsIn(["efectivo", "tarjeta", "transferencia"])
  paymentMethod!: InvoicePaymentMethod;

  @IsOptional() @IsString() @MaxLength(10_000)
  observations?: string;

  @IsArray() @ArrayMinSize(1)
  @ValidateNested({ each: true }) @Type(() => InvoiceLineInputDto)
  lines!: InvoiceLineInputDto[];
}

export class InvoiceAnnulDto {
  @IsString() @MinLength(5) @MaxLength(2000)
  reason!: string;
}
