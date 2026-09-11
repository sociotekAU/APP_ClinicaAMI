import type { InventoryItemType, PublicInventoryAvailability } from "@ami/contracts";
import type { Metadata } from "next";
import { ArrowLeft, ArrowRight, FlaskConical, PackageOpen, Pill, Stethoscope, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { getPublicProduct } from "../../../../lib/public-products";
import styles from "../products.module.css";

export const metadata: Metadata = {
  title: "Detalle de producto",
  description: "Información pública de un producto disponible en Clínica A.M.I.",
};

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

export default async function ProductDetailPage({ params }: Readonly<{ params: Promise<{ id: string }> }>) {
  const { id } = await params;
  const productId = Number(id);
  const product = Number.isSafeInteger(productId) && productId > 0
    ? await getPublicProduct(productId)
    : null;

  if (!product) {
    return (
      <section className={styles.detailMissing}>
        <PackageOpen aria-hidden="true" />
        <p className={styles.eyebrow}>Producto no disponible</p>
        <h1>No encontramos este producto.</h1>
        <p>Es posible que ya no esté activo o que el enlace haya cambiado.</p>
        <Link href="/productos"><ArrowLeft aria-hidden="true" /> Volver al catálogo</Link>
      </section>
    );
  }

  const { Icon, label } = TYPE_DETAILS[product.type];
  return (
    <div className={styles.detailPage}>
      <div className={styles.detailInner}>
        <Link className={styles.backLink} href="/productos">
          <ArrowLeft aria-hidden="true" /> Volver a productos
        </Link>

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
              <p className={styles.medicationName}>{product.medicationName}</p>
            )}
            <dl className={styles.productFacts}>
              <div><dt>Categoría</dt><dd>{label}</dd></div>
              <div><dt>Presentación</dt><dd>{product.unit}</dd></div>
            </dl>
            <p className={styles.availabilityNote}>La disponibilidad puede cambiar. Confírmala directamente con nuestro equipo.</p>
            <Link className={styles.contactAction} href="/contacto">
              Consultar disponibilidad <ArrowRight aria-hidden="true" />
            </Link>
          </div>
        </article>
      </div>
    </div>
  );
}
