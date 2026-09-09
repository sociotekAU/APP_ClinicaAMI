"use client";

import { FlaskConical, ListChecks, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { LabOrdersManager } from "./lab-orders-manager";
import { LabTestsManager } from "./lab-tests-manager";

export function LaboratoryWorkspace({ canWrite }: Readonly<{ canWrite: boolean }>) {
  const [section, setSection] = useState<"orders" | "tests">("orders");
  return <section className="administration-workspace" aria-labelledby="laboratory-title"><header className="administration-heading"><div><p className="eyebrow">Diagnóstico auxiliar</p><h2 id="laboratory-title">Laboratorio clínico</h2><p>Administre solicitudes, captura de resultados y catálogo de pruebas.</p></div><span className={canWrite ? "access-level-write" : "access-level-read"}><ShieldCheck aria-hidden="true" /> {canWrite ? "Lectura y escritura" : "Solo lectura"}</span></header><div className="administration-tabs" role="tablist" aria-label="Áreas de laboratorio"><button type="button" role="tab" aria-selected={section === "orders"} className={section === "orders" ? "is-active" : ""} onClick={() => setSection("orders")}><ListChecks aria-hidden="true" /> Órdenes</button><button type="button" role="tab" aria-selected={section === "tests"} className={section === "tests" ? "is-active" : ""} onClick={() => setSection("tests")}><FlaskConical aria-hidden="true" /> Catálogo de exámenes</button></div><div role="tabpanel" tabIndex={0}>{section === "orders" ? <LabOrdersManager canWrite={canWrite} /> : <LabTestsManager canWrite={canWrite} />}</div></section>;
}
