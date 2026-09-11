import type { PublicInventoryItem } from "@ami/contracts";
import { describe, expect, it } from "vitest";
import { filterPublicProducts } from "./public-product-filter";

const products: PublicInventoryItem[] = [
  { id: 1, name: "Acetaminofén 500 mg", type: "medicamento", unit: "tableta", availability: "available", medicationName: "Acetaminofén" },
  { id: 2, name: "Guantes de nitrilo", type: "material_clinico", unit: "caja", availability: "limited", medicationName: null },
];

describe("filterPublicProducts", () => {
  it("busca por nombre sin distinguir mayúsculas ni acentos", () => {
    expect(filterPublicProducts(products, "ACETAMINOFEN", "all")).toEqual([products[0]]);
  });

  it("combina búsqueda por nombre y categoría", () => {
    expect(filterPublicProducts(products, "guantes", "medicamento")).toEqual([]);
    expect(filterPublicProducts(products, "guantes", "material_clinico")).toEqual([products[1]]);
  });
});
