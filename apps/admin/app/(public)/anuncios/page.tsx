import type { Metadata } from "next";
import { BadgePercent, BellRing, WifiOff } from "lucide-react";
import { PublicPromotions } from "../../../components/public-site/public-promotions";
import { getPublicWebContent } from "../../../lib/public-web-content";
import styles from "./announcements.module.css";

export const metadata: Metadata = {
  title: "Promociones",
  description: "Consulta las promociones activas y vigentes de Clínica A.M.I.",
};

export default async function AnnouncementsPage() {
  const content = await getPublicWebContent();
  const promotions = content?.promotions ?? [];

  return (
    <div className={styles.page}>
      <section className={styles.hero} aria-labelledby="promotions-title">
        <div className={styles.heroInner}>
          <div>
            <p className={styles.eyebrow}>Beneficios vigentes</p>
            <h1 id="promotions-title">Promociones actuales.</h1>
            <p>Selecciona una promoción para consultar toda la información y sus fechas.</p>
          </div>
          {content && promotions.length > 0 && (
            <div className={styles.heroSummary} aria-label={`${promotions.length} promociones vigentes`}>
              <BellRing aria-hidden="true" />
              <span>
                <strong>{promotions.length}</strong>
                {promotions.length === 1 ? "promoción vigente" : "promociones vigentes"}
              </span>
            </div>
          )}
        </div>
      </section>

      <div className={styles.feed}>
        {!content
          ? (
              <div className={styles.emptyState} role="status">
                <WifiOff aria-hidden="true" />
                <h2>No pudimos cargar las promociones</h2>
                <p>Intenta nuevamente más tarde para consultar las promociones de la clínica.</p>
              </div>
            )
          : promotions.length === 0
            ? (
                <div className={styles.emptyState}>
                  <BadgePercent aria-hidden="true" />
                  <h2>No hay promociones vigentes</h2>
                  <p>Cuando la clínica publique una promoción activa dentro de sus fechas, aparecerá en este espacio.</p>
                </div>
              )
            : (
                <section className={styles.feedSection} aria-labelledby="current-promotions-title">
                  <header className={styles.sectionHeading}>
                    <div>
                      <h2 id="current-promotions-title">Disponibles ahora</h2>
                      <p>Solo se muestran promociones activas cuya fecha de publicación continúa vigente.</p>
                    </div>
                    <span className={styles.sectionCount}>{promotions.length} {promotions.length === 1 ? "promoción" : "promociones"}</span>
                  </header>
                  <PublicPromotions promotions={promotions} />
                </section>
              )}
      </div>
    </div>
  );
}
