import styles from "./contact.module.css";

export default function ContactLoading() {
  return (
    <div className={styles.page} aria-busy="true" aria-label="Cargando información de contacto">
      <section className={styles.loadingHero}>
        <div className={styles.loadingCopy}>
          <span className={styles.loadingLine} />
          <span className={styles.loadingTitle} />
          <span className={styles.loadingLine} />
          <span className={styles.loadingActions} />
        </div>
        <span className={styles.loadingHeroCard} />
      </section>
      <div className={styles.loadingContent}>
        <span className={styles.loadingHeading} />
        <div className={styles.loadingCards}>
          <span />
          <span />
          <span />
        </div>
        <div className={styles.loadingPanels}>
          <span />
          <span />
        </div>
      </div>
    </div>
  );
}
