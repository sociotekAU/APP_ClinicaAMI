import styles from "./products.module.css";

export default function ProductsLoading() {
  return (
    <div className={styles.page} aria-busy="true" aria-label="Cargando productos">
      <section className={styles.hero}>
        <div className={styles.heroInner}>
          <div className={styles.loadingCopy}>
            <span />
            <span />
            <span />
          </div>
        </div>
      </section>
      <section className={styles.catalogSection}>
        <div className={styles.loadingToolbar} />
        <div className={styles.loadingGrid}>
          {Array.from({ length: 6 }, (_, index) => <span key={index} />)}
        </div>
      </section>
    </div>
  );
}
