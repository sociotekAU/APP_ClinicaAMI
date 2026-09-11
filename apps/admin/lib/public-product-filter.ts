import type { InventoryItemType, PublicInventoryItem } from "@ami/contracts";

export type PublicProductFilter = InventoryItemType | "all";

function normalized(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("es").trim();
}

export function filterPublicProducts(
  products: PublicInventoryItem[],
  search: string,
  filter: PublicProductFilter,
): PublicInventoryItem[] {
  const term = normalized(search);
  return products.filter((product) => {
    const matchesName = !term || normalized(product.name).includes(term);
    return matchesName && (filter === "all" || product.type === filter);
  });
}
