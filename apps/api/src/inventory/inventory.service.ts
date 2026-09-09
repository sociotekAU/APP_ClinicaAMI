import { HttpStatus, Injectable } from "@nestjs/common";
import type { AuthUser, InventoryItemListItem, InventoryMovementListItem, InventoryOptions, PaginatedData, SupplierListItem } from "@ami/contracts";
import { AppException } from "../common/errors/app.exception";
import { createPageMeta, paginationOffset } from "../common/pagination/pagination";
import { DatabaseService } from "../database/database.service";
import type { InventoryItemInputDto, InventoryMovementInputDto, SupplierInputDto } from "./dto/inventory-input.dto";
import type { ListInventoryItemsDto, ListInventoryMovementsDto, ListSuppliersDto } from "./dto/list-inventory.dto";

const ITEM_INCLUDE = {
  tb_proveedores: true,
  tb_medicamentos: true,
  _count: { select: { tb_movimientos_inventario: true } },
};

const MOVEMENT_INCLUDE = {
  tb_insumos_inventario: true,
  tb_usuarios: true,
};

function optionalText(value: string | undefined): string | null {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

@Injectable()
export class InventoryService {
  constructor(private readonly database: DatabaseService) {}

  async options(): Promise<InventoryOptions> {
    const [suppliers, medications, items] = await Promise.all([
      this.database.client.tb_proveedores.findMany({ orderBy: { nombre_empresa: "asc" } }),
      this.database.client.tb_medicamentos.findMany({ orderBy: { nombre_comercial: "asc" } }),
      this.database.client.tb_insumos_inventario.findMany({ orderBy: { nombre: "asc" } }),
    ]);
    return {
      suppliers: suppliers.map((row) => ({ id: row.id_proveedor, label: row.nombre_empresa, active: row.estado })),
      medications: medications.map((row) => ({ id: row.id_medicamento, label: `${row.nombre_comercial} · ${row.concentracion}`, active: row.estado })),
      items: items.map((row) => ({ id: row.id_insumo, label: row.nombre, active: row.estado, currentStock: Number(row.stock_actual), unit: row.unidad_medida })),
    };
  }

  async listSuppliers(query: ListSuppliersDto): Promise<PaginatedData<SupplierListItem>> {
    const search = query.search?.trim();
    const where = {
      ...(query.status === "all" ? {} : { estado: query.status === "active" }),
      ...(search ? { OR: [
        { nombre_empresa: { contains: search, mode: "insensitive" as const } },
        { contacto: { contains: search, mode: "insensitive" as const } },
        { telefono: { contains: search, mode: "insensitive" as const } },
        { correo: { contains: search, mode: "insensitive" as const } },
      ] } : {}),
    };
    const primaryOrder = query.sortBy === "createdAt" ? { fecha_creacion: query.sortDirection } : { nombre_empresa: query.sortDirection };
    const [rows, totalItems] = await Promise.all([
      this.database.client.tb_proveedores.findMany({ where, include: { _count: { select: { tb_insumos_inventario: true } } }, orderBy: [primaryOrder, { id_proveedor: "asc" }], skip: paginationOffset(query.page, query.pageSize), take: query.pageSize }),
      this.database.client.tb_proveedores.count({ where }),
    ]);
    return { items: rows.map((row) => this.toSupplier(row)), pagination: createPageMeta(query.page, query.pageSize, totalItems) };
  }

  async createSupplier(input: SupplierInputDto): Promise<SupplierListItem> {
    const row = await this.database.client.tb_proveedores.create({ data: this.supplierData(input), include: { _count: { select: { tb_insumos_inventario: true } } } });
    return this.toSupplier(row);
  }

  async updateSupplier(id: number, input: SupplierInputDto): Promise<SupplierListItem> {
    const row = await this.database.client.tb_proveedores.update({ where: { id_proveedor: id }, data: this.supplierData(input), include: { _count: { select: { tb_insumos_inventario: true } } } });
    return this.toSupplier(row);
  }

  async setSupplierStatus(id: number, active: boolean): Promise<SupplierListItem> {
    const row = await this.database.client.tb_proveedores.update({ where: { id_proveedor: id }, data: { estado: active }, include: { _count: { select: { tb_insumos_inventario: true } } } });
    return this.toSupplier(row);
  }

  async listItems(query: ListInventoryItemsDto): Promise<PaginatedData<InventoryItemListItem>> {
    const search = query.search?.trim();
    const where = {
      ...(query.status === "active" ? { estado: true } : query.status === "inactive" ? { estado: false } : query.status === "low" ? { estado: true, stock_bajo: true } : {}),
      ...(search ? { OR: [
        { nombre: { contains: search, mode: "insensitive" as const } },
        { tipo: { contains: search, mode: "insensitive" as const } },
        { unidad_medida: { contains: search, mode: "insensitive" as const } },
        { tb_proveedores: { nombre_empresa: { contains: search, mode: "insensitive" as const } } },
        { tb_medicamentos: { nombre_comercial: { contains: search, mode: "insensitive" as const } } },
      ] } : {}),
    };
    const primaryOrder = query.sortBy === "stock"
      ? { stock_actual: query.sortDirection }
      : query.sortBy === "type"
        ? { tipo: query.sortDirection }
        : query.sortBy === "createdAt"
          ? { fecha_creacion: query.sortDirection }
          : { nombre: query.sortDirection };
    const [rows, totalItems] = await Promise.all([
      this.database.client.tb_insumos_inventario.findMany({ where, include: ITEM_INCLUDE, orderBy: [primaryOrder, { id_insumo: "asc" }], skip: paginationOffset(query.page, query.pageSize), take: query.pageSize }),
      this.database.client.tb_insumos_inventario.count({ where }),
    ]);
    return { items: rows.map((row) => this.toItem(row)), pagination: createPageMeta(query.page, query.pageSize, totalItems) };
  }

  async createItem(input: InventoryItemInputDto): Promise<InventoryItemListItem> {
    await this.validateItemRelations(input);
    const row = await this.database.client.tb_insumos_inventario.create({ data: this.itemData(input), include: ITEM_INCLUDE });
    return this.toItem(row);
  }

  async updateItem(id: number, input: InventoryItemInputDto): Promise<InventoryItemListItem> {
    await this.validateItemRelations(input);
    const row = await this.database.client.tb_insumos_inventario.update({ where: { id_insumo: id }, data: this.itemData(input), include: ITEM_INCLUDE });
    return this.toItem(row);
  }

  async setItemStatus(id: number, active: boolean): Promise<InventoryItemListItem> {
    const current = await this.database.client.tb_insumos_inventario.findUnique({ where: { id_insumo: id } });
    if (!current) this.notFound("El insumo solicitado no existe.");
    if (active) await this.validateItemRelations({
      name: current.nombre,
      type: current.tipo as InventoryItemInputDto["type"],
      supplierId: current.id_proveedor,
      medicationId: current.id_medicamento,
      minimumStock: Number(current.stock_minimo),
      costPrice: Number(current.precio_costo),
      unit: current.unidad_medida,
    });
    const row = await this.database.client.tb_insumos_inventario.update({ where: { id_insumo: id }, data: { estado: active }, include: ITEM_INCLUDE });
    return this.toItem(row);
  }

  async listMovements(query: ListInventoryMovementsDto): Promise<PaginatedData<InventoryMovementListItem>> {
    const search = query.search?.trim();
    const where = {
      ...(query.status === "all" ? {} : { tipo_movimiento: query.status }),
      ...(search ? { OR: [
        { observaciones: { contains: search, mode: "insensitive" as const } },
        { tb_insumos_inventario: { nombre: { contains: search, mode: "insensitive" as const } } },
        { tb_usuarios: { nombre: { contains: search, mode: "insensitive" as const } } },
      ] } : {}),
    };
    const primaryOrder = query.sortBy === "item"
      ? { tb_insumos_inventario: { nombre: query.sortDirection } }
      : query.sortBy === "quantity"
        ? { cantidad: query.sortDirection }
        : { fecha: query.sortDirection };
    const [rows, totalItems] = await Promise.all([
      this.database.client.tb_movimientos_inventario.findMany({ where, include: MOVEMENT_INCLUDE, orderBy: [primaryOrder, { id_movimiento: "desc" }], skip: paginationOffset(query.page, query.pageSize), take: query.pageSize }),
      this.database.client.tb_movimientos_inventario.count({ where }),
    ]);
    return { items: rows.map((row) => this.toMovement(row)), pagination: createPageMeta(query.page, query.pageSize, totalItems) };
  }

  async createMovement(input: InventoryMovementInputDto, user: AuthUser): Promise<InventoryMovementListItem> {
    const item = await this.database.client.tb_insumos_inventario.findUnique({ where: { id_insumo: input.itemId } });
    if (!item) this.notFound("El insumo seleccionado no existe.");
    if (!item.estado) this.conflict("itemId", "Seleccione un insumo activo.");
    if (input.type !== "entrada" && input.quantity > Number(item.stock_actual)) this.conflict("quantity", "La cantidad supera la existencia disponible.");
    const row = await this.database.client.tb_movimientos_inventario.create({ data: {
      id_insumo: input.itemId,
      tipo_movimiento: input.type,
      cantidad: input.quantity,
      id_usuario: user.id,
      observaciones: optionalText(input.observations),
    }, include: MOVEMENT_INCLUDE });
    return this.toMovement(row);
  }

  private supplierData(input: SupplierInputDto) {
    return { nombre_empresa: input.companyName.trim(), contacto: optionalText(input.contact), telefono: input.phone.trim(), correo: optionalText(input.email)?.toLowerCase() ?? null, direccion: optionalText(input.address) };
  }

  private itemData(input: InventoryItemInputDto) {
    return { nombre: input.name.trim(), tipo: input.type, id_proveedor: input.supplierId ?? null, id_medicamento: input.type === "medicamento" ? input.medicationId ?? null : null, stock_minimo: input.minimumStock, precio_costo: input.costPrice, unidad_medida: input.unit.trim() };
  }

  private async validateItemRelations(input: InventoryItemInputDto): Promise<void> {
    if (input.type === "medicamento" && !input.medicationId) this.conflict("medicationId", "Vincule el insumo con un medicamento activo.");
    if (input.type !== "medicamento" && input.medicationId) this.conflict("medicationId", "Solo los insumos de tipo medicamento pueden vincularse con farmacia.");
    const [supplier, medication] = await Promise.all([
      input.supplierId ? this.database.client.tb_proveedores.findUnique({ where: { id_proveedor: input.supplierId } }) : Promise.resolve(null),
      input.medicationId ? this.database.client.tb_medicamentos.findUnique({ where: { id_medicamento: input.medicationId } }) : Promise.resolve(null),
    ]);
    if (input.supplierId && !supplier) this.notFound("El proveedor seleccionado no existe.");
    if (supplier && !supplier.estado) this.conflict("supplierId", "Seleccione un proveedor activo.");
    if (input.medicationId && !medication) this.notFound("El medicamento seleccionado no existe.");
    if (medication && !medication.estado) this.conflict("medicationId", "Seleccione un medicamento activo.");
  }

  private toSupplier(row: { id_proveedor: number; nombre_empresa: string; contacto: string | null; telefono: string; correo: string | null; direccion: string | null; estado: boolean; fecha_creacion: Date; _count: { tb_insumos_inventario: number } }): SupplierListItem {
    return { id: row.id_proveedor, companyName: row.nombre_empresa, contact: row.contacto, phone: row.telefono, email: row.correo, address: row.direccion, active: row.estado, itemCount: row._count.tb_insumos_inventario, createdAt: row.fecha_creacion.toISOString() };
  }

  private toItem(row: { id_insumo: number; nombre: string; tipo: string; stock_actual: unknown; stock_minimo: unknown; stock_bajo: boolean | null; precio_costo: unknown; unidad_medida: string; estado: boolean; fecha_creacion: Date; tb_proveedores: { id_proveedor: number; nombre_empresa: string } | null; tb_medicamentos: { id_medicamento: number; nombre_comercial: string } | null; _count: { tb_movimientos_inventario: number } }): InventoryItemListItem {
    return { id: row.id_insumo, name: row.nombre, type: row.tipo as InventoryItemListItem["type"], currentStock: Number(row.stock_actual), minimumStock: Number(row.stock_minimo), lowStock: row.stock_bajo ?? Number(row.stock_actual) <= Number(row.stock_minimo), costPrice: Number(row.precio_costo), unit: row.unidad_medida, active: row.estado, supplier: row.tb_proveedores ? { id: row.tb_proveedores.id_proveedor, name: row.tb_proveedores.nombre_empresa } : null, medication: row.tb_medicamentos ? { id: row.tb_medicamentos.id_medicamento, name: row.tb_medicamentos.nombre_comercial } : null, movementCount: row._count.tb_movimientos_inventario, createdAt: row.fecha_creacion.toISOString() };
  }

  private toMovement(row: { id_movimiento: number; tipo_movimiento: string; cantidad: unknown; fecha: Date; observaciones: string | null; stock_anterior: unknown; stock_resultante: unknown; tb_insumos_inventario: { id_insumo: number; nombre: string; unidad_medida: string }; tb_usuarios: { id_usuario: number; nombre: string; username: string } }): InventoryMovementListItem {
    return { id: row.id_movimiento, type: row.tipo_movimiento as InventoryMovementListItem["type"], quantity: Number(row.cantidad), recordedAt: row.fecha.toISOString(), observations: row.observaciones, previousStock: row.stock_anterior === null ? null : Number(row.stock_anterior), resultingStock: row.stock_resultante === null ? null : Number(row.stock_resultante), item: { id: row.tb_insumos_inventario.id_insumo, name: row.tb_insumos_inventario.nombre, unit: row.tb_insumos_inventario.unidad_medida }, user: { id: row.tb_usuarios.id_usuario, name: row.tb_usuarios.nombre, username: row.tb_usuarios.username } };
  }

  private notFound(message: string): never { throw new AppException("RESOURCE_NOT_FOUND", message, HttpStatus.NOT_FOUND); }
  private conflict(field: string, message: string): never { throw new AppException("RESOURCE_CONFLICT", message, HttpStatus.CONFLICT, [{ field, message }]); }
}
