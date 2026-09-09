"use client";

import type { WebContentPreview } from "@ami/contracts";
import { Eye, ImageIcon, LoaderCircle, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { ApiClientError, apiRequest } from "../../lib/api-client";
import { formatDateTime } from "../administration/formatters";
import { MediaPreviewModal } from "../crud/modal";
import { formatPublicationDate } from "./web-content-shared";

export function WebContentPreviewPanel() {
  const [preview, setPreview] = useState<WebContentPreview | null>(null);
  const [error, setError] = useState<ApiClientError | null>(null);
  const [loading, setLoading] = useState(true);
  const [reload, setReload] = useState(0);
  const [media, setMedia] = useState<{ title: string; url: string } | null>(null);
  useEffect(() => {
    let active = true; setLoading(true); setError(null);
    apiRequest<WebContentPreview>("/web-content/preview").then((value) => { if (active) setPreview(value); }).catch((reason) => { if (active) setError(reason instanceof ApiClientError ? reason : new ApiClientError("No se generó la vista previa.", "INTERNAL_ERROR", 500)); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [reload]);
  return <section className="resource-panel" aria-labelledby="web-preview-title">
    <header className="resource-panel-heading"><div><h3 id="web-preview-title">Vista previa del contenido</h3><p>Simulación interna de los registros publicables hoy. No es la landing ni expone rutas públicas.</p></div><button className="button button-secondary button-compact" type="button" onClick={() => setReload((value) => value + 1)} disabled={loading}><RefreshCw className={loading ? "spin" : ""} aria-hidden="true" /> Actualizar</button></header>
    {loading ? <div className="web-content-state"><LoaderCircle className="spin" aria-hidden="true" /> Generando vista previa…</div>
      : error ? <div className="table-error" role="alert"><div><strong>{error.message}</strong><span>Código {error.code}</span></div><button type="button" onClick={() => setReload((value) => value + 1)}><RefreshCw aria-hidden="true" /> Reintentar</button></div>
        : preview && <div className="web-preview"><div className="web-preview-banner"><Eye aria-hidden="true" /><div><strong>Vista interna · contenido vigente</strong><span>Generada {formatDateTime(preview.generatedAt)}</span></div></div>
          <section className="web-preview-hero"><p>{preview.contact?.shortName || "Clínica A.M.I."}</p><h4>{preview.contact?.slogan || preview.contact?.companyName || "Información institucional pendiente"}</h4><span>{preview.contact?.location || "Ubicación pendiente"} · {preview.contact?.phone || "Teléfono pendiente"}</span></section>
          <PreviewGroup title={`Servicios (${preview.services.length})`} empty="No hay servicios visibles.">{preview.services.map((item) => <article key={item.id}><span className="web-preview-order">{item.webOrder}</span><div><strong>{item.name}</strong><p>{item.description || "Sin descripción pública"}</p></div>{item.imageUrl && <button type="button" onClick={() => setMedia({ title: item.name, url: item.imageUrl! })}><ImageIcon aria-hidden="true" /> Imagen</button>}</article>)}</PreviewGroup>
          <PreviewGroup title={`Profesionales (${preview.professionals.length})`} empty="No hay profesionales visibles.">{preview.professionals.map((item) => <article key={item.id}><span className="web-preview-order">{item.webOrder}</span><div><strong>{item.name}</strong><p>{item.specialty} · {item.publicProfile || "Semblanza pendiente"}</p></div>{item.photoUrl && <button type="button" onClick={() => setMedia({ title: item.name, url: item.photoUrl! })}><ImageIcon aria-hidden="true" /> Foto</button>}</article>)}</PreviewGroup>
          <PreviewGroup title={`Galería (${preview.gallery.length})`} empty="No hay imágenes visibles.">{preview.gallery.map((item) => <article key={item.id}><span className="web-preview-order">{item.webOrder}</span><div><strong>{item.title}</strong><p>{item.description || "Sin descripción"}</p></div><button type="button" onClick={() => setMedia({ title: item.title, url: item.imageUrl })}><ImageIcon aria-hidden="true" /> Imagen</button></article>)}</PreviewGroup>
          <PreviewGroup title={`Promociones vigentes (${preview.promotions.length})`} empty="No hay promociones vigentes hoy.">{preview.promotions.map((item) => <article key={item.id}><div><strong>{item.title}</strong><p>{formatPublicationDate(item.startDate)} — {formatPublicationDate(item.endDate)}</p></div>{item.imageUrl && <button type="button" onClick={() => setMedia({ title: item.title, url: item.imageUrl! })}><ImageIcon aria-hidden="true" /> Imagen</button>}</article>)}</PreviewGroup>
          <PreviewGroup title={`Anuncios vigentes (${preview.announcements.length})`} empty="No hay anuncios vigentes hoy.">{preview.announcements.map((item) => <article key={item.id}><div><strong>{item.title}</strong><p>{item.style.name}{item.promotion ? ` · ${item.promotion.title}` : ""}</p></div>{item.imageUrl && <button type="button" onClick={() => setMedia({ title: item.title, url: item.imageUrl! })}><ImageIcon aria-hidden="true" /> Imagen</button>}</article>)}</PreviewGroup>
        </div>}
    {media && <MediaPreviewModal open onClose={() => setMedia(null)} title={media.title} kind="image" url={media.url} />}
  </section>;
}

function PreviewGroup({ children, empty, title }: Readonly<{ children: React.ReactNode; empty: string; title: string }>) {
  return <section className="web-preview-group"><h4>{title}</h4><div>{children || <p className="web-preview-empty">{empty}</p>}</div></section>;
}
