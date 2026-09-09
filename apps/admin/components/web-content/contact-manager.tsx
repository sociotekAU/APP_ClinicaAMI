"use client";

import type { WebContact, WebContactInput } from "@ami/contracts";
import { zodResolver } from "@hookform/resolvers/zod";
import { Edit3, ImageIcon, LoaderCircle, MapPin, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { ApiClientError, apiRequest } from "../../lib/api-client";
import { confirmDiscardChanges, showError, showSuccess } from "../../lib/alerts";
import { applyApiFormErrors } from "../administration/form-api-error";
import { formatDate } from "../administration/formatters";
import { FormField, FormSection } from "../crud/form-field";
import { FormModal, MediaPreviewModal } from "../crud/modal";
import { StatusBadge } from "../crud/status-badge";
import { mediaUrl } from "./web-content-shared";

const optionalHttp = z.string().trim().max(500).refine((value) => !value || /^https?:\/\/[^\s]+$/i.test(value), "Use una dirección http/https.");
const optionalMedia = z.string().trim().max(500).refine((value) => !value || mediaUrl.test(value), "Use una ruta local o una dirección http/https.");
const schema = z.object({
  companyName: z.string().trim().min(2).max(150), shortName: z.string().trim().max(100), phone: z.string().trim().min(4).max(20),
  email: z.string().trim().max(150).refine((value) => !value || z.email().safeParse(value).success, "Ingrese un correo válido."),
  facebook: optionalHttp, instagram: optionalHttp, logoUrl: optionalMedia,
  location: z.string().trim().min(3).max(255), googleMapsUrl: optionalHttp, homeVideoUrl: optionalMedia,
  slogan: z.string().trim().max(255), weekdayHours: z.string().trim().max(500), saturdayHours: z.string().trim().max(500), active: z.boolean(),
});
type ContactForm = z.infer<typeof schema>;
const EMPTY: ContactForm = { companyName: "", shortName: "", phone: "", email: "", facebook: "", instagram: "", logoUrl: "", location: "", googleMapsUrl: "", homeVideoUrl: "", slogan: "", weekdayHours: "", saturdayHours: "", active: true };

export function ContactManager({ canWrite }: Readonly<{ canWrite: boolean }>) {
  const [contact, setContact] = useState<WebContact | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ApiClientError | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [media, setMedia] = useState<{ title: string; url: string } | null>(null);
  const [reload, setReload] = useState(0);
  const form = useForm<ContactForm>({ resolver: zodResolver(schema), defaultValues: EMPTY });

  useEffect(() => {
    let active = true; setLoading(true); setError(null);
    apiRequest<WebContact | null>("/web-content/contact").then((value) => { if (active) setContact(value); }).catch((reason) => { if (active) setError(reason instanceof ApiClientError ? reason : new ApiClientError("No se cargó el contacto.", "INTERNAL_ERROR", 500)); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [reload]);

  function openEdit() {
    if (!contact) return;
    form.reset({ companyName: contact.companyName, shortName: contact.shortName ?? "", phone: contact.phone, email: contact.email ?? "", facebook: contact.facebook ?? "", instagram: contact.instagram ?? "", logoUrl: contact.logoUrl ?? "", location: contact.location, googleMapsUrl: contact.googleMapsUrl ?? "", homeVideoUrl: contact.homeVideoUrl ?? "", slogan: contact.slogan ?? "", weekdayHours: contact.weekdayHours ?? "", saturdayHours: contact.saturdayHours ?? "", active: contact.active });
    setFormOpen(true);
  }
  async function close() { if (form.formState.isDirty && !(await confirmDiscardChanges())) return; setFormOpen(false); }
  const save = form.handleSubmit(async (values) => {
    if (!contact) return;
    const payload: WebContactInput = { companyName: values.companyName, phone: values.phone, location: values.location, active: values.active,
      ...(values.shortName ? { shortName: values.shortName } : {}), ...(values.email ? { email: values.email } : {}), ...(values.facebook ? { facebook: values.facebook } : {}),
      ...(values.instagram ? { instagram: values.instagram } : {}), ...(values.logoUrl ? { logoUrl: values.logoUrl } : {}), ...(values.googleMapsUrl ? { googleMapsUrl: values.googleMapsUrl } : {}),
      ...(values.homeVideoUrl ? { homeVideoUrl: values.homeVideoUrl } : {}), ...(values.slogan ? { slogan: values.slogan } : {}), ...(values.weekdayHours ? { weekdayHours: values.weekdayHours } : {}), ...(values.saturdayHours ? { saturdayHours: values.saturdayHours } : {}),
    };
    try { await apiRequest<WebContact>(`/web-content/contact/${contact.id}`, { method: "PATCH", body: JSON.stringify(payload) }); setFormOpen(false); setReload((value) => value + 1); void showSuccess("Contacto actualizado", "La configuración pública quedó guardada."); }
    catch (reason) { const apiError = applyApiFormErrors(reason, form.setError); void showError("No se guardó el contacto", apiError.message); }
  });

  return <section className="resource-panel" aria-labelledby="web-contact-title">
    <header className="resource-panel-heading"><div><h3 id="web-contact-title">Información de contacto</h3><p>Datos institucionales, horarios, redes, mapa y recursos principales de la futura landing.</p></div>{canWrite && contact && <button className="button button-primary button-compact" type="button" onClick={openEdit}><Edit3 aria-hidden="true" /> Editar información</button>}</header>
    {loading ? <div className="web-content-state"><LoaderCircle className="spin" aria-hidden="true" /> Cargando información…</div>
      : error ? <div className="table-error" role="alert"><div><strong>{error.message}</strong><span>Código {error.code}</span></div><button type="button" onClick={() => setReload((value) => value + 1)}><RefreshCw aria-hidden="true" /> Reintentar</button></div>
        : !contact ? <div className="web-content-state">No existe una configuración de contacto inicial. Revise el seed de base de datos.</div>
          : <div className="contact-summary"><div className="contact-summary-main"><span className="contact-logo-placeholder">{contact.shortName?.slice(0, 3) || "AMI"}</span><div><h4>{contact.companyName}</h4><p>{contact.slogan || "Sin eslogan"}</p><StatusBadge active={contact.active} activeLabel="Publicable" inactiveLabel="Oculto" /></div></div><dl className="permission-detail-list"><div><dt>Teléfono</dt><dd>{contact.phone}</dd></div><div><dt>Correo</dt><dd>{contact.email || "Sin correo"}</dd></div><div><dt>Ubicación</dt><dd><MapPin aria-hidden="true" /> {contact.location}</dd></div><div><dt>Horario semanal</dt><dd>{contact.weekdayHours || "Sin horario"}</dd></div><div><dt>Sábado</dt><dd>{contact.saturdayHours || "Sin horario"}</dd></div><div><dt>Redes</dt><dd>{[contact.facebook && "Facebook", contact.instagram && "Instagram"].filter(Boolean).join(" · ") || "Sin redes"}</dd></div><div><dt>Creación</dt><dd>{formatDate(contact.createdAt)}</dd></div></dl><div className="contact-media-actions">{contact.logoUrl && <button className="table-action-button" type="button" onClick={() => setMedia({ title: "Logotipo", url: contact.logoUrl! })}><ImageIcon aria-hidden="true" /> Ver logotipo</button>}{contact.googleMapsUrl && <a className="table-action-button" href={contact.googleMapsUrl} target="_blank" rel="noreferrer"><MapPin aria-hidden="true" /> Abrir mapa</a>}</div></div>}

    <FormModal open={formOpen} onClose={() => { void close(); }} onSubmit={save} isSubmitting={form.formState.isSubmitting} submitLabel="Guardar información" title="Editar información de contacto" size="lg">
      <FormSection title="Identidad"><div className="crud-form-grid"><FormField htmlFor="contact-company" label="Nombre de la empresa" required error={form.formState.errors.companyName?.message}><input {...form.register("companyName")} /></FormField><FormField htmlFor="contact-short" label="Nombre corto" error={form.formState.errors.shortName?.message}><input {...form.register("shortName")} /></FormField></div><FormField htmlFor="contact-slogan" label="Eslogan" error={form.formState.errors.slogan?.message}><input {...form.register("slogan")} /></FormField><div className="crud-form-grid"><FormField htmlFor="contact-logo" label="URL del logotipo" error={form.formState.errors.logoUrl?.message}><input {...form.register("logoUrl")} /></FormField><FormField htmlFor="contact-video" label="URL del video de inicio" error={form.formState.errors.homeVideoUrl?.message}><input {...form.register("homeVideoUrl")} /></FormField></div></FormSection>
      <FormSection title="Contacto y ubicación"><div className="crud-form-grid"><FormField htmlFor="contact-phone" label="Teléfono" required error={form.formState.errors.phone?.message}><input {...form.register("phone")} /></FormField><FormField htmlFor="contact-email" label="Correo" error={form.formState.errors.email?.message}><input {...form.register("email")} type="email" /></FormField></div><FormField htmlFor="contact-location" label="Ubicación" required error={form.formState.errors.location?.message}><input {...form.register("location")} /></FormField><FormField htmlFor="contact-map" label="URL de Google Maps" error={form.formState.errors.googleMapsUrl?.message}><input {...form.register("googleMapsUrl")} /></FormField></FormSection>
      <FormSection title="Redes y horarios"><div className="crud-form-grid"><FormField htmlFor="contact-facebook" label="Facebook" error={form.formState.errors.facebook?.message}><input {...form.register("facebook")} /></FormField><FormField htmlFor="contact-instagram" label="Instagram" error={form.formState.errors.instagram?.message}><input {...form.register("instagram")} /></FormField><FormField htmlFor="contact-weekdays" label="Horario semanal" error={form.formState.errors.weekdayHours?.message}><input {...form.register("weekdayHours")} /></FormField><FormField htmlFor="contact-saturday" label="Horario sábado" error={form.formState.errors.saturdayHours?.message}><input {...form.register("saturdayHours")} /></FormField></div><div className="web-checkbox-field"><label><input {...form.register("active")} type="checkbox" /> Disponible para la futura landing</label></div></FormSection>
    </FormModal>
    {media && <MediaPreviewModal open onClose={() => setMedia(null)} title={media.title} kind="image" url={media.url} />}
  </section>;
}
