import { Injectable } from "@nestjs/common";
import type {
  ErpModuleCode,
  PermissionAction,
  RolePermission,
} from "@ami/contracts";
import { DatabaseService } from "../database/database.service";
import { isErpModuleCode, PERMISSION_FIELD } from "./authorization.constants";

@Injectable()
export class AuthorizationService {
  constructor(private readonly database: DatabaseService) {}

  async getRolePermissions(roleId: number): Promise<RolePermission[]> {
    const rows = await this.database.client.tb_permisos_rol.findMany({
      where: { id_rol: roleId },
      orderBy: { modulo: "asc" },
    });

    return rows.flatMap((permission) => {
      if (!isErpModuleCode(permission.modulo)) return [];
      return [{
        module: permission.modulo,
        canRead: permission.puede_leer,
        canWrite: permission.puede_escribir,
        canDelete: permission.puede_borrar,
      }];
    });
  }

  async hasPermission(
    roleId: number,
    module: ErpModuleCode,
    action: PermissionAction,
  ): Promise<boolean> {
    const permission = await this.database.client.tb_permisos_rol.findUnique({
      where: {
        id_rol_modulo: {
          id_rol: roleId,
          modulo: module,
        },
      },
    });

    return permission?.[PERMISSION_FIELD[action]] === true;
  }
}
