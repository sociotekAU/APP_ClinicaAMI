"use client";

import { AlertTriangle, RefreshCw } from "lucide-react";
import { useEffect } from "react";

export default function PanelError({
  error,
  retry,
}: Readonly<{
  error: Error & { digest?: string };
  retry: () => void;
}>) {
  useEffect(() => {
    console.error("Error no controlado en el panel ERP", error);
  }, [error]);

  return (
    <section className="route-error" role="alert" aria-labelledby="route-error-title">
      <span><AlertTriangle aria-hidden="true" /></span>
      <p className="eyebrow">No se pudo mostrar esta sección</p>
      <h2 id="route-error-title">Ocurrió un error inesperado</h2>
      <p>Puede intentar cargar nuevamente. Si continúa, reporte el código de referencia.</p>
      {error.digest && <code>Referencia: {error.digest}</code>}
      <button className="button button-primary" type="button" onClick={retry}>
        <RefreshCw aria-hidden="true" /> Reintentar
      </button>
    </section>
  );
}
