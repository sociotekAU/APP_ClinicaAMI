"use client";

import { ArrowLeft, Check, LockKeyhole, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { getModuleIcon, useErpContext } from "./erp-shell";

export function ModulePlaceholder({ moduleCode }: Readonly<{ moduleCode: string }>) {
  const context = useErpContext();
  const item = context.navigation.find((entry) => entry.module === moduleCode);
  const permission = context.permissions.find((entry) => entry.module === moduleCode);

  if (!item || !permission?.canRead) {
    return (
      <section className="module-access-denied" aria-labelledby="denied-title">
        <span><LockKeyhole aria-hidden="true" /></span>
        <p className="eyebrow">Código 403 · AUTH_FORBIDDEN</p>
        <h2 id="denied-title">Módulo no autorizado</h2>
        <p>Este módulo no está habilitado para el rol {context.user.role.name}.</p>
        <Link className="button button-primary" href="/panel"><ArrowLeft aria-hidden="true" /> Volver al inicio</Link>
      </section>
    );
  }

  const Icon = getModuleIcon(item.module);
  return (
    <div className="module-page">
      <section className="module-intro">
        <span className="module-intro-icon"><Icon aria-hidden="true" /></span>
        <div>
          <p className="eyebrow">{item.section}</p>
          <h2>{item.label}</h2>
          <p>{item.description}</p>
        </div>
      </section>

      <section className="module-readiness" aria-labelledby="readiness-title">
        <div>
          <p className="eyebrow">Base de autorización lista</p>
          <h2 id="readiness-title">Permisos efectivos del rol</h2>
          <p>El contenido funcional de este módulo se incorporará en los pasos de CRUD posteriores.</p>
        </div>
        <ul>
          <li className={permission.canRead ? "is-granted" : ""}>
            {permission.canRead ? <Check aria-hidden="true" /> : <LockKeyhole aria-hidden="true" />}
            Lectura
          </li>
          <li className={permission.canWrite ? "is-granted" : ""}>
            {permission.canWrite ? <Check aria-hidden="true" /> : <LockKeyhole aria-hidden="true" />}
            Escritura
          </li>
          <li className={permission.canDelete ? "is-granted" : ""}>
            {permission.canDelete ? <Check aria-hidden="true" /> : <LockKeyhole aria-hidden="true" />}
            Eliminación
          </li>
        </ul>
        <div className="module-security-note">
          <ShieldCheck aria-hidden="true" />
          <p>La interfaz oculta accesos no autorizados y el API vuelve a validar el permiso contra PostgreSQL.</p>
        </div>
      </section>
    </div>
  );
}
