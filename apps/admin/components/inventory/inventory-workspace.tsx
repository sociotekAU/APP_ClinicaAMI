"use client";

import { Boxes, PackageSearch, ShieldCheck, Truck } from "lucide-react";
import { useState } from "react";
import { InventoryItemsManager } from "./inventory-items-manager";
import { InventoryMovementsManager } from "./inventory-movements-manager";
import { SuppliersManager } from "./suppliers-manager";

export function InventoryWorkspace({ canWrite }: Readonly<{ canWrite: boolean }>) {
  const [section, setSection] = useState<"items" | "movements" | "suppliers">("items");
  return (
    <section className="administration-workspace" aria-labelledby="inventory-title">
      <header className="administration-heading">
        <div><p className="eyebrow">Farmacia y suministros</p><h2 id="inventory-title">Inventario</h2><p>Controle existencias mediante movimientos trazables y alertas de mínimo.</p></div>
        <span className={canWrite ? "access-level-write" : "access-level-read"}><ShieldCheck aria-hidden="true" /> {canWrite ? "Lectura y escritura" : "Solo lectura"}</span>
      </header>
      <div className="administration-tabs" role="tablist" aria-label="Áreas de inventario">
        <button type="button" role="tab" aria-selected={section === "items"} className={section === "items" ? "is-active" : ""} onClick={() => setSection("items")}><Boxes aria-hidden="true" /> Insumos</button>
        <button type="button" role="tab" aria-selected={section === "movements"} className={section === "movements" ? "is-active" : ""} onClick={() => setSection("movements")}><PackageSearch aria-hidden="true" /> Movimientos</button>
        <button type="button" role="tab" aria-selected={section === "suppliers"} className={section === "suppliers" ? "is-active" : ""} onClick={() => setSection("suppliers")}><Truck aria-hidden="true" /> Proveedores</button>
      </div>
      <div role="tabpanel" tabIndex={0}>{section === "items" ? <InventoryItemsManager canWrite={canWrite} /> : section === "movements" ? <InventoryMovementsManager canWrite={canWrite} /> : <SuppliersManager canWrite={canWrite} />}</div>
    </section>
  );
}
