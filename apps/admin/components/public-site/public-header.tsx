import { CalendarDays, LockKeyhole, Menu } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import styles from "./public-shell.module.css";

const NAVIGATION = [
  { href: "/", label: "Inicio" },
  { href: "/productos", label: "Productos" },
  { href: "/anuncios", label: "Anuncios" },
  { href: "/contacto", label: "Contacto" },
] as const;

function NavigationLinks({ mobile = false }: Readonly<{ mobile?: boolean }>) {
  return (
    <>
      {NAVIGATION.map((item) => (
        <Link className={mobile ? styles.mobileNavLink : styles.navLink} href={item.href} key={item.href}>
          {item.label}
        </Link>
      ))}
    </>
  );
}

export function PublicHeader() {
  return (
    <header className={styles.header}>
      <div className={styles.headerInner}>
        <Link className={styles.brand} href="/" aria-label="Clínica A.M.I., ir al inicio">
          <Image
            className={styles.brandLogo}
            src="/brand/logo-ami.png"
            alt=""
            width={74}
            height={72}
            priority
          />
          <span className={styles.brandCopy}>
            <strong>Clínica A.M.I.</strong>
            <span>Alternativa Médica Integral</span>
          </span>
        </Link>

        <nav className={styles.desktopNav} aria-label="Navegación principal">
          <NavigationLinks />
        </nav>

        <div className={styles.headerActions}>
          <Link className={styles.loginLink} href="/login">
            <LockKeyhole aria-hidden="true" />
            <span>Acceso</span>
          </Link>
          <Link className={styles.appointmentLink} href="/agendar-cita">
            <CalendarDays aria-hidden="true" />
            Agendar cita
          </Link>
        </div>

        <details className={styles.mobileMenu}>
          <summary aria-label="Abrir menú de navegación">
            <Menu aria-hidden="true" />
          </summary>
          <nav className={styles.mobileNav} aria-label="Navegación móvil">
            <NavigationLinks mobile />
            <Link className={styles.mobileAppointmentLink} href="/agendar-cita">
              <CalendarDays aria-hidden="true" />
              Agendar cita
            </Link>
            <Link className={styles.mobileAccessLink} href="/login">
              <LockKeyhole aria-hidden="true" />
              Acceso al sistema
            </Link>
          </nav>
        </details>
      </div>
    </header>
  );
}
