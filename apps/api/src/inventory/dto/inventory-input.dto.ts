import { Type } from "class-transformer";
import { IsEmail, IsIn, IsInt, IsNumber, IsOptional, IsString, MaxLength, Min, MinLength } from "class-validator";
import type { InventoryItemType, InventoryMovementType } from "@ami/contracts";

export class SupplierInputDto {
  @IsString() @MinLength(2) @MaxLength(150)
  companyName!: string;

  @IsOptional() @IsString() @MaxLength(150)
  contact?: string;

  @IsString() @MinLength(4) @MaxLength(20)
  phone!: string;

  @IsOptional() @IsEmail() @MaxLength(150)
  email?: string;

  @IsOptional() @IsString() @MaxLength(10_000)
  address?: string;
}

export class InventoryItemInputDto {
  @IsString() @MinLength(2) @MaxLength(150)
  name!: string;

  @IsIn(["medicamento", "reactivo_laboratorio", "material_clinico"])
  type!: InventoryItemType;

  @IsOptional() @Type(() => Number) @IsInt() @Min(1)
  supplierId?: number | null;

  @IsOptional() @Type(() => Number) @IsInt() @Min(1)
  medicationId?: number | null;

  @Type(() => Number) @IsNumber({ maxDecimalPlaces: 2 }) @Min(0)
  minimumStock!: number;

  @Type(() => Number) @IsNumber({ maxDecimalPlaces: 2 }) @Min(0)
  costPrice!: number;

  @IsString() @MinLength(1) @MaxLength(30)
  unit!: string;
}

export class InventoryMovementInputDto {
  @Type(() => Number) @IsInt() @Min(1)
  itemId!: number;

  @IsIn(["entrada", "salida", "merma"])
  type!: InventoryMovementType;

  @Type(() => Number) @IsNumber({ maxDecimalPlaces: 2 }) @Min(0.01)
  quantity!: number;

  @IsOptional() @IsString() @MaxLength(10_000)
  observations?: string;
}
