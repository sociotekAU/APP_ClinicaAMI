import type { Metadata } from "next";
import { CalendarDays, Check, Clock3 } from "lucide-react";
import { getPublicWebContent } from "../../../lib/public-web-content";
import { AppointmentDraftForm } from "./appointment-draft-form";
import styles from "./appointment.module.css";

export const metadata: Metadata = {
  title: "Agendar cita",
  description: "Borrador de solicitud de cita para Clínica A.M.I.",
};

export default async function AppointmentPage() {
  const content = await getPublicWebContent();
  const services = (content?.services ?? [])
    .map(({ id, name }) => ({ id, name }))
    .sort((first, second) => first.name.localeCompare(second.name, "es"));
  const professionals = (content?.professionals ?? [])
    .map(({ id, name, specialty }) => ({ id, name, specialty }))
    .sort((first, second) => first.name.localeCompare(second.name, "es"));
  const contact = content?.contact ?? null;

  return (
    <div className={styles.page}>
      <section className={styles.hero} aria-labelledby="appointment-title">
        <div className={styles.heroInner}>
          <div className={styles.heroCopy}>
            <span className={styles.draftBadge}>Vista preliminar · No envía datos</span>
            <p className={styles.eyebrow}>Agenda tu atención</p>
            <h1 id="appointment-title">Tu bienestar comienza con una cita.</h1>
            <p>
              Completa una solicitud preliminar para visualizar cómo será el proceso de agenda en línea.
            </p>
          </div>

          <div className={styles.heroCalendar} aria-hidden="true">
            <div className={styles.calendarTop}>
              <CalendarDays />
              <span>Solicitud de cita</span>
            </div>
            <div className={styles.calendarGrid}>
              {Array.from({ length: 14 }, (_, index) => (
                <span className={index === 9 ? styles.calendarDaySelected : undefined} key={index}>
                  {index === 9 && <Check />}
                </span>
              ))}
            </div>
            <div className={styles.calendarTime}>
              <Clock3 />
              <span>Elige la fecha y horario que prefieras</span>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.process} aria-label="Proceso de solicitud">
        <ol>
          <li><span>1</span><div><strong>Cuéntanos sobre ti</strong><small>Datos de contacto</small></div></li>
          <li><span>2</span><div><strong>Elige tu atención</strong><small>Servicio y profesional</small></div></li>
          <li><span>3</span><div><strong>Indica tu preferencia</strong><small>Fecha y horario</small></div></li>
        </ol>
      </section>

      <AppointmentDraftForm
        clinicName={contact?.shortName || contact?.companyName || "Clínica A.M.I."}
        location={contact?.location ?? null}
        optionsAvailable={content !== null}
        phone={contact?.phone ?? null}
        professionals={professionals}
        saturdayHours={contact?.saturdayHours ?? null}
        services={services}
        weekdayHours={contact?.weekdayHours ?? null}
      />
    </div>
  );
}
