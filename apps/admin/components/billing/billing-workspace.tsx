"use client";

import { Banknote, FileText, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { CashSummaryPanel } from "./cash-summary";
import { InvoicesManager } from "./invoices-manager";

export function BillingWorkspace({ canWrite }: Readonly<{ canWrite: boolean }>) {
  const [section, setSection] = useState<"invoices" | "cash">("invoices");
  return (
    <section className="administration-workspace" aria-labelledby="billing-title">
      <header className="administration-heading">
        <div><p className="eyebrow">Control financiero</p><h2 id="billing-title">Facturación y caja</h2><p>Emita comprobantes, consulte cierres diarios y conserve las anulaciones.</p></div>
        <span className={canWrite ? "access-level-write" : "access-level-read"}><ShieldCheck aria-hidden="true" /> {canWrite ? "Lectura y escritura" : "Solo lectura"}</span>
      </header>
      <div className="administration-tabs" role="tablist" aria-label="Áreas de facturación">
        <button type="button" role="tab" aria-selected={section === "invoices"} className={section === "invoices" ? "is-active" : ""} onClick={() => setSection("invoices")}><FileText aria-hidden="true" /> Facturas</button>
        <button type="button" role="tab" aria-selected={section === "cash"} className={section === "cash" ? "is-active" : ""} onClick={() => setSection("cash")}><Banknote aria-hidden="true" /> Caja diaria</button>
      </div>
      <div role="tabpanel" tabIndex={0}>{section === "invoices" ? <InvoicesManager canWrite={canWrite} /> : <CashSummaryPanel />}</div>
    </section>
  );
}
