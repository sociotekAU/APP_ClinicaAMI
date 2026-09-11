import { LockKeyhole } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import styles from "./public-shell.module.css";

const FOOTER_NAVIGATION = [
  { href: "/", label: "Inicio" },
  { href: "/productos", label: "Productos" },
  { href: "/anuncios", label: "Anuncios" },
  { href: "/contacto", label: "Contacto" },
  { href: "/agendar-cita", label: "Agendar cita" },
] as const;

export function PublicFooter() {
  return (
    <footer className={styles.footer}>
      <div className={styles.footerInner}>
        <div className={styles.footerBrand}>
          <Image src="/brand/logo-ami.png" alt="" width={62} height={60} />
          <div>
            <strong>Clínica A.M.I.</strong>
            <span>Alternativa Médica Integral</span>
          </div>
        </div>

        <nav className={styles.footerNav} aria-label="Navegación del pie de página">
          {FOOTER_NAVIGATION.map((item) => (
            <Link href={item.href} key={item.href}>{item.label}</Link>
          ))}
        </nav>

        <Link className={styles.footerAccess} href="/login">
          <LockKeyhole aria-hidden="true" />
          Acceso administrativo
        </Link>
      </div>
      <div className={styles.footerLegal}>
        <span>© {new Date().getFullYear()} Clínica A.M.I.</span>
        <span>Todos los derechos reservados.</span>
      </div>
    </footer>
  );
}
