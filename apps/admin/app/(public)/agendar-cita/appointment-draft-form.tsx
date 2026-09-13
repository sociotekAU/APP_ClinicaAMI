"use client";

import {
  CalendarDays,
  CheckCircle2,
  Clock3,
  Info,
  Mail,
  MapPin,
  Phone,
  Send,
  ShieldCheck,
  Stethoscope,
  UserRound,
} from "lucide-react";
import { useRef, useState, type FormEvent } from "react";
import styles from "./appointment.module.css";

interface ServiceOption {
  id: number;
  name: string;
}

interface ProfessionalOption {
  id: number;
  name: string;
  specialty: string;
}

interface AppointmentDraftFormProps {
  clinicName: string;
  location: string | null;
  optionsAvailable: boolean;
  phone: string | null;
  professionals: ProfessionalOption[];
  saturdayHours: string | null;
  services: ServiceOption[];
  weekdayHours: string | null;
}

function telephoneUrl(phone: string): string {
  return `tel:${phone.replace(/[^\d+]/g, "")}`;
}

export function AppointmentDraftForm({
  clinicName,
  location,
  optionsAvailable,
  phone,
  professionals,
  saturdayHours,
  services,
  weekdayHours,
}: Readonly<AppointmentDraftFormProps>) {
  const [showDraftNotice, setShowDraftNotice] = useState(false);
  const noticeRef = useRef<HTMLDivElement>(null);

  function reviewDraft(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setShowDraftNotice(true);
    window.requestAnimationFrame(() => noticeRef.current?.focus());
  }

  return (
    <div className={styles.workspace}>
      <form className={styles.formCard} onSubmit={reviewDraft}>
        <header className={styles.formHeading}>
          <div>
            <p className={styles.eyebrow}>Solicitud preliminar</p>
            <h2>Cuéntanos cómo podemos ayudarte.</h2>
          </div>
          <span><ShieldCheck aria-hidden="true" /> No se guardan datos</span>
        </header>

        {!optionsAvailable && (
          <div className={styles.optionsWarning} role="status">
            <Info aria-hidden="true" />
            <p>No pudimos cargar los servicios y profesionales. Puedes completar los demás campos o comunicarte por teléfono.</p>
          </div>
        )}

        <fieldset className={styles.formSection}>
          <legend><span>1</span> Tus datos</legend>
          <div className={styles.formGrid}>
            <label className={styles.field}>
              <span><UserRound aria-hidden="true" /> Nombre completo <b>*</b></span>
              <input name="fullName" type="text" autoComplete="name" placeholder="Escribe tu nombre" minLength={3} maxLength={150} required />
            </label>
            <label className={styles.field}>
              <span><Phone aria-hidden="true" /> Teléfono <b>*</b></span>
              <input name="phone" type="tel" autoComplete="tel" inputMode="tel" placeholder="0000-0000" minLength={4} maxLength={20} required />
            </label>
            <label className={`${styles.field} ${styles.fieldWide}`}>
              <span><Mail aria-hidden="true" /> Correo electrónico <small>Opcional</small></span>
              <input name="email" type="email" autoComplete="email" placeholder="nombre@correo.com" maxLength={150} />
            </label>
          </div>
        </fieldset>

        <fieldset className={styles.formSection}>
          <legend><span>2</span> Tipo de atención</legend>
          <div className={styles.formGrid}>
            <label className={styles.field}>
              <span><Stethoscope aria-hidden="true" /> Servicio {services.length > 0 && <b>*</b>}</span>
              <select name="serviceId" defaultValue="" disabled={services.length === 0} required={services.length > 0}>
                <option value="" disabled>{services.length > 0 ? "Selecciona un servicio" : "Servicios no disponibles"}</option>
                {services.map((service) => <option key={service.id} value={service.id}>{service.name}</option>)}
              </select>
            </label>
            <label className={styles.field}>
              <span><UserRound aria-hidden="true" /> Profesional <small>Opcional</small></span>
              <select name="professionalId" defaultValue="" disabled={professionals.length === 0}>
                <option value="">{professionals.length > 0 ? "Sin preferencia" : "Profesionales no disponibles"}</option>
                {professionals.map((professional) => (
                  <option key={professional.id} value={professional.id}>
                    {professional.name} · {professional.specialty}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </fieldset>

        <fieldset className={styles.formSection}>
          <legend><span>3</span> Fecha y motivo</legend>
          <div className={styles.formGrid}>
            <label className={styles.field}>
              <span><CalendarDays aria-hidden="true" /> Fecha preferida <b>*</b></span>
              <input name="preferredDate" type="date" required />
            </label>
            <label className={styles.field}>
              <span><Clock3 aria-hidden="true" /> Horario preferido <b>*</b></span>
              <select name="preferredTime" defaultValue="" required>
                <option value="" disabled>Selecciona un horario</option>
                <option value="morning">Por la mañana</option>
                <option value="afternoon">Por la tarde</option>
                <option value="any">Cualquier horario disponible</option>
              </select>
            </label>
            <label className={`${styles.field} ${styles.fieldWide}`}>
              <span>Motivo de la cita <b>*</b></span>
              <textarea name="reason" placeholder="Describe brevemente el motivo de tu consulta" minLength={5} maxLength={500} rows={4} required />
              <small className={styles.fieldHelp}>No incluyas información médica sensible en este borrador.</small>
            </label>
          </div>
        </fieldset>

        <div className={styles.draftDisclosure}>
          <Info aria-hidden="true" />
          <p>
            Esta pantalla es un borrador visual. Al continuar, la solicitud <strong>no será enviada ni almacenada</strong>.
          </p>
        </div>

        <button className={styles.submitButton} type="submit">
          <Send aria-hidden="true" />
          Continuar con el borrador
        </button>

        {showDraftNotice && (
          <div className={styles.draftResult} ref={noticeRef} role="status" tabIndex={-1}>
            <CheckCircle2 aria-hidden="true" />
            <div>
              <h3>La vista preliminar funciona correctamente</h3>
              <p>Tus datos no fueron enviados ni guardados. La confirmación en línea se habilitará en una fase posterior.</p>
              {phone && <a href={telephoneUrl(phone)}>Coordinar ahora al {phone}</a>}
            </div>
          </div>
        )}
      </form>

      <aside className={styles.sidebar} aria-label="Información para agendar">
        <div className={styles.sidebarPrimary}>
          <span className={styles.sidebarIcon}><Phone aria-hidden="true" /></span>
          <p className={styles.eyebrow}>Atención directa</p>
          <h2>¿Prefieres coordinar por teléfono?</h2>
          <p>Nuestro equipo puede orientarte y confirmar la disponibilidad de {clinicName}.</p>
          {phone
            ? <a href={telephoneUrl(phone)}><Phone aria-hidden="true" /> Llamar al {phone}</a>
            : <span className={styles.phoneUnavailable}>Teléfono temporalmente no disponible</span>}
        </div>

        {(weekdayHours || saturdayHours) && (
          <div className={styles.sidebarCard}>
            <Clock3 aria-hidden="true" />
            <div>
              <h3>Horarios de atención</h3>
              {weekdayHours && <p>{weekdayHours}</p>}
              {saturdayHours && <p>Sábado: {saturdayHours}</p>}
            </div>
          </div>
        )}

        {location && (
          <div className={styles.sidebarCard}>
            <MapPin aria-hidden="true" />
            <div>
              <h3>Ubicación</h3>
              <p>{location}</p>
            </div>
          </div>
        )}
      </aside>
    </div>
  );
}
