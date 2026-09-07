import { HttpStatus, Injectable } from "@nestjs/common";
import type {
  AuthUser,
  DashboardMetric,
  ErpContext,
  ErpModuleCode,
  RolePermission,
} from "@ami/contracts";
import { AuthorizationService } from "../authorization/authorization.service";
import { ERP_NAVIGATION } from "../authorization/authorization.constants";
import { AppException } from "../common/errors/app.exception";
import { DatabaseService } from "../database/database.service";

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

    if (readableModules.size === 0) {
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
