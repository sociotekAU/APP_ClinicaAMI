"use client";

import type { AuthSession } from "@ami/contracts";
import { Activity, Building2, LoaderCircle, LogOut, ShieldCheck } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { apiRequest } from "../../lib/api-client";
import { confirmLogout, showError } from "../../lib/alerts";

export function SessionPanel() {
  const router = useRouter();
  const [session, setSession] = useState<AuthSession | null>(null);

  useEffect(() => {
    let active = true;
    apiRequest<AuthSession>("/auth/me")
      .then((currentSession) => {
        if (!active) return;
        if (currentSession.user.mustChangePassword) {
          router.replace("/cambiar-contrasena");
          return;
        }
        setSession(currentSession);
      })
      .catch(() => {
        if (active) router.replace("/login");
      });
    return () => { active = false; };
  }, [router]);

  async function logout() {
    if (!(await confirmLogout())) return;
    try {
      await apiRequest<{ loggedOut: true }>("/auth/logout", { method: "POST" }, false);
    } catch {
      await showError("No se pudo cerrar la sesión", "Inténtelo nuevamente en unos segundos.");
      return;
    }
    router.replace("/login");
  }

  if (!session) {
    return (
      <main className="session-loading">
        <LoaderCircle className="spin" aria-hidden="true" />
        <p>Verificando sesión segura…</p>
      </main>
    );
  }

  const initials = session.user.name
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  return (
    <main className="panel-shell">
      <aside className="panel-sidebar">
        <div className="panel-brand">
          <Image src="/brand/logo-ami.png" alt="Clínica A.M.I." width={56} height={54} />
          <div><strong>Clínica A.M.I.</strong><span>Sistema ERP</span></div>
        </div>
        <nav aria-label="Navegación principal">
          <a className="nav-item nav-item-active" href="/panel"><Activity aria-hidden="true" /> Inicio</a>
        </nav>
        <p className="sidebar-note">Los módulos por rol se habilitarán en el siguiente paso, tras la revisión manual.</p>
      </aside>
      <section className="panel-main">
        <header className="panel-header">
          <div>
            <p className="eyebrow">Sesión activa</p>
            <h1>Panel administrativo</h1>
          </div>
          <div className="profile-summary">
            <span className="profile-avatar" aria-hidden="true">{initials}</span>
            <div><strong>{session.user.name}</strong><span>{session.user.role.name}</span></div>
            <button className="button button-secondary button-compact" type="button" onClick={logout}>
              <LogOut aria-hidden="true" /> Cerrar sesión
            </button>
          </div>
        </header>
        <div className="panel-content">
          <section className="welcome-card">
            <div className="welcome-icon"><Building2 aria-hidden="true" /></div>
            <div>
              <p className="eyebrow">Bienvenido</p>
              <h2>{session.user.name}</h2>
              <p>Su identidad fue validada correctamente. El entorno administrativo está listo para incorporar los módulos clínicos.</p>
            </div>
          </section>
          <section className="security-card">
            <ShieldCheck aria-hidden="true" />
            <div><strong>Acceso protegido</strong><p>La sesión usa cookies privadas y se renueva sin exponer credenciales en el navegador.</p></div>
          </section>
        </div>
      </section>
    </main>
  );
}
