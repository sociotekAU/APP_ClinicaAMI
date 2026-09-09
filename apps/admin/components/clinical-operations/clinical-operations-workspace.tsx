"use client";

import { ClipboardPlus, Pill, ShieldCheck, Stethoscope } from "lucide-react";
import { useState } from "react";
import { MedicationsManager } from "./medications-manager";
import { PrescriptionsManager } from "./prescriptions-manager";
import { ProceduresManager } from "./procedures-manager";

type Section = "prescriptions" | "procedures" | "medications";
export function ClinicalOperationsWorkspace({ canWrite }: Readonly<{ canWrite: boolean }>) {
  const [section, setSection] = useState<Section>("prescriptions");
  return <section className="administration-workspace" aria-labelledby="clinical-operations-title">
    <header className="administration-heading"><div><p className="eyebrow">Tratamiento clínico</p><h2 id="clinical-operations-title">Recetas y procedimientos</h2><p>Emita prescripciones y registre terapias sin eliminar el historial asistencial.</p></div><span className={canWrite ? "access-level-write" : "access-level-read"}><ShieldCheck aria-hidden="true" /> {canWrite ? "Lectura y escritura" : "Solo lectura"}</span></header>
    <div className="administration-tabs" role="tablist" aria-label="Recetas y procedimientos">{([{ code: "prescriptions", label: "Recetas", Icon: ClipboardPlus }, { code: "procedures", label: "Procedimientos", Icon: Stethoscope }, { code: "medications", label: "Medicamentos", Icon: Pill }] as const).map(({ code, label, Icon }) => <button key={code} type="button" role="tab" aria-selected={section === code} className={section === code ? "is-active" : ""} onClick={() => setSection(code)}><Icon aria-hidden="true" /> {label}</button>)}</div>
    <div role="tabpanel" tabIndex={0}>{section === "prescriptions" ? <PrescriptionsManager canWrite={canWrite} /> : section === "procedures" ? <ProceduresManager canWrite={canWrite} /> : <MedicationsManager canWrite={canWrite} />}</div>
  </section>;
}
