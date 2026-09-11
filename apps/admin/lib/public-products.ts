import type { ApiSuccess, InventoryItemType, PublicInventoryAvailability, PublicInventoryItem } from "@ami/contracts";
import "server-only";

const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:4000/api/v1")
  .replace(/\/+$/, "");

const ITEM_TYPES: InventoryItemType[] = ["medicamento", "reactivo_laboratorio", "material_clinico"];
const AVAILABILITY: PublicInventoryAvailability[] = ["available", "limited", "unavailable"];

function isPublicInventoryItem(value: unknown): value is PublicInventoryItem {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<PublicInventoryItem>;
  return typeof item.id === "number"
    && typeof item.name === "string"
    && typeof item.unit === "string"
    && ITEM_TYPES.includes(item.type as InventoryItemType)
    && AVAILABILITY.includes(item.availability as PublicInventoryAvailability)
    && (item.medicationName === null || typeof item.medicationName === "string");
}

async function requestPublicProducts(path: string): Promise<unknown> {
  const response = await fetch(`${API_URL}/public/inventory/items${path}`, {
    headers: { accept: "application/json" },
    next: { revalidate: 60 },
    signal: AbortSignal.timeout(5_000),
  });
  if (!response.ok) return null;
  const body = (await response.json()) as Partial<ApiSuccess<unknown>>;
  return body.data;
}

export async function getPublicProducts(): Promise<PublicInventoryItem[] | null> {
  try {
    const data = await requestPublicProducts("");
    return Array.isArray(data) && data.every(isPublicInventoryItem) ? data : null;
  } catch {
    return null;
  }
}

export async function getPublicProduct(id: number): Promise<PublicInventoryItem | null> {
  try {
    const data = await requestPublicProducts(`/${id}`);
    return isPublicInventoryItem(data) ? data : null;
  } catch {
    return null;
  }
}
