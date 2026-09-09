"use client";

import type { StatusInput, WebPromotionInput, WebPromotionItem } from "@ami/contracts";
import { zodResolver } from "@hookform/resolvers/zod";
import type { ColumnDef } from "@tanstack/react-table";
import { ImageIcon } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { apiRequest } from "../../lib/api-client";
import { confirmDiscardChanges, showError, showSuccess } from "../../lib/alerts";
import { applyApiFormErrors } from "../administration/form-api-error";
import { RecordActions } from "../administration/record-actions";
import { ResourcePanel } from "../administration/resource-panel";
import { useResourceList } from "../administration/use-resource-list";
import { FormField, FormSection } from "../crud/form-field";
import { DetailModal, FormModal, MediaPreviewModal } from "../crud/modal";
import { StatusBadge } from "../crud/status-badge";
import { formatPublicationDate, mediaUrl, PublicationBadge } from "./web-content-shared";

const schema = z.object({ title: z.string().trim().min(2).max(150), description: z.string().trim().max(5000), startDate: z.string().min(1, "Seleccione la fecha inicial."), endDate: z.string().min(1, "Seleccione la fecha final."), imageUrl: z.string().trim().max(500).refine((value) => !value || mediaUrl.test(value), "Use una ruta local o una dirección http/https.") }).refine((value) => value.endDate >= value.startDate, { path: ["endDate"], message: "Debe ser igual o posterior a la fecha inicial." });
type PromotionForm = z.infer<typeof schema>; const EMPTY: PromotionForm = { title: "", description: "", startDate: new Date().toISOString().slice(0, 10), endDate: new Date().toISOString().slice(0, 10), imageUrl: "" };

