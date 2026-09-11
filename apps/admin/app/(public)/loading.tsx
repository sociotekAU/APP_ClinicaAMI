import styles from "./home.module.css";

export default function LoadingHomePage() {
  return (
    <div className={`${styles.home} ${styles.loadingPage}`} aria-busy="true" aria-label="Cargando contenido de la clínica">
      <section className={styles.loadingHero}>
        <div className={styles.loadingCopy}>
          <span className={styles.loadingLine} />
          <span className={styles.loadingTitle} />
          <span className={styles.loadingLine} />
        </div>
        <span className={styles.loadingVisual} />
      </section>
      <section className={styles.loadingSection}>
        <span className={styles.loadingHeading} />
        <div className={styles.loadingCards}>
          {Array.from({ length: 4 }, (_, index) => <span className={styles.loadingCard} key={index} />)}
        </div>
      </section>
    </div>
  );
}
