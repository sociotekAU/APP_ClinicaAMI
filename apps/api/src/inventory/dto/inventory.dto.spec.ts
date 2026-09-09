import "reflect-metadata";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { describe, expect, it } from "vitest";
import { InventoryItemInputDto, InventoryMovementInputDto, SupplierInputDto } from "./inventory-input.dto";
import { ListInventoryItemsDto, ListInventoryMovementsDto } from "./list-inventory.dto";

describe("inventory DTOs", () => {
  it("acepta el filtro de existencia baja y movimientos válidos", async () => {
    const items = plainToInstance(ListInventoryItemsDto, { page: "1", pageSize: "20", status: "low", sortBy: "stock" });
    const movements = plainToInstance(ListInventoryMovementsDto, { status: "merma", sortBy: "recordedAt" });
    expect(await validate(items)).toHaveLength(0);
    expect(await validate(movements)).toHaveLength(0);
  });

  it("rechaza cantidades negativas y tipos desconocidos", async () => {
    const item = plainToInstance(InventoryItemInputDto, { name: "Guantes", type: "otro", minimumStock: -1, costPrice: -2, unit: "caja" });
    const movement = plainToInstance(InventoryMovementInputDto, { itemId: 1, type: "ajuste", quantity: 0 });
    expect((await validate(item)).map((error) => error.property)).toEqual(expect.arrayContaining(["type", "minimumStock", "costPrice"]));
    expect((await validate(movement)).map((error) => error.property)).toEqual(expect.arrayContaining(["type", "quantity"]));
  });

  it("valida el formato de correo del proveedor", async () => {
    const supplier = plainToInstance(SupplierInputDto, { companyName: "Proveedor", phone: "1234", email: "correo-invalido" });
    expect((await validate(supplier)).map((error) => error.property)).toContain("email");
  });
});
