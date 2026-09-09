"use client";

import type { MedicationInput, MedicationListItem, StatusInput } from "@ami/contracts";
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

const schema = z.object({ commercialName: z.string().trim().min(2).max(150), activeIngredient: z.string().trim().min(2).max(150), presentation: z.string().trim().min(2).max(50), concentration: z.string().trim().min(1).max(50) });
type FormValues = z.infer<typeof schema>;
const DEFAULTS: FormValues = { commercialName: "", activeIngredient: "", presentation: "", concentration: "" };

export function MedicationsManager({ canWrite }: Readonly<{ canWrite: boolean }>) {
  const list = useResourceList<MedicationListItem>({ endpoint: "/medications", defaultSort: "commercialName" });
  const [detail, setDetail] = useState<MedicationListItem | null>(null);
  const [editing, setEditing] = useState<MedicationListItem | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [statusPending, setStatusPending] = useState<number | null>(null);
  const form = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: DEFAULTS });

  function openCreate() { setEditing(null); form.reset(DEFAULTS); setFormOpen(true); }
  function openEdit(row: MedicationListItem) { setEditing(row); form.reset({ commercialName: row.commercialName, activeIngredient: row.activeIngredient, presentation: row.presentation, concentration: row.concentration }); setFormOpen(true); }
  async function closeForm() { if (form.formState.isDirty && !(await confirmDiscardChanges())) return; setFormOpen(false); }
  const save = form.handleSubmit(async (values) => {
    try {
      await apiRequest<MedicationListItem>(editing ? `/medications/${editing.id}` : "/medications", { method: editing ? "PATCH" : "POST", body: JSON.stringify(values satisfies MedicationInput) });
      setFormOpen(false); list.reload(); void showSuccess(editing ? "Medicamento actualizado" : "Medicamento creado", "El catálogo quedó actualizado.");
    } catch (reason) { const error = applyApiFormErrors(reason, form.setError); void showError("No se guardó el medicamento", error.message); }
  });
  async function setStatus(row: MedicationListItem, active: boolean) {
    setStatusPending(row.id);
    try { await apiRequest<MedicationListItem>(`/medications/${row.id}/status`, { method: "PATCH", body: JSON.stringify({ active } satisfies StatusInput) }); list.reload(); void showSuccess(active ? "Medicamento activado" : "Medicamento desactivado", "Las recetas históricas no fueron modificadas."); }
    catch (reason) { const error = applyApiFormErrors(reason, form.setError); void showError("No se cambió el estado", error.message); }
    finally { setStatusPending(null); }
  }
  const columns: ColumnDef<MedicationListItem>[] = [
    { id: "commercialName", accessorKey: "commercialName", header: "Medicamento", cell: ({ row }) => <div className="table-module-cell"><strong>{row.original.commercialName}</strong><span>{row.original.concentration}</span></div> },
    { id: "activeIngredient", accessorKey: "activeIngredient", header: "Principio activo" },
    { id: "presentation", accessorKey: "presentation", header: "Presentación", enableSorting: false },
    { id: "prescriptions", header: "Prescripciones", enableSorting: false, cell: ({ row }) => row.original.prescriptionCount },
    { id: "status", header: "Estado", enableSorting: false, cell: ({ row }) => <StatusBadge active={row.original.active} activeLabel="Activo" inactiveLabel="Inactivo" /> },
    { id: "actions", header: "Acciones", enableSorting: false, cell: ({ row }) => <RecordActions active={row.original.active} canWrite={canWrite} entityLabel={`el medicamento ${row.original.commercialName}`} onDetail={() => setDetail(row.original)} onEdit={() => openEdit(row.original)} onStatus={(active) => setStatus(row.original, active)} statusPending={statusPending === row.original.id} /> },
  ];
  return <>
    <ResourcePanel canWrite={canWrite} columns={columns} description="Catálogo disponible para nuevas prescripciones." emptyTitle="No hay medicamentos" emptyDescription="Cambie los filtros o cree el primer medicamento." getRowId={(row) => String(row.id)} list={list} onCreate={openCreate} searchPlaceholder="Nombre, principio o concentración" title="Medicamentos" />
    <FormModal open={formOpen} onClose={() => { void closeForm(); }} onSubmit={save} isSubmitting={form.formState.isSubmitting} submitLabel={editing ? "Guardar cambios" : "Crear medicamento"} title={editing ? "Editar medicamento" : "Nuevo medicamento"} description="La combinación de los cuatro campos debe ser única.">
      <FormSection title="Identificación"><div className="crud-form-grid"><FormField htmlFor="med-name" label="Nombre comercial" required error={form.formState.errors.commercialName?.message}><input {...form.register("commercialName")} /></FormField><FormField htmlFor="med-active" label="Principio activo" required error={form.formState.errors.activeIngredient?.message}><input {...form.register("activeIngredient")} /></FormField><FormField htmlFor="med-presentation" label="Presentación" required error={form.formState.errors.presentation?.message}><input {...form.register("presentation")} placeholder="Tabletas" /></FormField><FormField htmlFor="med-concentration" label="Concentración" required error={form.formState.errors.concentration?.message}><input {...form.register("concentration")} placeholder="500 mg" /></FormField></div></FormSection>
    </FormModal>
    <DetailModal open={detail !== null} onClose={() => setDetail(null)} title="Detalle de medicamento" footer={<button className="button button-primary" type="button" onClick={() => setDetail(null)}>Cerrar</button>}>{detail && <dl className="permission-detail-list"><div><dt>Nombre</dt><dd>{detail.commercialName}</dd></div><div><dt>Principio activo</dt><dd>{detail.activeIngredient}</dd></div><div><dt>Presentación</dt><dd>{detail.presentation}</dd></div><div><dt>Concentración</dt><dd>{detail.concentration}</dd></div><div><dt>Prescripciones</dt><dd>{detail.prescriptionCount}</dd></div><div><dt>Estado</dt><dd><StatusBadge active={detail.active} activeLabel="Activo" inactiveLabel="Inactivo" /></dd></div></dl>}</DetailModal>
  </>;
}
