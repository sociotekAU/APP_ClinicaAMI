import styles from "./appointment.module.css";

export default function AppointmentLoading() {
  return (
    <div className={styles.page} aria-busy="true" aria-label="Cargando borrador de cita">
      <section className={styles.loadingHero}>
        <div className={styles.loadingCopy}>
          <span />
          <span />
          <span />
        </div>
        <span className={styles.loadingCalendar} />
      </section>
      <div className={styles.loadingWorkspace}>
        <span className={styles.loadingForm} />
        <span className={styles.loadingSidebar} />
      </div>
    </div>
  );
}
