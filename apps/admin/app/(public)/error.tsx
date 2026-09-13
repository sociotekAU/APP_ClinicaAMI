"use client";

import { AlertTriangle, Home, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";
import styles from "../../components/public-site/public-route-state.module.css";

export default function PublicError({
  error,
  retry,
}: Readonly<{
  error: Error & { digest?: string };
  retry: () => void;
}>) {
  useEffect(() => {
    console.error("Error no controlado en el sitio público", error);
  }, [error]);

  return (
    <section className={styles.page} role="alert" aria-labelledby="public-error-title">
      <span className={`${styles.orbit} ${styles.orbitOne}`} aria-hidden="true" />
      <span className={`${styles.orbit} ${styles.orbitTwo}`} aria-hidden="true" />
      <div className={styles.card}>
        <span className={`${styles.icon} ${styles.errorIcon}`} aria-hidden="true">
          <AlertTriangle />
        </span>
        <p className={styles.eyebrow}>Algo no salió como esperábamos</p>
        <h1 id="public-error-title">No pudimos mostrar esta página.</h1>
        <p className={styles.description}>
          El inconveniente puede ser temporal. Intenta cargar el contenido nuevamente o regresa al inicio.
        </p>
        {error.digest && <p className={styles.reference}>Referencia: {error.digest}</p>}
        <div className={styles.actions}>
          <button className={styles.primaryAction} type="button" onClick={retry}>
            <RefreshCw aria-hidden="true" />
            Intentar de nuevo
          </button>
          <Link className={styles.secondaryAction} href="/">
            <Home aria-hidden="true" />
            Ir al inicio
          </Link>
        </div>
      </div>
    </section>
  );
}
