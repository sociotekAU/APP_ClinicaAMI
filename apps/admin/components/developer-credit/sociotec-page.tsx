"use client";

import Link from "next/link";
import {
  ArrowDown,
  ArrowLeft,
  Code2,
  Globe2,
  Lightbulb,
  Phone,
  RefreshCw,
  Rocket,
  UsersRound,
} from "lucide-react";
import { useEffect, useState } from "react";

import { SOCIOTEC_CREDIT } from "./developer-credit.config";
import styles from "./sociotec-page.module.css";

export function SociotecPage() {
  const [motionAllowed, setMotionAllowed] = useState(false);
  const [motionPreferenceReady, setMotionPreferenceReady] = useState(false);
  const [videoFailed, setVideoFailed] = useState(false);
  const [logoFailed, setLogoFailed] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

    const updateMotionPreference = () => {
      setMotionAllowed(!mediaQuery.matches);
      setMotionPreferenceReady(true);
    };

    updateMotionPreference();
    mediaQuery.addEventListener("change", updateMotionPreference);
    return () => mediaQuery.removeEventListener("change", updateMotionPreference);
  }, []);

  const staticExperience =
    motionPreferenceReady && (!motionAllowed || videoFailed);

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <a className={styles.wordmark} href="#inicio" aria-label="SOCIOTEC, inicio">
          <Code2 size={20} aria-hidden="true" />
          <span>SOCIOTEC</span>
        </a>
        <Link className={styles.backLink} href="/login">
          <ArrowLeft size={17} aria-hidden="true" />
          Volver al sistema
        </Link>
      </header>

      <main>
        <section id="inicio" className={styles.hero} aria-labelledby="credit-title">
          {motionAllowed && !videoFailed ? (
            <video
              className={styles.heroVideo}
              autoPlay
              loop
              muted
              playsInline
              preload="metadata"
              aria-hidden="true"
              onError={() => setVideoFailed(true)}
            >
              <source src={SOCIOTEC_CREDIT.videoUrl} type="video/mp4" />
            </video>
          ) : null}
          <div className={styles.heroPattern} aria-hidden="true" />
          <div className={styles.heroOverlay} aria-hidden="true" />

          <div className={styles.heroContent}>
            <div className={styles.logoFrame}>
              {logoFailed ? (
                <span aria-label="SOCIOTEC">SO</span>
              ) : (
                <img
                  src={SOCIOTEC_CREDIT.logoUrl}
                  alt="Logotipo de SOCIOTEC"
                  onError={() => setLogoFailed(true)}
                />
              )}
            </div>
            <p className={styles.eyebrow}>Este sistema fue desarrollado por</p>
            <h1 id="credit-title">SOCIOTEC</h1>
            <p className={styles.heroLead}>
              Tecnología creada con intención, detalle y compromiso para acompañar
              el crecimiento de Clínica AMI.
            </p>
            {staticExperience ? (
              <p className={styles.staticNotice} role="status">
                Experiencia visual estática activa.
              </p>
            ) : null}
          </div>

          <a className={styles.scrollLink} href="#agradecimiento">
            Conoce este proyecto
            <ArrowDown size={18} aria-hidden="true" />
          </a>
        </section>

        <section id="agradecimiento" className={styles.thanksSection}>
          <div className={styles.sectionIntro}>
            <span>Gracias por confiar</span>
            <h2>Un proyecto que sigue creciendo con ustedes</h2>
            <p>
              Agradecemos a Clínica AMI la oportunidad de transformar sus procesos
              en una herramienta construida alrededor del trabajo de su equipo. Este
              lanzamiento no marca un cierre: es el comienzo de una colaboración que
              puede evolucionar con nuevas necesidades, ideas y oportunidades.
            </p>
          </div>

          <div className={styles.commitmentGrid}>
            <article>
              <RefreshCw aria-hidden="true" />
              <h3>Ajustes continuos</h3>
              <p>
                Podemos afinar flujos, pantallas y reportes conforme el uso diario
                revele nuevas oportunidades de mejora.
              </p>
            </article>
            <article>
              <Lightbulb aria-hidden="true" />
              <h3>Nuevas funciones</h3>
              <p>
                Estamos listos para convertir nuevas ideas clínicas y administrativas
                en funciones claras, seguras y útiles.
              </p>
            </article>
            <article>
              <Rocket aria-hidden="true" />
              <h3>Próximos proyectos</h3>
              <p>
                Será un gusto acompañar futuras iniciativas digitales y construir
                soluciones a la medida de sus siguientes metas.
              </p>
            </article>
          </div>
        </section>

        <section className={styles.verseSection} aria-labelledby="verse-title">
          <p id="verse-title">La convicción que guía nuestro trabajo</p>
          <blockquote>“{SOCIOTEC_CREDIT.verse}”</blockquote>
          <cite>{SOCIOTEC_CREDIT.verseReference}</cite>
        </section>

        <section className={styles.contactSection} aria-labelledby="contact-title">
          <div>
            <span>Sigamos construyendo</span>
            <h2 id="contact-title">Hablemos de la siguiente idea</h2>
            <p>
              Creamos soluciones web y software personalizado para organizaciones
              que quieren trabajar mejor y crecer con una base tecnológica sólida.
            </p>
          </div>

          <div className={styles.contactLinks}>
            <a href={SOCIOTEC_CREDIT.phoneHref}>
              <Phone aria-hidden="true" />
              <span>
                <small>Teléfono</small>
                {SOCIOTEC_CREDIT.phoneDisplay}
              </span>
            </a>
            <a
              href={SOCIOTEC_CREDIT.websiteUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Globe2 aria-hidden="true" />
              <span>
                <small>Sitio web</small>
                info.sociotec.vip
              </span>
            </a>
            <a
              href={SOCIOTEC_CREDIT.facebookUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              <UsersRound aria-hidden="true" />
              <span>
                <small>Facebook</small>
                SOCIOTEC
              </span>
            </a>
          </div>
        </section>
      </main>

      <footer className={styles.footer}>
        <span>© {new Date().getFullYear()} SOCIOTEC</span>
        <span>Soluciones web y software a la medida.</span>
      </footer>
    </div>
  );
}
