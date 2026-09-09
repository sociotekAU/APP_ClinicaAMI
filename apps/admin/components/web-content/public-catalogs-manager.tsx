"use client";

import type { WebProfessionalInput, WebProfessionalListItem, WebServiceInput, WebServiceListItem } from "@ami/contracts";
import { zodResolver } from "@hookform/resolvers/zod";
import type { ColumnDef } from "@tanstack/react-table";
import { ImageIcon, Pencil } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { apiRequest } from "../../lib/api-client";
import { confirmDiscardChanges, showError, showSuccess } from "../../lib/alerts";
import { applyApiFormErrors } from "../administration/form-api-error";
import { ResourcePanel } from "../administration/resource-panel";
import { useResourceList } from "../administration/use-resource-list";
import { FormField, FormSection } from "../crud/form-field";
import { FormModal, MediaPreviewModal } from "../crud/modal";
import { StatusBadge } from "../crud/status-badge";
import { mediaUrl } from "./web-content-shared";

const serviceSchema = z.object({
  description: z.string().trim().max(2000),
  imageUrl: z.string().trim().max(255).refine((value) => !value || mediaUrl.test(value), "Use una ruta local o una dirección http/https."),
  visibleOnWeb: z.boolean(),
  webOrder: z.number().int().min(0).max(9999),
});
type ServiceForm = z.infer<typeof serviceSchema>;

export function ServicesWebManager({ canWrite }: Readonly<{ canWrite: boolean }>) {
  const list = useResourceList<WebServiceListItem>({ endpoint: "/web-content/services", defaultSort: "order" });
  const [editing, setEditing] = useState<WebServiceListItem | null>(null);
  const [preview, setPreview] = useState<WebServiceListItem | null>(null);
  const form = useForm<ServiceForm>({ resolver: zodResolver(serviceSchema), defaultValues: { description: "", imageUrl: "", visibleOnWeb: false, webOrder: 0 } });
  function edit(row: WebServiceListItem) { setEditing(row); form.reset({ description: row.description ?? "", imageUrl: row.imageUrl ?? "", visibleOnWeb: row.visibleOnWeb, webOrder: row.webOrder }); }
  async function close() { if (form.formState.isDirty && !(await confirmDiscardChanges())) return; setEditing(null); }
  const save = form.handleSubmit(async (values) => {
    if (!editing) return;
    try {
      await apiRequest<WebServiceListItem>(`/web-content/services/${editing.id}`, { method: "PATCH", body: JSON.stringify(values satisfies WebServiceInput) });
      setEditing(null); list.reload(); void showSuccess("Presentación actualizada", "La configuración pública del servicio quedó guardada.");
    } catch (reason) { const error = applyApiFormErrors(reason, form.setError); void showError("No se guardó el servicio", error.message); }
  });
  const columns: ColumnDef<WebServiceListItem>[] = [
    { id: "name", accessorKey: "name", header: "Servicio", cell: ({ row }) => <div className="table-module-cell"><strong>{row.original.name}</strong><span>{row.original.description || "Sin descripción pública"}</span></div> },
    { id: "order", accessorKey: "webOrder", header: "Orden" },
    { id: "visibility", header: "Publicación", enableSorting: false, cell: ({ row }) => <StatusBadge active={row.original.visibleOnWeb} activeLabel="Visible" inactiveLabel="Oculto" /> },
    { id: "clinical", header: "Estado clínico", enableSorting: false, cell: ({ row }) => <StatusBadge active={row.original.clinicalActive} activeLabel="Activo" inactiveLabel="Inactivo" /> },
    { id: "image", header: "Imagen", enableSorting: false, cell: ({ row }) => row.original.imageUrl ? <button className="table-action-button" type="button" onClick={() => setPreview(row.original)}><ImageIcon aria-hidden="true" /> Ver</button> : <span className="table-muted">Sin imagen</span> },
    { id: "actions", header: "Acciones", enableSorting: false, cell: ({ row }) => canWrite ? <button className="table-action-button" type="button" onClick={() => edit(row.original)}><Pencil aria-hidden="true" /> Editar web</button> : <span className="table-muted">Solo lectura</span> },
  ];
  return <>
    <ResourcePanel canWrite={false} columns={columns} description="Defina descripción, imagen, visibilidad y orden sin alterar el catálogo clínico ni sus precios." emptyTitle="No hay servicios" emptyDescription="Los servicios se crean desde Usuarios y seguridad." getRowId={(row) => String(row.id)} list={list} onCreate={() => undefined} searchPlaceholder="Buscar servicio o descripción" title="Servicios públicos" statusOptions={[{ value: "all", label: "Todos" }, { value: "active", label: "Visibles" }, { value: "inactive", label: "Ocultos" }]} />
    <FormModal open={editing !== null} onClose={() => { void close(); }} onSubmit={save} isSubmitting={form.formState.isSubmitting} submitLabel="Guardar presentación" title={`Presentación web · ${editing?.name ?? "Servicio"}`} description="Ocultar este contenido no desactiva el servicio dentro del ERP.">
      <FormSection title="Contenido público"><FormField htmlFor="web-service-description" label="Descripción" error={form.formState.errors.description?.message}><textarea {...form.register("description")} rows={5} /></FormField><FormField htmlFor="web-service-image" label="URL de imagen" error={form.formState.errors.imageUrl?.message}><input {...form.register("imageUrl")} placeholder="/MEDIA/servicio.jpg" /></FormField><div className="crud-form-grid"><FormField htmlFor="web-service-order" label="Orden" required error={form.formState.errors.webOrder?.message}><input {...form.register("webOrder", { valueAsNumber: true })} type="number" min="0" /></FormField><div className="web-checkbox-field"><label><input {...form.register("visibleOnWeb")} type="checkbox" /> Visible en la futura landing</label></div></div></FormSection>
    </FormModal>
    {preview?.imageUrl && <MediaPreviewModal open onClose={() => setPreview(null)} title={preview.name} kind="image" url={preview.imageUrl} alt={`Imagen de ${preview.name}`} />}
  </>;
}

