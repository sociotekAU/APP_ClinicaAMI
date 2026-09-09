import { HttpStatus, Injectable } from "@nestjs/common";
import type {
  AuthUser,
  DashboardMetric,
  ErpContext,
  ErpModuleCode,
  PaginatedData,
  PermissionListItem,
  PermissionOptions,
  RolePermissionConfiguration,
  RolePermission,
} from "@ami/contracts";
import { timingSafeEqual } from "node:crypto";
import { AuthorizationService } from "../authorization/authorization.service";
import {
  ERP_MODULE_CODES,
  ERP_NAVIGATION,
  PERMISSION_FIELD,
  isErpModuleCode,
} from "../authorization/authorization.constants";
import { AppException } from "../common/errors/app.exception";
import { createPageMeta, paginationOffset } from "../common/pagination/pagination";
import { DatabaseService } from "../database/database.service";
import type { ListPermissionsDto } from "./dto/list-permissions.dto";
import type { UpdateRolePermissionsDto } from "./dto/update-role-permissions.dto";
import { isAdministratorRole } from "../authorization/guards/admin-role.guard";

interface CountResult {
  total: bigint;
}

@Injectable()
export class ErpService {
  constructor(
    private readonly database: DatabaseService,
    private readonly authorization: AuthorizationService,
  ) {}

  async getContext(user: AuthUser): Promise<ErpContext> {
    const permissions = await this.authorization.getRolePermissions(user.role.id);
    const readableModules = new Set(
      permissions.filter((permission) => permission.canRead).map((permission) => permission.module),
    );

    if (readableModules.size === 0 && !isAdministratorRole(user.role.name)) {
      throw new AppException(
        "ERP_ACCESS_NOT_CONFIGURED",
        "Su rol no tiene módulos habilitados en el sistema.",
        HttpStatus.FORBIDDEN,
      );
    }

    const navigation = ERP_NAVIGATION.filter((item) => readableModules.has(item.module));
    const metrics = await this.getMetrics(permissions);

    return {
      user,
      permissions,
      navigation,
      metrics,
    };
  }

  async listPermissions(query: ListPermissionsDto): Promise<PaginatedData<PermissionListItem>> {
    const normalizedSearch = query.search?.trim();
    const effectiveCapability = query.capability ?? (query.writeAccess ? "write" : undefined);
    const capabilityAccess = query.capabilityAccess ?? query.writeAccess ?? "with";
    const capabilityField = effectiveCapability ? PERMISSION_FIELD[effectiveCapability] : undefined;
    const where = {
      modulo: query.module ?? { in: [...ERP_MODULE_CODES] },
      ...(capabilityField ? { [capabilityField]: capabilityAccess === "with" } : {}),
      ...(query.roleId ? { id_rol: query.roleId } : {}),
      ...(normalizedSearch
        ? {
            OR: [
              { modulo: { contains: normalizedSearch, mode: "insensitive" as const } },
              {
                tb_roles: {
                  nombre_rol: { contains: normalizedSearch, mode: "insensitive" as const },
                },
              },
            ],
          }
        : {}),
    };
    const orderBy = query.sortBy === "role"
      ? [
          { tb_roles: { nombre_rol: query.sortDirection } },
          { modulo: "asc" as const },
        ]
      : [
          { modulo: query.sortDirection },
          { id_rol: "asc" as const },
        ];

    const [rows, totalItems] = await Promise.all([
      this.database.client.tb_permisos_rol.findMany({
        where,
        include: { tb_roles: true },
        orderBy,
        skip: paginationOffset(query.page, query.pageSize),
        take: query.pageSize,
      }),
      this.database.client.tb_permisos_rol.count({ where }),
    ]);

    const moduleLabels = new Map(
      ERP_NAVIGATION.map((item) => [item.module, item.label] as const),
    );
    const items = rows.flatMap<PermissionListItem>((permission) => {
      const moduleLabel = moduleLabels.get(permission.modulo as ErpModuleCode);
      if (!moduleLabel) return [];
      return [{
        id: `${permission.id_rol}:${permission.modulo}`,
        role: {
          id: permission.tb_roles.id_rol,
          name: permission.tb_roles.nombre_rol,
        },
        module: permission.modulo as ErpModuleCode,
        moduleLabel,
        canRead: permission.puede_leer,
        canWrite: permission.puede_escribir,
        canDelete: permission.puede_borrar,
      }];
    });

    return {
      items,
      pagination: createPageMeta(query.page, query.pageSize, totalItems),
    };
  }

