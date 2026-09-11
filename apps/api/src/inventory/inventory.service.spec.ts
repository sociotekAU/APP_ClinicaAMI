import type { AuthUser } from "@ami/contracts";
import { describe, expect, it, vi } from "vitest";
import type { DatabaseService } from "../database/database.service";
import { InventoryService } from "./inventory.service";

const user: AuthUser = { id: 4, username: "bodega", name: "Encargado", role: { id: 1, name: "Administrador" }, mustChangePassword: false };

describe("InventoryService", () => {
  it("exige un medicamento activo para insumos de farmacia", async () => {
    const create = vi.fn();
    const database = { client: {
      tb_proveedores: { findUnique: vi.fn() },
      tb_medicamentos: { findUnique: vi.fn().mockResolvedValue({ estado: false }) },
      tb_insumos_inventario: { create },
    } } as unknown as DatabaseService;
    const service = new InventoryService(database);
    await expect(service.createItem({ name: "Medicamento", type: "medicamento", medicationId: 8, minimumStock: 2, costPrice: 5, unit: "caja" })).rejects.toMatchObject({ code: "RESOURCE_CONFLICT" });
    expect(create).not.toHaveBeenCalled();
  });

  it("impide una salida mayor que la existencia", async () => {
    const create = vi.fn();
    const database = { client: { tb_insumos_inventario: { findUnique: vi.fn().mockResolvedValue({ estado: true, stock_actual: 3 }) }, tb_movimientos_inventario: { create } } } as unknown as DatabaseService;
    const service = new InventoryService(database);
    await expect(service.createMovement({ itemId: 1, type: "salida", quantity: 4 }, user)).rejects.toMatchObject({ code: "RESOURCE_CONFLICT" });
    expect(create).not.toHaveBeenCalled();
  });

  it("devuelve existencias anterior y resultante del movimiento", async () => {
    const database = { client: {
      tb_insumos_inventario: { findUnique: vi.fn().mockResolvedValue({ estado: true, stock_actual: 10 }) },
      tb_movimientos_inventario: { create: vi.fn().mockResolvedValue({ id_movimiento: 5, tipo_movimiento: "salida", cantidad: 3, fecha: new Date("2026-09-09T15:00:00.000Z"), observaciones: "Consumo", stock_anterior: 10, stock_resultante: 7, tb_insumos_inventario: { id_insumo: 1, nombre: "Guantes", unidad_medida: "caja" }, tb_usuarios: { id_usuario: 4, nombre: "Encargado", username: "bodega" } }) },
    } } as unknown as DatabaseService;
    const service = new InventoryService(database);
    await expect(service.createMovement({ itemId: 1, type: "salida", quantity: 3, observations: "Consumo" }, user)).resolves.toMatchObject({ previousStock: 10, resultingStock: 7, quantity: 3 });
  });

  it("filtra únicamente insumos activos con existencia baja", async () => {
    const findMany = vi.fn().mockResolvedValue([]);
    const database = { client: { tb_insumos_inventario: { findMany, count: vi.fn().mockResolvedValue(0) } } } as unknown as DatabaseService;
    const service = new InventoryService(database);
    await service.listItems({ page: 1, pageSize: 10, status: "low", sortBy: "stock", sortDirection: "asc" });
    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ estado: true, stock_bajo: true }), orderBy: expect.arrayContaining([{ stock_actual: "asc" }]) }));
  });

  it("publica únicamente datos seguros de insumos activos", async () => {
    const findMany = vi.fn().mockResolvedValue([
      {
        id_insumo: 7,
        nombre: "Vitamina C",
        tipo: "medicamento",
        stock_actual: 3,
        stock_minimo: 5,
        stock_bajo: true,
        unidad_medida: "frasco",
        tb_medicamentos: { nombre_comercial: "Ácido ascórbico" },
      },
    ]);
    const database = { client: { tb_insumos_inventario: { findMany } } } as unknown as DatabaseService;
    const service = new InventoryService(database);

    const products = await service.listPublicItems();

    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { estado: true } }));
    expect(products).toEqual([{ id: 7, name: "Vitamina C", type: "medicamento", unit: "frasco", availability: "limited", medicationName: "Ácido ascórbico" }]);
    expect(products[0]).not.toHaveProperty("supplier");
    expect(products[0]).not.toHaveProperty("costPrice");
    expect(products[0]).not.toHaveProperty("currentStock");
  });
});
