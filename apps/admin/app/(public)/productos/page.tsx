import type { Metadata } from "next";
import { PackageSearch } from "lucide-react";
import { ProductsUnavailable, PublicProductsCatalog } from "../../../components/public-site/public-products-catalog";
import { getPublicProducts } from "../../../lib/public-products";
import styles from "./products.module.css";

export const metadata: Metadata = {
  title: "Productos",
  description: "Consulta los productos e insumos disponibles en Clínica A.M.I.",
};

export default async function ProductsPage() {
  const products = await getPublicProducts();

  return (
    <div className={styles.page}>
      <section className={styles.hero} aria-labelledby="products-title">
        <div className={styles.heroInner}>
          <div>
            <p className={styles.eyebrow}>Catálogo de Clínica A.M.I.</p>
            <h1 id="products-title">Productos para acompañar tu bienestar.</h1>
            <p>Encuentra medicamentos, reactivos y materiales registrados en nuestro inventario.</p>
          </div>
          <span className={styles.heroIcon} aria-hidden="true"><PackageSearch /></span>
        </div>
      </section>

      <section className={styles.catalogSection} aria-label="Catálogo de productos">
        {products === null
          ? <ProductsUnavailable />
          : products.length > 0
            ? <PublicProductsCatalog products={products} />
            : (
                <div className={styles.emptyState}>
                  <PackageSearch aria-hidden="true" />
                  <h2>Catálogo en preparación</h2>
                  <p>Aún no hay productos activos publicados.</p>
                </div>
              )}
      </section>
    </div>
  );
}
