import { ArrowLeft, PackageOpen } from "lucide-react";
import Link from "next/link";
import styles from "../products.module.css";

export default function ProductNotFound() {
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
