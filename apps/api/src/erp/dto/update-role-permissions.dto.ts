import { Type } from "class-transformer";
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsIn,
  Matches,
  ValidateNested,
} from "class-validator";
import type { ErpModuleCode } from "@ami/contracts";
import { ERP_MODULE_CODES } from "../../authorization/authorization.constants";

export class RolePermissionInputDto {
  @IsIn(ERP_MODULE_CODES, { message: "module no corresponde a un módulo ERP válido." })
  module!: ErpModuleCode;

  @IsBoolean({ message: "canRead debe ser verdadero o falso." })
  canRead!: boolean;

  @IsBoolean({ message: "canWrite debe ser verdadero o falso." })
  canWrite!: boolean;

  @IsBoolean({ message: "canDelete debe ser verdadero o falso." })
  canDelete!: boolean;
}

export class UpdateRolePermissionsDto {
  @IsArray({ message: "permissions debe ser una lista." })
  @ArrayMinSize(1, { message: "permissions debe incluir al menos un módulo." })
  @ArrayMaxSize(ERP_MODULE_CODES.length, { message: "permissions contiene demasiados módulos." })
  @ValidateNested({ each: true })
  @Type(() => RolePermissionInputDto)
  permissions!: RolePermissionInputDto[];

  @Matches(/^\d{6}$/, { message: "validationPin debe contener exactamente 6 dígitos." })
  validationPin!: string;
}
