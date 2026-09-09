"use client";

import type { AnnouncementPosition, StatusInput, WebAnnouncementStyleInput, WebAnnouncementStyleItem } from "@ami/contracts";
import { zodResolver } from "@hookform/resolvers/zod";
import type { ColumnDef } from "@tanstack/react-table";
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
import { DetailModal, FormModal } from "../crud/modal";
import { StatusBadge } from "../crud/status-badge";

const POSITIONS: Array<{ label: string; value: AnnouncementPosition }> = [
  { value: "inferior_derecha", label: "Inferior derecha" }, { value: "inferior_izquierda", label: "Inferior izquierda" },
  { value: "superior_derecha", label: "Superior derecha" }, { value: "superior_izquierda", label: "Superior izquierda" }, { value: "centro", label: "Centro" },
];
const schema = z.object({ name: z.string().trim().min(2).max(100), backgroundColor: z.string().regex(/^#[0-9a-f]{6}$/i, "Use el formato #RRGGBB."), textColor: z.string().regex(/^#[0-9a-f]{6}$/i, "Use el formato #RRGGBB."), icon: z.string().trim().max(100), position: z.enum(["inferior_derecha", "inferior_izquierda", "superior_derecha", "superior_izquierda", "centro"]) });
type StyleForm = z.infer<typeof schema>; const EMPTY: StyleForm = { name: "", backgroundColor: "#003b79", textColor: "#ffffff", icon: "info", position: "inferior_derecha" };

export function StylesManager({ canWrite }: Readonly<{ canWrite: boolean }>) {
  const list = useResourceList<WebAnnouncementStyleItem>({ endpoint: "/web-content/styles", defaultSort: "name" });
  const [editing, setEditing] = useState<WebAnnouncementStyleItem | null>(null); const [formOpen, setFormOpen] = useState(false); const [detail, setDetail] = useState<WebAnnouncementStyleItem | null>(null); const [pending, setPending] = useState<number | null>(null);
  const form = useForm<StyleForm>({ resolver: zodResolver(schema), defaultValues: EMPTY });
  function create() { setEditing(null); form.reset(EMPTY); setFormOpen(true); } function edit(row: WebAnnouncementStyleItem) { setEditing(row); form.reset({ name: row.name, backgroundColor: row.backgroundColor, textColor: row.textColor, icon: row.icon ?? "", position: row.position }); setFormOpen(true); }
  async function close() { if (form.formState.isDirty && !(await confirmDiscardChanges())) return; setFormOpen(false); }
  const save = form.handleSubmit(async (values) => { const payload: WebAnnouncementStyleInput = { name: values.name, backgroundColor: values.backgroundColor, textColor: values.textColor, position: values.position, ...(values.icon ? { icon: values.icon } : {}) }; try { await apiRequest<WebAnnouncementStyleItem>(editing ? `/web-content/styles/${editing.id}` : "/web-content/styles", { method: editing ? "PATCH" : "POST", body: JSON.stringify(payload) }); setFormOpen(false); list.reload(); void showSuccess(editing ? "Estilo actualizado" : "Estilo creado", "La plantilla visual quedó disponible para los anuncios."); } catch (reason) { const error = applyApiFormErrors(reason, form.setError); void showError("No se guardó el estilo", error.message); } });
  async function status(row: WebAnnouncementStyleItem, active: boolean) { setPending(row.id); try { await apiRequest<WebAnnouncementStyleItem>(`/web-content/styles/${row.id}/status`, { method: "PATCH", body: JSON.stringify({ active } satisfies StatusInput) }); list.reload(); void showSuccess(active ? "Estilo activado" : "Estilo desactivado", "Los anuncios vinculados conservan su configuración."); } catch (reason) { const error = applyApiFormErrors(reason, form.setError); void showError("No se cambió el estado", error.message); } finally { setPending(null); } }
  const columns: ColumnDef<WebAnnouncementStyleItem>[] = [
    { id: "name", accessorKey: "name", header: "Estilo", cell: ({ row }) => <strong className="table-primary-text">{row.original.name}</strong> },
    { id: "colors", header: "Colores", enableSorting: false, cell: ({ row }) => <div className="color-pair"><span style={{ background: row.original.backgroundColor }} title={`Fondo ${row.original.backgroundColor}`} /><span style={{ background: row.original.textColor }} title={`Texto ${row.original.textColor}`} /></div> },
    { id: "position", accessorKey: "position", header: "Posición", cell: ({ row }) => POSITIONS.find((item) => item.value === row.original.position)?.label },
    { id: "status", header: "Estado", enableSorting: false, cell: ({ row }) => <StatusBadge active={row.original.active} activeLabel="Activo" inactiveLabel="Inactivo" /> },
    { id: "actions", header: "Acciones", enableSorting: false, cell: ({ row }) => <RecordActions active={row.original.active} canWrite={canWrite} entityLabel={`el estilo ${row.original.name}`} onDetail={() => setDetail(row.original)} onEdit={() => edit(row.original)} onStatus={(active) => status(row.original, active)} statusPending={pending === row.original.id} /> },
  ];
  return <><ResourcePanel canWrite={canWrite} columns={columns} description="Defina colores, icono y posición reutilizables por anuncios y pop-ups." emptyTitle="No hay estilos" emptyDescription="Cree el primer estilo visual." getRowId={(row) => String(row.id)} list={list} onCreate={create} searchPlaceholder="Buscar nombre o icono" title="Estilos de anuncios" />
    <FormModal open={formOpen} onClose={() => { void close(); }} onSubmit={save} isSubmitting={form.formState.isSubmitting} submitLabel={editing ? "Guardar cambios" : "Crear estilo"} title={editing ? "Editar estilo" : "Nuevo estilo"}><FormSection title="Apariencia"><FormField htmlFor="style-name" label="Nombre" required error={form.formState.errors.name?.message}><input {...form.register("name")} /></FormField><div className="crud-form-grid"><FormField htmlFor="style-background" label="Color de fondo" required error={form.formState.errors.backgroundColor?.message}><input {...form.register("backgroundColor")} type="color" /></FormField><FormField htmlFor="style-text" label="Color de texto" required error={form.formState.errors.textColor?.message}><input {...form.register("textColor")} type="color" /></FormField><FormField htmlFor="style-icon" label="Icono" error={form.formState.errors.icon?.message}><input {...form.register("icon")} placeholder="info" /></FormField><FormField htmlFor="style-position" label="Posición" required error={form.formState.errors.position?.message}><select {...form.register("position")}>{POSITIONS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></FormField></div><div className="announcement-style-preview" style={{ background: form.watch("backgroundColor"), color: form.watch("textColor") }}><strong>{form.watch("name") || "Vista del estilo"}</strong><span>{form.watch("icon") || "Sin icono"} · {POSITIONS.find((item) => item.value === form.watch("position"))?.label}</span></div></FormSection></FormModal>
    <DetailModal open={detail !== null} onClose={() => setDetail(null)} title="Detalle del estilo" footer={<button className="button button-primary" type="button" onClick={() => setDetail(null)}>Cerrar</button>}>{detail && <><div className="announcement-style-preview" style={{ background: detail.backgroundColor, color: detail.textColor }}><strong>{detail.name}</strong><span>{detail.icon || "Sin icono"}</span></div><dl className="permission-detail-list"><div><dt>Posición</dt><dd>{POSITIONS.find((item) => item.value === detail.position)?.label}</dd></div><div><dt>Estado</dt><dd><StatusBadge active={detail.active} activeLabel="Activo" inactiveLabel="Inactivo" /></dd></div></dl></>}</DetailModal></>;
}
