import type { Metadata } from "next";
import Image from "next/image";
import { HeartPulse, LockKeyhole, ShieldCheck } from "lucide-react";
import { LoginForm } from "../../components/auth/login-form";

export const metadata: Metadata = {
  title: "Iniciar sesión",
};

export default function LoginPage() {
  return (
    <main className="auth-shell">
      <section className="auth-brand-panel" aria-labelledby="brand-heading">
        <div className="auth-brand-content">
          <Image
            className="brand-logo"
            src="/brand/logo-ami.png"
            alt="Alternativa Médica Integral A.M.I."
            width={300}
            height={288}
            priority
          />
          <div>
            <p className="eyebrow">Alternativa Médica Integral</p>
            <h1 id="brand-heading">Gestión clínica con información segura y oportuna.</h1>
            <p className="brand-copy">
              Un espacio central para coordinar la atención, la operación y los recursos de la clínica.
            </p>
          </div>
          <div className="trust-list" aria-label="Características del acceso">
            <div><ShieldCheck aria-hidden="true" /> Acceso protegido</div>
            <div><HeartPulse aria-hidden="true" /> Entorno clínico</div>
            <div><LockKeyhole aria-hidden="true" /> Sesión privada</div>
          </div>
        </div>
        <p className="brand-footnote">Sistema administrativo y clínico · Fase 5</p>
      </section>

      <section className="auth-form-panel">
        <div className="auth-form-wrap">
          <div className="mobile-brand" aria-hidden="true">
            <Image src="/brand/logo-ami.png" alt="" width={76} height={73} />
            <span>Clínica A.M.I.</span>
          </div>
          <div className="form-heading">
            <p className="eyebrow">Portal interno</p>
            <h2>Bienvenido de nuevo</h2>
            <p>Ingrese sus credenciales para continuar al sistema.</p>
          </div>
          <LoginForm />
          <p className="access-note">
            Este sistema es de uso autorizado. La actividad puede ser registrada con fines de seguridad.
          </p>
        </div>
      </section>
    </main>
  );
}
