import type { Metadata } from "next";
import Image from "next/image";
import { KeyRound, ShieldCheck } from "lucide-react";
import { ChangePasswordForm } from "../../components/auth/change-password-form";

export const metadata: Metadata = {
  title: "Actualizar contraseña",
};

export default function ChangePasswordPage() {
  return (
    <main className="secure-page">
      <section className="secure-card" aria-labelledby="password-title">
        <div className="secure-card-brand">
          <Image src="/brand/logo-ami.png" alt="Clínica A.M.I." width={88} height={84} />
          <span>Clínica A.M.I.</span>
        </div>
        <div className="secure-icon"><KeyRound aria-hidden="true" /></div>
        <p className="eyebrow">Protección de la cuenta</p>
        <h1 id="password-title">Cree una contraseña personal</h1>
        <p className="secure-intro">
          Por seguridad, debe reemplazar la contraseña temporal antes de usar el sistema.
        </p>
        <ChangePasswordForm />
        <p className="secure-note"><ShieldCheck aria-hidden="true" /> Sus credenciales se transmiten de forma protegida.</p>
      </section>
    </main>
  );
}
