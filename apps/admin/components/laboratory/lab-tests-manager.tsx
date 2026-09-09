"use client";

import type { LabTestInput, LabTestListItem, StatusInput } from "@ami/contracts";
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

const schema = z.object({ name: z.string().trim().min(2).max(150), category: z.string().trim().min(2).max(100), referenceValues: z.string().trim().max(255), unit: z.string().trim().max(50) });
type FormValues = z.infer<typeof schema>;
const DEFAULTS: FormValues = { name: "", category: "", referenceValues: "", unit: "" };

export function LabTestsManager({ canWrite }: Readonly<{ canWrite: boolean }>) {
  const list = useResourceList<LabTestListItem>({ endpoint: "/laboratory/tests", defaultSort: "name" });
  const [detail, setDetail] = useState<LabTestListItem | null>(null);
  const [editing, setEditing] = useState<LabTestListItem | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [statusPending, setStatusPending] = useState<number | null>(null);
  const form = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: DEFAULTS });
  function openCreate() { setEditing(null); form.reset(DEFAULTS); setFormOpen(true); }
  function openEdit(row: LabTestListItem) { setEditing(row); form.reset({ name: row.name, category: row.category, referenceValues: row.referenceValues ?? "", unit: row.unit ?? "" }); setFormOpen(true); }
  async function closeForm() { if (form.formState.isDirty && !(await confirmDiscardChanges())) return; setFormOpen(false); }
  const save = form.handleSubmit(async (values) => {
    const payload: LabTestInput = { name: values.name, category: values.category, ...(values.referenceValues ? { referenceValues: values.referenceValues } : {}), ...(values.unit ? { unit: values.unit } : {}) };
    try { await apiRequest<LabTestListItem>(editing ? `/laboratory/tests/${editing.id}` : "/laboratory/tests", { method: editing ? "PATCH" : "POST", body: JSON.stringify(payload) }); setFormOpen(false); list.reload(); void showSuccess(editing ? "Examen actualizado" : "Examen creado", "El catálogo de laboratorio quedó actualizado."); }
    catch (reason) { const error = applyApiFormErrors(reason, form.setError); void showError("No se guardó el examen", error.message); }
  });
  async function setStatus(row: LabTestListItem, active: boolean) {
    setStatusPending(row.id);
    try { await apiRequest<LabTestListItem>(`/laboratory/tests/${row.id}/status`, { method: "PATCH", body: JSON.stringify({ active } satisfies StatusInput) }); list.reload(); void showSuccess(active ? "Examen activado" : "Examen desactivado", "Las órdenes anteriores conservaron el examen."); }
    catch (reason) { const error = applyApiFormErrors(reason, form.setError); void showError("No se cambió el estado", error.message); }
    finally { setStatusPending(null); }
  }
  const columns: ColumnDef<LabTestListItem>[] = [
    { id: "name", accessorKey: "name", header: "Examen", cell: ({ row }) => <strong className="table-primary-text">{row.original.name}</strong> },
    { id: "category", accessorKey: "category", header: "Categoría" },
    { id: "reference", header: "Referencia", enableSorting: false, cell: ({ row }) => `${row.original.referenceValues ?? "Sin definir"}${row.original.unit ? ` · ${row.original.unit}` : ""}` },
    { id: "orders", header: "Órdenes", enableSorting: false, cell: ({ row }) => row.original.orderCount },
    { id: "status", header: "Estado", enableSorting: false, cell: ({ row }) => <StatusBadge active={row.original.active} activeLabel="Activo" inactiveLabel="Inactivo" /> },
    { id: "actions", header: "Acciones", enableSorting: false, cell: ({ row }) => <RecordActions active={row.original.active} canWrite={canWrite} entityLabel={`el examen ${row.original.name}`} onDetail={() => setDetail(row.original)} onEdit={() => openEdit(row.original)} onStatus={(active) => setStatus(row.original, active)} statusPending={statusPending === row.original.id} /> },
  ];
  return <>
    <ResourcePanel canWrite={canWrite} columns={columns} description="Pruebas disponibles para nuevas órdenes de laboratorio." emptyTitle="No hay exámenes" emptyDescription="Cambie los filtros o cree el primer examen." getRowId={(row) => String(row.id)} list={list} onCreate={openCreate} searchPlaceholder="Nombre, categoría o referencia" title="Catálogo de exámenes" />
    <FormModal open={formOpen} onClose={() => { void closeForm(); }} onSubmit={save} isSubmitting={form.formState.isSubmitting} submitLabel={editing ? "Guardar cambios" : "Crear examen"} title={editing ? "Editar examen" : "Nuevo examen"} description="El nombre y la categoría forman una combinación única."><FormSection title="Definición"><div className="crud-form-grid"><FormField htmlFor="test-name" label="Nombre" required error={form.formState.errors.name?.message}><input {...form.register("name")} /></FormField><FormField htmlFor="test-category" label="Categoría" required error={form.formState.errors.category?.message}><input {...form.register("category")} /></FormField><FormField htmlFor="test-reference" label="Valores de referencia" error={form.formState.errors.referenceValues?.message}><input {...form.register("referenceValues")} /></FormField><FormField htmlFor="test-unit" label="Unidad" error={form.formState.errors.unit?.message}><input {...form.register("unit")} /></FormField></div></FormSection></FormModal>
    <DetailModal open={detail !== null} onClose={() => setDetail(null)} title="Detalle de examen" footer={<button className="button button-primary" type="button" onClick={() => setDetail(null)}>Cerrar</button>}>{detail && <dl className="permission-detail-list"><div><dt>Examen</dt><dd>{detail.name}</dd></div><div><dt>Categoría</dt><dd>{detail.category}</dd></div><div><dt>Referencia</dt><dd>{detail.referenceValues || "Sin definir"}</dd></div><div><dt>Unidad</dt><dd>{detail.unit || "Sin definir"}</dd></div><div><dt>Órdenes</dt><dd>{detail.orderCount}</dd></div><div><dt>Estado</dt><dd><StatusBadge active={detail.active} activeLabel="Activo" inactiveLabel="Inactivo" /></dd></div></dl>}</DetailModal>
  </>;
}
