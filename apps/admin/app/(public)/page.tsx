import type { Metadata } from "next";
import type { CSSProperties } from "react";
import {
  Activity,
  Apple,
  ArrowRight,
  Baby,
  Bone,
  Brain,
  CalendarDays,
  Clock3,
  FlaskConical,
  HeartPulse,
  MapPin,
  Phone,
  Speech,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { PublicGalleryCarousel, Reveal } from "../../components/public-site/public-home-interactions";
import { getPublicWebContent } from "../../lib/public-web-content";
import styles from "./home.module.css";

export const metadata: Metadata = {
  title: "Inicio",
  description: "Servicios médicos integrales y atención profesional en Cobán, Alta Verapaz.",
};

const HOME_BANNER_URL = "https://ik.imagekit.io/sociotek79/AMIclinica/IA/ban2.jpg?updatedAt=1788816453443";

const SERVICE_ICONS: ReadonlyArray<{ pattern: RegExp; Icon: LucideIcon }> = [
  { pattern: /nutric/i, Icon: Apple },
  { pattern: /fisio|terapia física/i, Icon: Activity },
  { pattern: /gineco|obstetri/i, Icon: Baby },
  { pattern: /lenguaje|habla/i, Icon: Speech },
  { pattern: /psico/i, Icon: Brain },
  { pattern: /quiropr|columna|óseo/i, Icon: Bone },
  { pattern: /laboratorio|diagnóstico/i, Icon: FlaskConical },
];

function serviceIcon(name: string): LucideIcon {
  return SERVICE_ICONS.find(({ pattern }) => pattern.test(name))?.Icon ?? HeartPulse;
}

function safeMediaUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  if (/^https?:\/\/[^\s]+$/i.test(value)) return value;
  return /^\/(?!\/)[^\s]*$/.test(value) ? value : null;
}

function safeExternalUrl(value: string | null | undefined): string | null {
  return value && /^https?:\/\/[^\s]+$/i.test(value) ? value : null;
}

function telephoneHref(phone: string): string {
  return `tel:${phone.replace(/[^\d+]/g, "")}`;
}

function ContentState({ unavailable, subject }: Readonly<{ unavailable: boolean; subject: string }>) {
  return (
    <p className={styles.contentState} role={unavailable ? "status" : undefined}>
      {unavailable
        ? `No pudimos cargar ${subject} en este momento. Intenta nuevamente más tarde.`
        : `No hay ${subject} publicados por el momento.`}
    </p>
  );
}

