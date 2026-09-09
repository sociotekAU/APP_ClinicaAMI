"use client";

import type { StatusInput, WebGalleryInput, WebGalleryItem } from "@ami/contracts";
import { zodResolver } from "@hookform/resolvers/zod";
import type { ColumnDef } from "@tanstack/react-table";
import { ImageIcon } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { apiRequest } from "../../lib/api-client";
import { confirmDiscardChanges, showError, showSuccess } from "../../lib/alerts";
import { applyApiFormErrors } from "../administration/form-api-error";
import { formatDate } from "../administration/formatters";
import { RecordActions } from "../administration/record-actions";
import { ResourcePanel } from "../administration/resource-panel";
import { useResourceList } from "../administration/use-resource-list";
import { FormField, FormSection } from "../crud/form-field";
import { DetailModal, FormModal, MediaPreviewModal } from "../crud/modal";
import { StatusBadge } from "../crud/status-badge";
import { mediaUrl } from "./web-content-shared";

const schema = z.object({ title: z.string().trim().min(2).max(150), description: z.string().trim().max(2000), imageUrl: z.string().trim().min(1, "La imagen es obligatoria.").max(500).refine((value) => mediaUrl.test(value), "Use una ruta local o una dirección http/https."), webOrder: z.number().int().min(0).max(9999) });
type GalleryForm = z.infer<typeof schema>;
const EMPTY: GalleryForm = { title: "", description: "", imageUrl: "", webOrder: 0 };

export function GalleryManager({ canWrite }: Readonly<{ canWrite: boolean }>) {
  const list = useResourceList<WebGalleryItem>({ endpoint: "/web-content/gallery", defaultSort: "order" });
  const [editing, setEditing] = useState<WebGalleryItem | null>(null); const [formOpen, setFormOpen] = useState(false);
  const [detail, setDetail] = useState<WebGalleryItem | null>(null); const [preview, setPreview] = useState<WebGalleryItem | null>(null); const [pending, setPending] = useState<number | null>(null);
  const form = useForm<GalleryForm>({ resolver: zodResolver(schema), defaultValues: EMPTY });
  function create() { setEditing(null); form.reset(EMPTY); setFormOpen(true); }
  function edit(row: WebGalleryItem) { setEditing(row); form.reset({ title: row.title, description: row.description ?? "", imageUrl: row.imageUrl, webOrder: row.webOrder }); setFormOpen(true); }
  async function close() { if (form.formState.isDirty && !(await confirmDiscardChanges())) return; setFormOpen(false); }
  const save = form.handleSubmit(async (values) => { const payload: WebGalleryInput = { title: values.title, imageUrl: values.imageUrl, webOrder: values.webOrder, ...(values.description ? { description: values.description } : {}) }; try { await apiRequest<WebGalleryItem>(editing ? `/web-content/gallery/${editing.id}` : "/web-content/gallery", { method: editing ? "PATCH" : "POST", body: JSON.stringify(payload) }); setFormOpen(false); list.reload(); void showSuccess(editing ? "Imagen actualizada" : "Imagen creada como borrador", editing ? "Los cambios quedaron guardados." : "Actívela cuando esté lista para mostrarse."); } catch (reason) { const error = applyApiFormErrors(reason, form.setError); void showError("No se guardó la galería", error.message); } });
  async function status(row: WebGalleryItem, active: boolean) { setPending(row.id); try { await apiRequest<WebGalleryItem>(`/web-content/gallery/${row.id}/status`, { method: "PATCH", body: JSON.stringify({ active } satisfies StatusInput) }); list.reload(); void showSuccess(active ? "Imagen visible" : "Imagen oculta", "El registro y su historial permanecen disponibles."); } catch (reason) { const error = applyApiFormErrors(reason, form.setError); void showError("No se cambió el estado", error.message); } finally { setPending(null); } }
  const columns: ColumnDef<WebGalleryItem>[] = [
    { id: "title", accessorKey: "title", header: "Título", cell: ({ row }) => <strong className="table-primary-text">{row.original.title}</strong> },
    { id: "order", accessorKey: "webOrder", header: "Orden" },
    { id: "image", header: "Imagen", enableSorting: false, cell: ({ row }) => <button className="table-action-button" type="button" onClick={() => setPreview(row.original)}><ImageIcon aria-hidden="true" /> Ver imagen</button> },
    { id: "status", header: "Estado", enableSorting: false, cell: ({ row }) => <StatusBadge active={row.original.active} activeLabel="Visible" inactiveLabel="Borrador" /> },
    { id: "actions", header: "Acciones", enableSorting: false, cell: ({ row }) => <RecordActions active={row.original.active} canWrite={canWrite} entityLabel={`la imagen ${row.original.title}`} onDetail={() => setDetail(row.original)} onEdit={() => edit(row.original)} onStatus={(active) => status(row.original, active)} statusPending={pending === row.original.id} /> },
  ];
  return <><ResourcePanel canWrite={canWrite} columns={columns} description="Organice imágenes para las secciones públicas. Los registros nuevos inician como borrador." emptyTitle="No hay imágenes" emptyDescription="Cambie los filtros o registre la primera imagen." getRowId={(row) => String(row.id)} list={list} onCreate={create} searchPlaceholder="Buscar título o descripción" title="Galería" />
    <FormModal open={formOpen} onClose={() => { void close(); }} onSubmit={save} isSubmitting={form.formState.isSubmitting} submitLabel={editing ? "Guardar cambios" : "Crear borrador"} title={editing ? "Editar imagen" : "Nueva imagen de galería"}><FormSection title="Contenido"><div className="crud-form-grid"><FormField htmlFor="gallery-title" label="Título" required error={form.formState.errors.title?.message}><input {...form.register("title")} /></FormField><FormField htmlFor="gallery-order" label="Orden" required error={form.formState.errors.webOrder?.message}><input {...form.register("webOrder", { valueAsNumber: true })} type="number" min="0" /></FormField></div><FormField htmlFor="gallery-description" label="Descripción" error={form.formState.errors.description?.message}><textarea {...form.register("description")} rows={4} /></FormField><FormField htmlFor="gallery-image" label="URL de imagen" required error={form.formState.errors.imageUrl?.message}><input {...form.register("imageUrl")} placeholder="/MEDIA/galeria.jpg" /></FormField></FormSection></FormModal>
    <DetailModal open={detail !== null} onClose={() => setDetail(null)} title="Detalle de galería" footer={<button className="button button-primary" type="button" onClick={() => setDetail(null)}>Cerrar</button>}>{detail && <dl className="permission-detail-list"><div><dt>Título</dt><dd>{detail.title}</dd></div><div><dt>Descripción</dt><dd>{detail.description || "Sin descripción"}</dd></div><div><dt>Orden</dt><dd>{detail.webOrder}</dd></div><div><dt>Estado</dt><dd><StatusBadge active={detail.active} activeLabel="Visible" inactiveLabel="Borrador" /></dd></div><div><dt>Creación</dt><dd>{formatDate(detail.createdAt)}</dd></div></dl>}</DetailModal>
    {preview && <MediaPreviewModal open onClose={() => setPreview(null)} title={preview.title} kind="image" url={preview.imageUrl} alt={preview.title} />}</>;
}
