import type { Metadata } from "next";
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
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import styles from "./home.module.css";

export const metadata: Metadata = {
  title: "Inicio",
  description: "Servicios médicos integrales y atención profesional en Cobán, Alta Verapaz.",
};

const SERVICES = [
  { name: "Medicina biológica integrativa", Icon: HeartPulse },
  { name: "Nutrición", Icon: Apple },
  { name: "Fisioterapia", Icon: Activity },
  { name: "Ginecología y obstetricia", Icon: Baby },
  { name: "Terapia de lenguaje", Icon: Speech },
  { name: "Psicología", Icon: Brain },
  { name: "Quiropraxia", Icon: Bone },
  { name: "Laboratorio clínico", Icon: FlaskConical },
] as const;

const PROFESSIONALS = [
  {
    name: "Dr. Moisés Valdez",
    specialty: "Medicina biológica",
    image: "/site/home/professional-moises.jpg",
  },
  {
    name: "Dra. Mónica Quiroa",
    specialty: "Ginecología y obstetricia",
    image: "/site/home/professional-monica.jpg",
  },
  {
    name: "Lcda. Carla Martínez",
    specialty: "Nutrición",
    image: "/site/home/professional-carla.jpg",
  },
  {
    name: "Lcda. Lianabel Castañeda",
    specialty: "Psicología clínica y terapia de lenguaje",
    image: "/site/home/professional-lianabel.jpg",
  },
] as const;

export default function HomePage() {
  return (
    <div className={styles.home}>
      <section className={styles.hero} aria-labelledby="public-home-title">
        <div className={styles.heroInner}>
          <div className={styles.heroCopy}>
            <p className={styles.eyebrow}>Desde 2010 · Cobán, Alta Verapaz</p>
            <h1 id="public-home-title">Atención médica que mira a la persona completa.</h1>
            <p className={styles.heroLead}>
              Especialidades, terapias y diagnóstico clínico reunidos para acompañar tu bienestar
              con una atención cercana.
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
            <Image
              src="/site/home/hero-doctor.jpg"
              alt="Profesional de Clínica A.M.I."
              fill
              priority
              sizes="(max-width: 56rem) 100vw, 52vw"
            />
            <div className={styles.heroLocation}>
              <MapPin aria-hidden="true" />
              <div>
                <strong>Clínica Integral A.M.I.</strong>
                <span>9a. avenida 2-36 zona 3, Cobán</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.contactStrip} aria-label="Información rápida">
        <div>
          <Clock3 aria-hidden="true" />
          <span><strong>Lunes a viernes</strong> 08:00–12:00 y 14:00–18:00</span>
        </div>
        <div>
          <CalendarDays aria-hidden="true" />
          <span><strong>Sábado</strong> previa cita</span>
        </div>
        <a href="tel:+50254133082">
          <Phone aria-hidden="true" />
          <span><strong>Llámanos</strong> 5413-3082</span>
        </a>
      </section>

      <section className={styles.section} id="servicios" aria-labelledby="services-title">
        <div className={styles.sectionHeading}>
          <div>
            <p className={styles.eyebrow}>Atención integral</p>
            <h2 id="services-title">Servicios para cuidar de ti</h2>
          </div>
          <p>Distintas áreas profesionales coordinadas en un mismo lugar.</p>
        </div>
        <div className={styles.servicesGrid}>
          {SERVICES.map(({ name, Icon }, index) => (
            <article className={styles.serviceCard} key={name}>
              <span className={styles.serviceNumber}>{String(index + 1).padStart(2, "0")}</span>
              <span className={styles.serviceIcon}><Icon aria-hidden="true" /></span>
              <h3>{name}</h3>
            </article>
          ))}
        </div>
      </section>

      <section className={`${styles.section} ${styles.gallerySection}`} aria-labelledby="gallery-title">
        <div className={styles.sectionHeading}>
          <div>
            <p className={styles.eyebrow}>Clínica A.M.I.</p>
            <h2 id="gallery-title">Nuestros espacios y atención</h2>
          </div>
          <p>Conoce el lugar y algunas de las áreas donde cuidamos tu salud.</p>
        </div>
        <div className={styles.galleryGrid}>
          <figure className={styles.galleryPrimary}>
            <Image
              src="/site/home/gallery-clinic.jpg"
              alt="Fachada de Clínica Integral A.M.I. en Cobán"
              fill
              sizes="(max-width: 48rem) 100vw, 60vw"
            />
            <figcaption>Clínica Integral A.M.I.</figcaption>
          </figure>
          <figure>
            <Image
              src="/site/home/gallery-laboratory.jpg"
              alt="Área de laboratorio clínico"
              fill
              sizes="(max-width: 48rem) 100vw, 32vw"
            />
            <figcaption>Laboratorio clínico</figcaption>
          </figure>
          <figure>
            <Image
              src="/site/home/gallery-consultation.jpg"
              alt="Consulta de medicina biológica"
              fill
              sizes="(max-width: 48rem) 100vw, 32vw"
            />
            <figcaption>Atención profesional</figcaption>
          </figure>
        </div>
      </section>

      <section className={styles.professionalsSection} aria-labelledby="professionals-title">
        <div className={styles.professionalsInner}>
          <div className={`${styles.sectionHeading} ${styles.professionalsHeading}`}>
            <div>
              <p className={styles.eyebrow}>Nuestro equipo</p>
              <h2 id="professionals-title">Profesionales que te acompañan</h2>
            </div>
            <p>Atención especializada con una visión integral de tu bienestar.</p>
          </div>
          <div className={styles.professionalsGrid}>
            {PROFESSIONALS.map((professional) => (
              <article className={styles.professionalCard} key={professional.name}>
                <div className={styles.professionalPhoto}>
                  <Image
                    src={professional.image}
                    alt={professional.name}
                    fill
                    sizes="(max-width: 38rem) 100vw, (max-width: 70rem) 50vw, 25vw"
                  />
                </div>
                <div>
                  <h3>{professional.name}</h3>
                  <p>{professional.specialty}</p>
                </div>
              </article>
            ))}
          </div>
          <div className={styles.professionalsAction}>
            <p>¿Deseas consultar con nuestro equipo?</p>
            <Link href="/agendar-cita">
              Solicitar una cita <ArrowRight aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
