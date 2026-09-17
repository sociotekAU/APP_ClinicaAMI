"use client";

import type { InventoryItemType, PublicInventoryAvailability, PublicInventoryItem } from "@ami/contracts";
import { ArrowLeft, ArrowRight, FlaskConical, PackageSearch, Pill, Stethoscope, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { useRef } from "react";
import styles from "../../app/(public)/productos/products.module.css";
import { safePublicationMediaUrl } from "../../lib/publication-presentation";

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

export function RelatedProductsCarousel({ products }: Readonly<{ products: PublicInventoryItem[] }>) {
  const trackRef = useRef<HTMLUListElement>(null);

  function move(direction: -1 | 1) {
    const track = trackRef.current;
    if (!track) return;
    track.scrollBy({ left: direction * Math.max(track.clientWidth * 0.82, 280), behavior: "smooth" });
  }

  return (
    <section className={styles.relatedSection} aria-labelledby="related-products-title">
      <header className={styles.relatedHeader}>
        <div>
          <p className={styles.eyebrow}>También puede interesarte</p>
          <h2 id="related-products-title">Otros productos</h2>
        </div>
        {products.length > 1 && (
          <div className={styles.carouselControls} aria-label="Controles del carrusel">
            <button type="button" onClick={() => move(-1)} aria-label="Ver productos anteriores">
              <ArrowLeft aria-hidden="true" />
            </button>
            <button type="button" onClick={() => move(1)} aria-label="Ver productos siguientes">
              <ArrowRight aria-hidden="true" />
            </button>
          </div>
        )}
      </header>

      {products.length === 0 ? (
        <div className={styles.relatedEmpty} role="status">
          <PackageSearch aria-hidden="true" />
          <h3>Más productos próximamente</h3>
          <p>Productos pendientes de actualizar.</p>
        </div>
      ) : (
        <ul className={styles.relatedTrack} ref={trackRef} aria-label="Otros productos disponibles">
          {products.map((product) => {
            const { Icon, label } = TYPE_DETAILS[product.type];
            const imageUrl = safePublicationMediaUrl(product.imageUrl);
            return (
              <li key={product.id}>
                <Link className={styles.relatedCard} href={`/productos/${product.id}`}>
                  <span className={`${styles.relatedVisual} ${imageUrl ? styles.relatedVisualImage : styles[product.type]}`}>
                    {imageUrl
                      ? <img src={imageUrl} alt="" width="640" height="420" loading="lazy" decoding="async" />
                      : <Icon aria-hidden="true" />}
                    <span>{label}</span>
                  </span>
                  <span className={styles.relatedBody}>
                    <span className={`${styles.availability} ${styles[product.availability]}`}>
                      {AVAILABILITY_LABELS[product.availability]}
                    </span>
                    <strong>{product.name}</strong>
                    <small>Presentación: {product.unit}</small>
                    <span className={styles.relatedLink}>Ver producto <ArrowRight aria-hidden="true" /></span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