  async permissionOptions(user: AuthUser): Promise<PermissionOptions> {
    if (!isAdministratorRole(user.role.name)
      && !(await this.authorization.hasPermission(user.role.id, "seguridad", "read"))) {
      throw new AppException(
        "AUTH_FORBIDDEN",
        "Su rol no tiene permiso para consultar la configuración de accesos.",
        HttpStatus.FORBIDDEN,
      );
    }
    const roles = await this.database.client.tb_roles.findMany({ orderBy: { nombre_rol: "asc" } });
    return {
      modules: ERP_NAVIGATION.map((item) => ({ code: item.module, label: item.label })),
      roles: roles.map((role) => ({ id: role.id_rol, label: role.nombre_rol, active: role.estado })),
    };
  }

  async rolePermissionConfiguration(roleId: number): Promise<RolePermissionConfiguration> {
    const [role, permissions] = await Promise.all([
      this.database.client.tb_roles.findUnique({ where: { id_rol: roleId } }),
      this.database.client.tb_permisos_rol.findMany({ where: { id_rol: roleId } }),
    ]);
    if (!role) {
      throw new AppException("RESOURCE_NOT_FOUND", "El rol seleccionado no existe.", HttpStatus.NOT_FOUND);
    }
    const byModule = new Map(permissions.map((permission) => [permission.modulo, permission]));
    return {
      role: { id: role.id_rol, label: role.nombre_rol, active: role.estado },
      permissions: ERP_MODULE_CODES.map((module) => {
        const permission = byModule.get(module);
        return {
          module,
          canRead: permission?.puede_leer ?? false,
          canWrite: permission?.puede_escribir ?? false,
          canDelete: permission?.puede_borrar ?? false,
        };
      }),
    };
  }

  async updateRolePermissions(
    roleId: number,
    input: UpdateRolePermissionsDto,
  ): Promise<RolePermissionConfiguration> {
    this.verifyPermissionPin(input.validationPin);
    const modules = new Set(input.permissions.map((permission) => permission.module));
    if (modules.size !== input.permissions.length) {
      throw new AppException(
        "VALIDATION_ERROR",
        "Cada módulo debe aparecer una sola vez.",
        HttpStatus.BAD_REQUEST,
        [{ field: "permissions", message: "La lista contiene módulos repetidos." }],
      );
    }
    for (const permission of input.permissions) {
      if (!isErpModuleCode(permission.module)) {
        throw new AppException("VALIDATION_ERROR", "La lista contiene un módulo desconocido.", HttpStatus.BAD_REQUEST);
      }
      if (!permission.canRead && (permission.canWrite || permission.canDelete)) {
        throw new AppException(
          "VALIDATION_ERROR",
          "Los permisos de escritura y eliminación requieren permiso de lectura.",
          HttpStatus.BAD_REQUEST,
          [{ field: "permissions", message: `Revise el módulo ${permission.module}.` }],
        );
      }
    }
    const role = await this.database.client.tb_roles.findUnique({ where: { id_rol: roleId } });
    if (!role) {
      throw new AppException("RESOURCE_NOT_FOUND", "El rol seleccionado no existe.", HttpStatus.NOT_FOUND);
    }
    await this.database.client.$transaction(input.permissions.map((permission) =>
      this.database.client.tb_permisos_rol.upsert({
        where: { id_rol_modulo: { id_rol: roleId, modulo: permission.module } },
        create: {
          id_rol: roleId,
          modulo: permission.module,
          puede_leer: permission.canRead,
          puede_escribir: permission.canWrite,
          puede_borrar: permission.canDelete,
        },
        update: {
          puede_leer: permission.canRead,
          puede_escribir: permission.canWrite,
          puede_borrar: permission.canDelete,
        },
      }),
    ));
    return this.rolePermissionConfiguration(roleId);
  }

