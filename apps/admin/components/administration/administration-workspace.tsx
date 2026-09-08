"use client";

import { BriefcaseMedical, ClipboardList, ShieldCheck, Stethoscope, Users } from "lucide-react";
import { useState } from "react";
import { PermissionsInfrastructure } from "../erp/permissions-infrastructure";
import { ProfessionalsManager } from "./professionals-manager";
import { ServicesManager } from "./services-manager";
import { SpecialtiesManager } from "./specialties-manager";
import { UsersManager } from "./users-manager";

type AdministrationSection = "users" | "professionals" | "specialties" | "services" | "permissions";

const TABS = [
  { code: "users" as const, label: "Usuarios", Icon: Users },
  { code: "professionals" as const, label: "Profesionales", Icon: Stethoscope },
  { code: "specialties" as const, label: "Especialidades", Icon: BriefcaseMedical },
  { code: "services" as const, label: "Servicios", Icon: ClipboardList },
  { code: "permissions" as const, label: "Permisos", Icon: ShieldCheck },
];

export function AdministrationWorkspace({ canWrite }: Readonly<{ canWrite: boolean }>) {
  const [section, setSection] = useState<AdministrationSection>("users");

  return (
    <section className="administration-workspace" aria-labelledby="administration-title">
      <header className="administration-heading">
        <div>
          <p className="eyebrow">Gestión administrativa</p>
          <h2 id="administration-title">Configuración del ERP</h2>
          <p>Administre cuentas, equipo clínico y catálogos fundamentales desde un solo espacio.</p>
        </div>
        <span className={canWrite ? "access-level-write" : "access-level-read"}>
          <ShieldCheck aria-hidden="true" /> {canWrite ? "Lectura y escritura" : "Solo lectura"}
        </span>
      </header>

      <div className="administration-tabs" role="tablist" aria-label="Áreas administrativas">
        {TABS.map(({ code, label, Icon }) => (
          <button
            key={code}
            type="button"
            role="tab"
            aria-selected={section === code}
            aria-controls={`administration-panel-${code}`}
            className={section === code ? "is-active" : ""}
            onClick={() => setSection(code)}
          >
            <Icon aria-hidden="true" /> {label}
          </button>
        ))}
      </div>

      <div id={`administration-panel-${section}`} role="tabpanel" tabIndex={0}>
        {section === "users" && <UsersManager canWrite={canWrite} />}
        {section === "professionals" && <ProfessionalsManager canWrite={canWrite} />}
        {section === "specialties" && <SpecialtiesManager canWrite={canWrite} />}
        {section === "services" && <ServicesManager canWrite={canWrite} />}
        {section === "permissions" && <PermissionsInfrastructure />}
      </div>
    </section>
  );
}
