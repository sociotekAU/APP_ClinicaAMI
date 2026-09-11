import styles from "./announcements.module.css";

export default function AnnouncementsLoading() {
  return (
    <div className={styles.page} aria-busy="true" aria-label="Cargando promociones">
      <section className={styles.hero}>
        <div className={styles.heroInner}>
          <div className={styles.loadingCopy}>
            <span className={styles.loadingLine} />
            <span className={styles.loadingLine} />
            <span className={styles.loadingLine} />
          </div>
          <span className={styles.loadingSummary} />
        </div>
      </section>
      <div className={styles.feed}>
        <div className={styles.loadingGrid}>
          <span className={styles.loadingCard} />
          <span className={styles.loadingCard} />
        </div>
      </div>
    </div>
  );
}
