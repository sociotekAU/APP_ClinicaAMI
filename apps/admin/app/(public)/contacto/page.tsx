import type { Metadata } from "next";
import {
  Building2,
  Camera,
  Clock3,
  ExternalLink,
  Mail,
  MapPin,
  MessageCircle,
  Navigation,
  Phone,
  WifiOff,
} from "lucide-react";
import { getPublicWebContent } from "../../../lib/public-web-content";
import styles from "./contact.module.css";

export const metadata: Metadata = {
  title: "Contacto",
  description: "Comunícate con Clínica A.M.I. y consulta nuestra ubicación y horarios de atención.",
};

function safeExternalUrl(value: string | null): string | null {
  if (!value) return null;

  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

function telephoneUrl(phone: string): string {
  return `tel:${phone.replace(/[^\d+]/g, "")}`;
}

export default async function ContactPage() {
  const content = await getPublicWebContent();
  const contact = content?.contact ?? null;

  if (!content) {
    return (
      <div className={styles.page}>
        <section className={styles.state} role="status">
          <WifiOff aria-hidden="true" />
          <h1>No pudimos cargar la información de contacto</h1>
          <p>Intenta nuevamente más tarde para consultar nuestros datos de atención y ubicación.</p>
        </section>
      </div>
    );
  }

  if (!contact) {
    return (
      <div className={styles.page}>
        <section className={styles.state}>
          <Building2 aria-hidden="true" />
          <h1>Información de contacto próximamente</h1>
          <p>La clínica está preparando sus datos públicos de atención.</p>
        </section>
      </div>
    );
  }

  const facebookUrl = safeExternalUrl(contact.facebook);
  const instagramUrl = safeExternalUrl(contact.instagram);
  const configuredMapUrl = safeExternalUrl(contact.googleMapsUrl);
  const mapUrl = configuredMapUrl
    ?? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(contact.location)}`;
  const clinicName = contact.shortName || contact.companyName;

  return (
    <div className={styles.page}>
      <section className={styles.hero} aria-labelledby="contact-title">
        <div className={styles.heroInner}>
          <div className={styles.heroCopy}>
            <p className={styles.eyebrow}>Contacto y ubicación</p>
            <h1 id="contact-title">Estamos cerca cuando nos necesitas.</h1>
            <p>{contact.slogan || `Comunícate con ${clinicName} para recibir información sobre nuestros servicios.`}</p>
            <div className={styles.heroActions}>
              <a className={styles.primaryAction} href={telephoneUrl(contact.phone)}>
                <Phone aria-hidden="true" />
                Llamar ahora
              </a>
              <a className={styles.secondaryAction} href={mapUrl} target="_blank" rel="noreferrer">
                <Navigation aria-hidden="true" />
                Cómo llegar
              </a>
            </div>
          </div>

          <div className={styles.heroCard}>
            <span className={styles.heroMark} aria-hidden="true">
              <Building2 />
            </span>
            <div>
              <span>Visítanos en Cobán</span>
              <strong>{clinicName}</strong>
              <p>{contact.location}</p>
            </div>
          </div>
        </div>
      </section>

      <div className={styles.content}>
        <section className={styles.contactSection} aria-labelledby="contact-options-title">
          <header className={styles.sectionHeading}>
            <p className={styles.eyebrow}>Canales de atención</p>
            <h2 id="contact-options-title">Hablemos.</h2>
            <p>Elige el medio que te resulte más cómodo para comunicarte con la clínica.</p>
          </header>

          <div className={styles.contactGrid}>
            <a className={styles.contactCard} href={telephoneUrl(contact.phone)}>
              <span className={styles.contactIcon}><Phone aria-hidden="true" /></span>
              <span className={styles.contactCopy}>
                <span>Teléfono</span>
                <strong>{contact.phone}</strong>
                <small>Toca para llamar</small>
              </span>
              <ExternalLink aria-hidden="true" />
            </a>

            {contact.email && (
              <a className={styles.contactCard} href={`mailto:${contact.email}`}>
                <span className={styles.contactIcon}><Mail aria-hidden="true" /></span>
                <span className={styles.contactCopy}>
                  <span>Correo electrónico</span>
                  <strong>{contact.email}</strong>
                  <small>Escríbenos un mensaje</small>
                </span>
                <ExternalLink aria-hidden="true" />
              </a>
            )}

            {facebookUrl && (
              <a className={styles.contactCard} href={facebookUrl} target="_blank" rel="noreferrer">
                <span className={styles.contactIcon}><MessageCircle aria-hidden="true" /></span>
                <span className={styles.contactCopy}>
                  <span>Facebook</span>
                  <strong>{clinicName}</strong>
                  <small>Visita nuestra página</small>
                </span>
                <ExternalLink aria-hidden="true" />
              </a>
            )}

            {instagramUrl && (
              <a className={styles.contactCard} href={instagramUrl} target="_blank" rel="noreferrer">
                <span className={styles.contactIcon}><Camera aria-hidden="true" /></span>
                <span className={styles.contactCopy}>
                  <span>Instagram</span>
                  <strong>{clinicName}</strong>
                  <small>Conoce nuestras novedades</small>
                </span>
                <ExternalLink aria-hidden="true" />
              </a>
            )}
          </div>
        </section>

        <section className={styles.visitSection} aria-labelledby="visit-title">
          <div className={styles.locationPanel}>
            <div className={styles.locationVisual} aria-hidden="true">
              <span className={styles.locationRing} />
              <span className={styles.locationPin}><MapPin /></span>
            </div>
            <div className={styles.locationCopy}>
              <p className={styles.eyebrow}>Nuestra ubicación</p>
              <h2 id="visit-title">Encuéntranos fácilmente.</h2>
              <address>{contact.location}</address>
              <a href={mapUrl} target="_blank" rel="noreferrer">
                <Navigation aria-hidden="true" />
                Abrir en Google Maps
                <ExternalLink aria-hidden="true" />
              </a>
            </div>
          </div>

          {(contact.weekdayHours || contact.saturdayHours) && (
            <aside className={styles.scheduleCard} aria-labelledby="schedule-title">
              <span className={styles.scheduleIcon}><Clock3 aria-hidden="true" /></span>
              <div>
                <p className={styles.eyebrow}>Horarios</p>
                <h2 id="schedule-title">Atención en clínica</h2>
                <dl>
                  {contact.weekdayHours && (
                    <div>
                      <dt>Horario general</dt>
                      <dd>{contact.weekdayHours}</dd>
                    </div>
                  )}
                  {contact.saturdayHours && (
                    <div>
                      <dt>Sábado</dt>
                      <dd>{contact.saturdayHours}</dd>
                    </div>
                  )}
                </dl>
              </div>
            </aside>
          )}
        </section>
      </div>
    </div>
  );
}
