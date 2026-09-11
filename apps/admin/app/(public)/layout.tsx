import type { ReactNode } from "react";
import { PublicFooter } from "../../components/public-site/public-footer";
import { PublicHeader } from "../../components/public-site/public-header";
import styles from "../../components/public-site/public-shell.module.css";

export default function PublicLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <div className={styles.siteShell}>
      <a className={styles.skipLink} href="#contenido-principal">
        Ir al contenido principal
      </a>
      <PublicHeader />
      <main className={styles.main} id="contenido-principal">
        {children}
      </main>
      <PublicFooter />
    </div>
  );
}