const professionalSchema = z.object({
  publicProfile: z.string().trim().max(5000),
  photoUrl: z.string().trim().max(500).refine((value) => !value || mediaUrl.test(value), "Use una ruta local o una dirección http/https."),
  visibleOnWeb: z.boolean(),
  webOrder: z.number().int().min(0).max(9999),
});
type ProfessionalForm = z.infer<typeof professionalSchema>;

export function ProfessionalsWebManager({ canWrite }: Readonly<{ canWrite: boolean }>) {
  const list = useResourceList<WebProfessionalListItem>({ endpoint: "/web-content/professionals", defaultSort: "order" });
  const [editing, setEditing] = useState<WebProfessionalListItem | null>(null);
  const [preview, setPreview] = useState<WebProfessionalListItem | null>(null);
  const form = useForm<ProfessionalForm>({ resolver: zodResolver(professionalSchema), defaultValues: { publicProfile: "", photoUrl: "", visibleOnWeb: false, webOrder: 0 } });
  function edit(row: WebProfessionalListItem) { setEditing(row); form.reset({ publicProfile: row.publicProfile ?? "", photoUrl: row.photoUrl ?? "", visibleOnWeb: row.visibleOnWeb, webOrder: row.webOrder }); }
  async function close() { if (form.formState.isDirty && !(await confirmDiscardChanges())) return; setEditing(null); }
  const save = form.handleSubmit(async (values) => {
    if (!editing) return;
    try { await apiRequest<WebProfessionalListItem>(`/web-content/professionals/${editing.id}`, { method: "PATCH", body: JSON.stringify(values satisfies WebProfessionalInput) }); setEditing(null); list.reload(); void showSuccess("Perfil actualizado", "La presentación pública del profesional quedó guardada."); }
    catch (reason) { const error = applyApiFormErrors(reason, form.setError); void showError("No se guardó el perfil", error.message); }
  });
  const columns: ColumnDef<WebProfessionalListItem>[] = [
    { id: "name", accessorKey: "name", header: "Profesional", cell: ({ row }) => <strong className="table-primary-text">{row.original.name}</strong> },
    { id: "specialty", accessorKey: "specialty", header: "Especialidad" },
    { id: "order", accessorKey: "webOrder", header: "Orden" },
    { id: "visibility", header: "Publicación", enableSorting: false, cell: ({ row }) => <StatusBadge active={row.original.visibleOnWeb} activeLabel="Visible" inactiveLabel="Oculto" /> },
    { id: "clinical", header: "Estado clínico", enableSorting: false, cell: ({ row }) => <StatusBadge active={row.original.clinicalActive} activeLabel="Activo" inactiveLabel="Inactivo" /> },
    { id: "actions", header: "Acciones", enableSorting: false, cell: ({ row }) => <div className="record-actions">{row.original.photoUrl && <button className="table-action-button" type="button" onClick={() => setPreview(row.original)}><ImageIcon aria-hidden="true" /> Foto</button>}{canWrite && <button className="table-action-button" type="button" onClick={() => edit(row.original)}><Pencil aria-hidden="true" /> Editar web</button>}</div> },
  ];
  return <>
    <ResourcePanel canWrite={false} columns={columns} description="Seleccione quién será visible y prepare su fotografía y semblanza sin modificar su acceso clínico." emptyTitle="No hay profesionales" emptyDescription="Los profesionales se crean desde Usuarios y seguridad." getRowId={(row) => String(row.id)} list={list} onCreate={() => undefined} searchPlaceholder="Buscar nombre, especialidad o perfil" title="Profesionales visibles" statusOptions={[{ value: "all", label: "Todos" }, { value: "active", label: "Visibles" }, { value: "inactive", label: "Ocultos" }]} />
    <FormModal open={editing !== null} onClose={() => { void close(); }} onSubmit={save} isSubmitting={form.formState.isSubmitting} submitLabel="Guardar perfil" title={`Perfil web · ${editing?.name ?? "Profesional"}`} description={editing?.specialty}>
      <FormSection title="Presentación pública"><FormField htmlFor="web-professional-profile" label="Semblanza" error={form.formState.errors.publicProfile?.message}><textarea {...form.register("publicProfile")} rows={7} /></FormField><FormField htmlFor="web-professional-photo" label="URL de fotografía" error={form.formState.errors.photoUrl?.message}><input {...form.register("photoUrl")} placeholder="/MEDIA/profesional.jpg" /></FormField><div className="crud-form-grid"><FormField htmlFor="web-professional-order" label="Orden" required error={form.formState.errors.webOrder?.message}><input {...form.register("webOrder", { valueAsNumber: true })} type="number" min="0" /></FormField><div className="web-checkbox-field"><label><input {...form.register("visibleOnWeb")} type="checkbox" /> Visible en la futura landing</label></div></div></FormSection>
    </FormModal>
    {preview?.photoUrl && <MediaPreviewModal open onClose={() => setPreview(null)} title={preview.name} kind="image" url={preview.photoUrl} alt={`Fotografía de ${preview.name}`} />}
  </>;
}
