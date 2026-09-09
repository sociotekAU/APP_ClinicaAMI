"use client";

import {
  BadgePercent,
  BriefcaseMedical,
  ContactRound,
  Eye,
  Images,
  Megaphone,
  Palette,
  ShieldCheck,
  Stethoscope,
} from "lucide-react";
import { useState } from "react";
import { AnnouncementsManager } from "./announcements-manager";
import { ContactManager } from "./contact-manager";
import { GalleryManager } from "./gallery-manager";
import { ProfessionalsWebManager, ServicesWebManager } from "./public-catalogs-manager";
import { PromotionsManager } from "./promotions-manager";
import { StylesManager } from "./styles-manager";
import { WebContentPreviewPanel } from "./web-content-preview";

type Section = "contact" | "services" | "professionals" | "gallery" | "promotions" | "styles" | "announcements" | "preview";
const TABS = [
  { code: "contact" as const, label: "Contacto", Icon: ContactRound },
  { code: "services" as const, label: "Servicios", Icon: BriefcaseMedical },
  { code: "professionals" as const, label: "Profesionales", Icon: Stethoscope },
  { code: "gallery" as const, label: "Galería", Icon: Images },
  { code: "promotions" as const, label: "Promociones", Icon: BadgePercent },
  { code: "styles" as const, label: "Estilos", Icon: Palette },
  { code: "announcements" as const, label: "Anuncios", Icon: Megaphone },
  { code: "preview" as const, label: "Vista previa", Icon: Eye },
];

export function WebContentWorkspace({ canWrite }: Readonly<{ canWrite: boolean }>) {
  const [section, setSection] = useState<Section>("contact");
  return (
    <section className="administration-workspace" aria-labelledby="web-content-title">
      <header className="administration-heading">
        <div>
          <p className="eyebrow">Paso 5.9 · Contenido público</p>
          <h2 id="web-content-title">Administración del contenido web</h2>
          <p>Prepare lo que podrá publicarse en la futura landing. Esta vista no construye ni publica todavía la página pública.</p>
        </div>
        <span className={canWrite ? "access-level-write" : "access-level-read"}>
          <ShieldCheck aria-hidden="true" /> {canWrite ? "Lectura y escritura" : "Solo lectura"}
        </span>
      </header>
      <div className="administration-tabs" role="tablist" aria-label="Tipos de contenido web">
        {TABS.map(({ code, label, Icon }) => <button key={code} type="button" role="tab" aria-selected={section === code} className={section === code ? "is-active" : ""} onClick={() => setSection(code)}><Icon aria-hidden="true" /> {label}</button>)}
      </div>
      <div id={`web-content-panel-${section}`} role="tabpanel" tabIndex={0}>
        {section === "contact" && <ContactManager canWrite={canWrite} />}
        {section === "services" && <ServicesWebManager canWrite={canWrite} />}
        {section === "professionals" && <ProfessionalsWebManager canWrite={canWrite} />}
        {section === "gallery" && <GalleryManager canWrite={canWrite} />}
        {section === "promotions" && <PromotionsManager canWrite={canWrite} />}
        {section === "styles" && <StylesManager canWrite={canWrite} />}
        {section === "announcements" && <AnnouncementsManager canWrite={canWrite} />}
        {section === "preview" && <WebContentPreviewPanel />}
      </div>
    </section>
  );
}
