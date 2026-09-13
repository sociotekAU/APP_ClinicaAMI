import { ArrowLeft, Compass, Home } from "lucide-react";
import Link from "next/link";
import { PublicFooter } from "../components/public-site/public-footer";
import { PublicHeader } from "../components/public-site/public-header";
import stateStyles from "../components/public-site/public-route-state.module.css";
import shellStyles from "../components/public-site/public-shell.module.css";

export default function NotFound() {
  return (
    <div className={shellStyles.siteShell}>
      <a className={shellStyles.skipLink} href="#contenido-principal">
        Ir al contenido principal
      </a>
      <PublicHeader />
      <main className={shellStyles.main} id="contenido-principal">
        <section className={stateStyles.page} aria-labelledby="public-not-found-title">
          <span className={`${stateStyles.orbit} ${stateStyles.orbitOne}`} aria-hidden="true" />
          <span className={`${stateStyles.orbit} ${stateStyles.orbitTwo}`} aria-hidden="true" />
          <span className={stateStyles.statusCode} aria-hidden="true">404</span>
          <div className={stateStyles.card}>
            <span className={stateStyles.icon} aria-hidden="true">
              <Compass />
            </span>
            <p className={stateStyles.eyebrow}>Página no encontrada</p>
            <h1 id="public-not-found-title">Este camino no lleva a la clínica.</h1>
            <p className={stateStyles.description}>
              Es posible que la dirección haya cambiado, esté incompleta o que la página ya no se encuentre disponible.
            </p>
            <div className={stateStyles.actions}>
              <Link className={stateStyles.primaryAction} href="/">
                <Home aria-hidden="true" />
                Volver al inicio
              </Link>
              <Link className={stateStyles.secondaryAction} href="/productos">
                <ArrowLeft aria-hidden="true" />
                Ver productos
              </Link>
            </div>
          </div>
        </section>
      </main>
      <PublicFooter />
    </div>
  );
}
