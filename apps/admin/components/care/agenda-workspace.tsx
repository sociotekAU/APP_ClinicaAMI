"use client";

import { CalendarDays, DoorOpen, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { AppointmentsManager } from "./appointments-manager";
import { ClinicsManager } from "./clinics-manager";

export function AgendaWorkspace({ canWrite }: Readonly<{ canWrite: boolean }>) {
  const [section, setSection] = useState<"appointments" | "clinics">("appointments");
  return <section className="administration-workspace" aria-labelledby="agenda-workspace-title">
    <header className="administration-heading"><div><p className="eyebrow">Operación diaria</p><h2 id="agenda-workspace-title">Agenda clínica</h2><p>Coordine citas y espacios de atención desde un mismo módulo.</p></div><span className={canWrite ? "access-level-write" : "access-level-read"}><ShieldCheck aria-hidden="true" /> {canWrite ? "Lectura y escritura" : "Solo lectura"}</span></header>
    <div className="administration-tabs" role="tablist" aria-label="Áreas de agenda">
      <button type="button" role="tab" aria-selected={section === "appointments"} className={section === "appointments" ? "is-active" : ""} onClick={() => setSection("appointments")}><CalendarDays aria-hidden="true" /> Citas</button>
      <button type="button" role="tab" aria-selected={section === "clinics"} className={section === "clinics" ? "is-active" : ""} onClick={() => setSection("clinics")}><DoorOpen aria-hidden="true" /> Consultorios</button>
    </div>
    <div role="tabpanel" tabIndex={0}>{section === "appointments" ? <AppointmentsManager canWrite={canWrite} /> : <ClinicsManager canWrite={canWrite} />}</div>
  </section>;
}
