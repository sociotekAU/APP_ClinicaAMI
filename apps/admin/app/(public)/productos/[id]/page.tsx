import type { InventoryItemType, PublicInventoryAvailability } from "@ami/contracts";
import type { Metadata } from "next";
import { ArrowRight, ChevronRight, FlaskConical, Pill, Stethoscope, WifiOff, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPublicProduct } from "../../../../lib/public-products";
import styles from "../products.module.css";

type ProductPageProps = Readonly<{ params: Promise<{ id: string }> }>;

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

function parseProductId(value: string): number | null {
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const { id } = await params;
  const productId = parseProductId(id);
  if (!productId) return { title: "Producto no encontrado", robots: { index: false, follow: false } };

  const result = await getPublicProduct(productId);
  if (result.status !== "success") {
    return result.status === "not-found"
      ? { title: "Producto no encontrado", robots: { index: false, follow: false } }
      : { title: "Detalle de producto" };
  }

  return {
    title: result.product.name,
    description: `Consulta la categoría, presentación y disponibilidad de ${result.product.name} en Clínica A.M.I.`,
  };
}

export default async function ProductDetailPage({ params }: ProductPageProps) {
  const { id } = await params;
  const productId = parseProductId(id);
  if (!productId) notFound();

  const result = await getPublicProduct(productId);
  if (result.status === "not-found") notFound();

  if (result.status === "unavailable") {
    return (
      <section className={styles.detailMissing} role="status">
        <WifiOff aria-hidden="true" />
        <p className={styles.eyebrow}>Conexión no disponible</p>
        <h1>No pudimos cargar el producto.</h1>
        <p>Intenta nuevamente más tarde o vuelve al catálogo para consultar otros productos.</p>
        <Link href="/productos">Volver al catálogo <ArrowRight aria-hidden="true" /></Link>
      </section>
    );
  }

  const product = result.product;
  const { Icon, label } = TYPE_DETAILS[product.type];
  return (
    <div className={styles.detailPage}>
      <div className={styles.detailInner}>
        <nav className={styles.breadcrumbs} aria-label="Ruta de navegación">
          <Link href="/">Inicio</Link>
          <ChevronRight aria-hidden="true" />
          <Link href="/productos">Productos</Link>
          <ChevronRight aria-hidden="true" />
          <span aria-current="page">{product.name}</span>
        </nav>

        <article className={styles.detailCard}>
          <div className={`${styles.detailVisual} ${styles[product.type]}`}>
            <Icon aria-hidden="true" />
            <span>{label}</span>
          </div>
          <div className={styles.detailContent}>
            <span className={`${styles.availability} ${styles[product.availability]}`}>
              {AVAILABILITY_LABELS[product.availability]}
            </span>
            <p className={styles.eyebrow}>Producto de Clínica A.M.I.</p>
            <h1>{product.name}</h1>
            {product.medicationName && product.medicationName !== product.name && (
              <div className={styles.medicationReference}>
                <span>Referencia farmacéutica</span>
                <p>{product.medicationName}</p>
              </div>
            )}
            <dl className={styles.productFacts}>
              <div><dt>Categoría</dt><dd>{label}</dd></div>
              <div><dt>Presentación</dt><dd>{product.unit}</dd></div>
            </dl>
            <p className={styles.availabilityNote}>La disponibilidad puede cambiar. Confírmala directamente con nuestro equipo.</p>
            <Link className={styles.contactAction} href="/contacto" aria-label={`Consultar disponibilidad de ${product.name}`}>
              Consultar disponibilidad <ArrowRight aria-hidden="true" />
            </Link>
          </div>
        </article>
      </div>
    </div>
  );
}