  private verifyPermissionPin(input: string): void {
    const configured = process.env.ADMIN_PERMISSION_PIN;
    if (!configured || !/^\d{6}$/.test(configured)) {
      throw new AppException(
        "ADMIN_PIN_NOT_CONFIGURED",
        "La clave de autorización administrativa no está configurada.",
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
    const inputBuffer = Buffer.from(input);
    const configuredBuffer = Buffer.from(configured);
    if (inputBuffer.length !== configuredBuffer.length || !timingSafeEqual(inputBuffer, configuredBuffer)) {
      throw new AppException(
        "AUTH_ADMIN_PIN_INVALID",
        "La clave numérica de autorización no es correcta.",
        HttpStatus.FORBIDDEN,
      );
    }
  }

  private async getMetrics(permissions: RolePermission[]): Promise<DashboardMetric[]> {
    const canRead = (module: ErpModuleCode) => permissions.some(
      (permission) => permission.module === module && permission.canRead,
    );
    const metricQueries: Array<Promise<DashboardMetric>> = [];

    if (canRead("pacientes")) {
      metricQueries.push(this.database.client.tb_pacientes.count({ where: { estado: true } })
        .then((value) => ({
          code: "active_patients" as const,
          label: "Pacientes activos",
          value,
          description: "Registros habilitados",
          module: "pacientes" as const,
        })));
    }

    if (canRead("agenda")) {
      metricQueries.push(this.countTodayAppointments().then((value) => ({
        code: "today_appointments" as const,
        label: "Citas de hoy",
        value,
        description: "Agenda del día",
        module: "agenda" as const,
      })));
      metricQueries.push(this.database.client.tb_medicos.count({ where: { estado: true } })
        .then((value) => ({
          code: "active_professionals" as const,
          label: "Profesionales activos",
          value,
          description: "Equipo disponible",
          module: "agenda" as const,
        })));
    }

    if (canRead("laboratorio")) {
      metricQueries.push(this.database.client.tb_ordenes_laboratorio.count({
        where: { estado: "pendiente" },
      }).then((value) => ({
        code: "pending_lab_orders" as const,
        label: "Órdenes pendientes",
        value,
        description: "Laboratorio por procesar",
        module: "laboratorio" as const,
      })));
    }

    if (canRead("inventario")) {
      metricQueries.push(this.countLowStockItems().then((value) => ({
        code: "low_stock_items" as const,
        label: "Existencias bajas",
        value,
        description: "Insumos en mínimo o menos",
        module: "inventario" as const,
      })));
    }

    if (canRead("facturacion")) {
      metricQueries.push(this.countTodayInvoices().then((value) => ({
        code: "today_invoices" as const,
        label: "Facturas de hoy",
        value,
        description: "Comprobantes emitidos",
        module: "facturacion" as const,
      })));
    }

    return Promise.all(metricQueries);
  }

  private async countTodayAppointments(): Promise<number> {
    const [result] = await this.database.client.$queryRaw<CountResult[]>`
      SELECT COUNT(*)::bigint AS total
      FROM tb_citas
      WHERE fecha_hora::date = (CURRENT_TIMESTAMP AT TIME ZONE 'America/Guatemala')::date
    `;
    return Number(result?.total ?? 0n);
  }

  private async countLowStockItems(): Promise<number> {
    const [result] = await this.database.client.$queryRaw<CountResult[]>`
      SELECT COUNT(*)::bigint AS total
      FROM tb_insumos_inventario
      WHERE estado = TRUE
        AND stock_actual <= stock_minimo
    `;
    return Number(result?.total ?? 0n);
  }

  private async countTodayInvoices(): Promise<number> {
    const [result] = await this.database.client.$queryRaw<CountResult[]>`
      SELECT COUNT(*)::bigint AS total
      FROM tb_facturas
      WHERE fecha_emision::date = (CURRENT_TIMESTAMP AT TIME ZONE 'America/Guatemala')::date
    `;
    return Number(result?.total ?? 0n);
  }
}
