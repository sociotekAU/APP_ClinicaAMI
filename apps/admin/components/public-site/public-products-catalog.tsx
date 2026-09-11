"use client";

import type { InventoryItemType, PublicInventoryAvailability, PublicInventoryItem } from "@ami/contracts";
import { ArrowUpRight, FlaskConical, PackageOpen, PackageSearch, Pill, RotateCcw, Search, Stethoscope, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import styles from "../../app/(public)/productos/products.module.css";
import { filterPublicProducts, type PublicProductFilter } from "../../lib/public-product-filter";

const FILTERS: ReadonlyArray<{ value: PublicProductFilter; label: string }> = [
  { value: "all", label: "Todos" },
  { value: "medicamento", label: "Medicamentos" },
  { value: "reactivo_laboratorio", label: "Reactivos" },
  { value: "material_clinico", label: "Material clínico" },
];

const TYPE_DETAILS: Record<InventoryItemType, { label: string; Icon: LucideIcon }> = {
  medicamento: { label: "Medicamento", Icon: Pill },
  reactivo_laboratorio: { label: "Reactivo de laboratorio", Icon: FlaskConical },
  material_clinico: { label: "Material clínico", Icon: Stethoscope },
};

const AVAILABILITY_LABELS: Record<PublicInventoryAvailability, string> = {
  available: "Disponible",
  limited: "Disponibilidad limitada",
  unavailable: "Consultar disponibilidad",
};

export function PublicProductsCatalog({ products }: Readonly<{ products: PublicInventoryItem[] }>) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<PublicProductFilter>("all");
  const filteredProducts = useMemo(() => filterPublicProducts(products, search, filter), [filter, products, search]);
  const filtersActive = search.trim().length > 0 || filter !== "all";

  function resetFilters() {
    setSearch("");
    setFilter("all");
  }

  return (
    <div className={styles.catalog}>
      <div className={styles.toolbar}>
        <label className={styles.searchField}>
          <span>Buscar por nombre</span>
          <span className={styles.searchControl}>
            <Search aria-hidden="true" />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Ej. vitamina, guantes…"
              autoComplete="off"
            />
          </span>
        </label>

        <div className={styles.filterField}>
          <span>Filtrar por tipo</span>
          <div className={styles.filterButtons} role="group" aria-label="Filtrar productos por tipo">
            {FILTERS.map((item) => (
              <button
                className={filter === item.value ? styles.filterButtonActive : styles.filterButton}
                type="button"
                key={item.value}
                onClick={() => setFilter(item.value)}
                aria-pressed={filter === item.value}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className={styles.resultsHeading}>
        <p aria-live="polite">
          <strong>{filteredProducts.length}</strong> {filteredProducts.length === 1 ? "producto encontrado" : "productos encontrados"}
        </p>
        {filtersActive && (
          <button type="button" onClick={resetFilters}>
            <RotateCcw aria-hidden="true" /> Limpiar filtros
          </button>
        )}
      </div>

      {filteredProducts.length > 0
        ? (
            <div className={styles.productGrid}>
              {filteredProducts.map((product) => {
                const { Icon, label } = TYPE_DETAILS[product.type];
                return (
                  <Link className={styles.productCard} href={`/productos/${product.id}`} key={product.id} aria-label={`Ver ${product.name}`}>
                    <span className={`${styles.productVisual} ${styles[product.type]}`}>
                      <Icon aria-hidden="true" />
                      <span>{label}</span>
                    </span>
                    <span className={styles.productBody}>
                      <span className={`${styles.availability} ${styles[product.availability]}`}>
                        {AVAILABILITY_LABELS[product.availability]}
                      </span>
                      <strong>{product.name}</strong>
                      <span className={styles.productUnit}>Presentación: {product.unit}</span>
                      <span className={styles.productLink}>Ver producto <ArrowUpRight aria-hidden="true" /></span>
                    </span>
                  </Link>
                );
              })}
            </div>
          )
        : (
            <div className={styles.emptyState}>
              <PackageSearch aria-hidden="true" />
              <h2>No encontramos coincidencias</h2>
              <p>Prueba con otro nombre o selecciona una categoría diferente.</p>
              <button type="button" onClick={resetFilters}>
                <RotateCcw aria-hidden="true" /> Mostrar todos
              </button>
            </div>
          )}
    </div>
  );
}

export function ProductsUnavailable() {
  return (
    <div className={styles.emptyState} role="status">
      <PackageOpen aria-hidden="true" />

      <h2>No pudimos cargar los productos</h2>
      <p>Intenta nuevamente más tarde o consulta la disponibilidad con la clínica.</p>
      <Link href="/contacto">Ir a contacto <ArrowUpRight aria-hidden="true" /></Link>
    </div>
  );
}
