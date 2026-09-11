import styles from "../products.module.css";

export default function ProductDetailLoading() {
  return (
    <div className={styles.detailPage} aria-busy="true" aria-label="Cargando detalle del producto">
      <div className={styles.detailInner}>
        <span className={styles.loadingBreadcrumb} />
        <div className={styles.detailCard}>
          <span className={styles.loadingDetailVisual} />
          <div className={styles.loadingDetailContent}>
            <span />
            <span />
            <span />
            <span />
          </div>
        </div>
      </div>
    </div>
  );
}