export default async function HomePage() {
  const content = await getPublicWebContent();
  const contact = content?.contact;
  const services = content?.services ?? [];
  const gallery = content?.gallery ?? [];
  const professionals = content?.professionals ?? [];
  const galleryItems = gallery.flatMap((item) => {
    const imageUrl = safeMediaUrl(item.imageUrl);
    return imageUrl ? [{ ...item, imageUrl }] : [];
  });
  const professionalsWithPhoto = professionals.flatMap((professional) => {
    const photoUrl = safeMediaUrl(professional.photoUrl);
    return photoUrl ? [{ professional, photoUrl }] : [];
  });
  const professionalsWithoutPhoto = professionals.filter((professional) => !safeMediaUrl(professional.photoUrl));
  const contentUnavailable = content === null;
  const phone = contact?.phone ?? "5413-3082";
  const mapsUrl = safeExternalUrl(contact?.googleMapsUrl);
  const heroVideoUrl = safeMediaUrl(contact?.homeVideoUrl);

  return (
    <div className={styles.home}>
      <section className={styles.hero} aria-labelledby="public-home-title">
        <div className={styles.heroInner}>
          <div className={styles.heroCopy}>
            <p className={styles.eyebrow}>Desde 2010 · Cobán, Alta Verapaz</p>
            <h1 id="public-home-title">Atención médica que mira a la persona completa.</h1>
            <p className={styles.heroLead}>
              {contact?.slogan ?? "Especialidades, terapias y diagnóstico clínico reunidos para acompañar tu bienestar con una atención cercana."}
            </p>
            <div className={styles.heroActions}>
              <Link className={styles.primaryAction} href="/agendar-cita">
                <CalendarDays aria-hidden="true" /> Agendar cita
              </Link>
              <a className={styles.secondaryAction} href="#servicios">
                Conocer servicios <ArrowRight aria-hidden="true" />
              </a>
            </div>
          </div>

          <div className={styles.heroVisual}>
            {heroVideoUrl
              ? <video src={heroVideoUrl} autoPlay loop muted playsInline preload="metadata" aria-hidden="true" />
              : (
                  <img
                    src={HOME_BANNER_URL}
                    alt="Clínica A.M.I., atención integral para tu salud y bienestar"
                    decoding="async"
                    fetchPriority="high"
                  />
                )}
            {mapsUrl
              ? (
                  <a className={styles.heroLocation} href={mapsUrl} target="_blank" rel="noreferrer">
                    <MapPin aria-hidden="true" />
                    <span>
                      <strong>{contact?.shortName ?? contact?.companyName ?? "Clínica Integral A.M.I."}</strong>
                      <span>{contact?.location ?? "9a. avenida 2-36 zona 3, Cobán"}</span>
                    </span>
                  </a>
                )
              : (
                  <div className={styles.heroLocation}>
                    <MapPin aria-hidden="true" />
                    <span>
                      <strong>{contact?.shortName ?? contact?.companyName ?? "Clínica Integral A.M.I."}</strong>
                      <span>{contact?.location ?? "9a. avenida 2-36 zona 3, Cobán"}</span>
                    </span>
                  </div>
                )}
          </div>
        </div>
      </section>

      <section className={styles.contactStrip} aria-label="Información rápida">
        <div>
          <Clock3 aria-hidden="true" />
          <span><strong>Horario de atención</strong> {contact?.weekdayHours ?? "Lunes a viernes, 08:00–12:00 y 14:00–18:00"}</span>
        </div>
        <div>
          <CalendarDays aria-hidden="true" />
          <span><strong>Sábado</strong> {contact?.saturdayHours ?? "Previa cita"}</span>
        </div>
        <a href={telephoneHref(phone)}>
          <Phone aria-hidden="true" />
          <span><strong>Llámanos</strong> {phone}</span>
        </a>
      </section>

      <Reveal delay={80}>
        <section className={styles.section} id="servicios" aria-labelledby="services-title">
          <div className={styles.sectionHeading}>
            <div>
              <p className={styles.eyebrow}>Atención integral</p>
              <h2 id="services-title">SERVICIOS QUE CUIDAN DE TI</h2>
            </div>
            <p>Distintas áreas profesionales coordinadas en un mismo lugar.</p>
          </div>
          {services.length > 0
            ? (
                <div className={styles.servicesGrid}>
                  {services.map((service, index) => {
                    const Icon = serviceIcon(service.name);
                    return (
                      <article className={styles.serviceCard} key={service.id} style={{ "--card-delay": `${index * 70}ms` } as CSSProperties}>
                        <span className={styles.serviceNumber}>{String(index + 1).padStart(2, "0")}</span>
                        <span className={styles.serviceIcon}><Icon aria-hidden="true" /></span>
                        <h3>{service.name}</h3>
                        {service.description && <p>{service.description}</p>}
                      </article>
                    );
                  })}
                </div>
              )
            : <ContentState unavailable={contentUnavailable} subject="servicios" />}
        </section>
      </Reveal>

      <Reveal delay={80}>
        <section className={`${styles.section} ${styles.gallerySection}`} aria-labelledby="gallery-title">
          <div className={styles.sectionHeading}>
            <div>
              <p className={styles.eyebrow}>Clínica A.M.I.</p>
              <h2 id="gallery-title">Nuestros espacios y atención</h2>
            </div>
            <p>Recorre nuestras instalaciones. Selecciona una imagen para verla en detalle.</p>
          </div>
          {galleryItems.length > 0
            ? <PublicGalleryCarousel items={galleryItems} />
            : <ContentState unavailable={contentUnavailable} subject="imágenes de galería" />}
        </section>
      </Reveal>

      <Reveal>
        <section className={styles.professionalsSection} aria-labelledby="professionals-title">
          <div className={styles.professionalsInner}>
            <div className={`${styles.sectionHeading} ${styles.professionalsHeading}`}>
              <div>
                <p className={styles.eyebrow}>Nuestro equipo</p>
                <h2 id="professionals-title">Profesionales que te acompañan</h2>
              </div>
              <p>Atención especializada con una visión integral de tu bienestar.</p>
            </div>
            {professionals.length > 0
              ? (
                  <>
                    {professionalsWithPhoto.length > 0 && (
                      <div className={styles.professionalsGrid}>
                        {professionalsWithPhoto.map(({ professional, photoUrl }) => (
                          <article className={styles.professionalCard} key={professional.id}>
                            <div className={styles.professionalPhoto}>
                              <img src={photoUrl} alt={`Fotografía de ${professional.name}`} width="720" height="780" loading="lazy" />
                            </div>
                            <div>
                              <h3>{professional.name}</h3>
                              <p>{professional.specialty}</p>
                              {professional.publicProfile && <p className={styles.professionalProfile}>{professional.publicProfile}</p>}
                            </div>
                          </article>
                        ))}
                      </div>
                    )}
                    {professionalsWithoutPhoto.length > 0 && (
                      <div className={styles.professionalsDirectory}>
                        <p className={styles.directoryLabel}>Más especialistas</p>
                        <div className={styles.professionalsDirectoryGrid}>
                          {professionalsWithoutPhoto.map((professional) => (
                            <article className={styles.professionalDirectoryCard} key={professional.id}>
                              <h3>{professional.name}</h3>
                              <p>{professional.specialty}</p>
                            </article>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )
              : <ContentState unavailable={contentUnavailable} subject="profesionales" />}
            <div className={styles.professionalsAction}>
              <p>¿Deseas consultar con nuestro equipo?</p>
              <Link href="/agendar-cita">
                Solicitar una cita <ArrowRight aria-hidden="true" />
              </Link>
            </div>
          </div>
        </section>
      </Reveal>
    </div>
  );
}