export function PromotionsManager({ canWrite }: Readonly<{ canWrite: boolean }>) {
  const list = useResourceList<WebPromotionItem>({ endpoint: "/web-content/promotions", defaultSort: "startDate", defaultSortDescending: true });
  const [editing, setEditing] = useState<WebPromotionItem | null>(null); const [formOpen, setFormOpen] = useState(false); const [detail, setDetail] = useState<WebPromotionItem | null>(null); const [preview, setPreview] = useState<WebPromotionItem | null>(null); const [pending, setPending] = useState<number | null>(null);
  const form = useForm<PromotionForm>({ resolver: zodResolver(schema), defaultValues: EMPTY });
  function create() { setEditing(null); form.reset(EMPTY); setFormOpen(true); } function edit(row: WebPromotionItem) { setEditing(row); form.reset({ title: row.title, description: row.description ?? "", startDate: row.startDate, endDate: row.endDate, imageUrl: row.imageUrl ?? "" }); setFormOpen(true); }
  async function close() { if (form.formState.isDirty && !(await confirmDiscardChanges())) return; setFormOpen(false); }
  const save = form.handleSubmit(async (values) => { const payload: WebPromotionInput = { title: values.title, startDate: values.startDate, endDate: values.endDate, ...(values.description ? { description: values.description } : {}), ...(values.imageUrl ? { imageUrl: values.imageUrl } : {}) }; try { await apiRequest<WebPromotionItem>(editing ? `/web-content/promotions/${editing.id}` : "/web-content/promotions", { method: editing ? "PATCH" : "POST", body: JSON.stringify(payload) }); setFormOpen(false); list.reload(); void showSuccess(editing ? "Promoción actualizada" : "Promoción creada como borrador", editing ? "La vigencia quedó guardada." : "Actívela cuando esté lista para publicarse."); } catch (reason) { const error = applyApiFormErrors(reason, form.setError); void showError("No se guardó la promoción", error.message); } });
  async function status(row: WebPromotionItem, active: boolean) { setPending(row.id); try { await apiRequest<WebPromotionItem>(`/web-content/promotions/${row.id}/status`, { method: "PATCH", body: JSON.stringify({ active } satisfies StatusInput) }); list.reload(); void showSuccess(active ? "Promoción activada" : "Promoción desactivada", "La vigencia seguirá determinando si puede mostrarse."); } catch (reason) { const error = applyApiFormErrors(reason, form.setError); void showError("No se cambió el estado", error.message); } finally { setPending(null); } }
  const columns: ColumnDef<WebPromotionItem>[] = [
    { id: "title", accessorKey: "title", header: "Promoción", cell: ({ row }) => <strong className="table-primary-text">{row.original.title}</strong> },
    { id: "startDate", accessorKey: "startDate", header: "Inicio", cell: ({ row }) => formatPublicationDate(row.original.startDate) }, { id: "endDate", accessorKey: "endDate", header: "Fin", cell: ({ row }) => formatPublicationDate(row.original.endDate) },
    { id: "publication", header: "Publicación", enableSorting: false, cell: ({ row }) => <PublicationBadge state={row.original.publicationState} /> },
    { id: "image", header: "Imagen", enableSorting: false, cell: ({ row }) => row.original.imageUrl ? <button className="table-action-button" type="button" onClick={() => setPreview(row.original)}><ImageIcon aria-hidden="true" /> Ver</button> : <span className="table-muted">Sin imagen</span> },
    { id: "actions", header: "Acciones", enableSorting: false, cell: ({ row }) => <RecordActions active={row.original.active} canWrite={canWrite} entityLabel={`la promoción ${row.original.title}`} onDetail={() => setDetail(row.original)} onEdit={() => edit(row.original)} onStatus={(active) => status(row.original, active)} statusPending={pending === row.original.id} /> },
  ];
  return <><ResourcePanel canWrite={canWrite} columns={columns} description="Configure campañas con fecha inicial y final. Crear no publica: los registros nuevos quedan como borrador." emptyTitle="No hay promociones" emptyDescription="Cambie los filtros o cree la primera promoción." getRowId={(row) => String(row.id)} list={list} onCreate={create} searchPlaceholder="Buscar título o descripción" title="Promociones" />
    <FormModal open={formOpen} onClose={() => { void close(); }} onSubmit={save} isSubmitting={form.formState.isSubmitting} submitLabel={editing ? "Guardar cambios" : "Crear borrador"} title={editing ? "Editar promoción" : "Nueva promoción"}><FormSection title="Contenido y vigencia"><FormField htmlFor="promotion-title" label="Título" required error={form.formState.errors.title?.message}><input {...form.register("title")} /></FormField><FormField htmlFor="promotion-description" label="Descripción" error={form.formState.errors.description?.message}><textarea {...form.register("description")} rows={4} /></FormField><div className="crud-form-grid"><FormField htmlFor="promotion-start" label="Fecha inicial" required error={form.formState.errors.startDate?.message}><input {...form.register("startDate")} type="date" /></FormField><FormField htmlFor="promotion-end" label="Fecha final" required error={form.formState.errors.endDate?.message}><input {...form.register("endDate")} type="date" /></FormField></div><FormField htmlFor="promotion-image" label="URL de imagen" error={form.formState.errors.imageUrl?.message}><input {...form.register("imageUrl")} placeholder="/MEDIA/promocion.jpg" /></FormField></FormSection></FormModal>
    <DetailModal open={detail !== null} onClose={() => setDetail(null)} title="Detalle de promoción" footer={<button className="button button-primary" type="button" onClick={() => setDetail(null)}>Cerrar</button>}>{detail && <dl className="permission-detail-list"><div><dt>Título</dt><dd>{detail.title}</dd></div><div><dt>Descripción</dt><dd>{detail.description || "Sin descripción"}</dd></div><div><dt>Vigencia</dt><dd>{formatPublicationDate(detail.startDate)} — {formatPublicationDate(detail.endDate)}</dd></div><div><dt>Estado</dt><dd><PublicationBadge state={detail.publicationState} /></dd></div><div><dt>Habilitada</dt><dd><StatusBadge active={detail.active} activeLabel="Sí" inactiveLabel="No" /></dd></div></dl>}</DetailModal>
    {preview?.imageUrl && <MediaPreviewModal open onClose={() => setPreview(null)} title={preview.title} kind="image" url={preview.imageUrl} />}</>;
}
