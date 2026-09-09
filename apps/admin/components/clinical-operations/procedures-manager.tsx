"use client";

import type { ClinicalOperationsOptions, ProcedureInput, ProcedureListItem, StatusInput } from "@ami/contracts";
import { zodResolver } from "@hookform/resolvers/zod";
import type { ColumnDef } from "@tanstack/react-table";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { ApiClientError, apiRequest } from "../../lib/api-client";
import { confirmDiscardChanges, showError, showSuccess } from "../../lib/alerts";
import { applyApiFormErrors } from "../administration/form-api-error";
import { formatDateTime } from "../administration/formatters";
import { RecordActions } from "../administration/record-actions";
import { ResourcePanel } from "../administration/resource-panel";
import { useResourceList } from "../administration/use-resource-list";
import { FormField, FormSection } from "../crud/form-field";
import { DetailModal, FormModal } from "../crud/modal";
import { StatusBadge } from "../crud/status-badge";

const schema = z.object({ clinicalRecordId: z.number().int().positive("Seleccione un expediente."), serviceId: z.number().int().positive("Seleccione un servicio."), observations: z.string().trim().max(10_000) });
type FormValues = z.infer<typeof schema>;
const DEFAULTS: FormValues = { clinicalRecordId: 0, serviceId: 0, observations: "" };

export function ProceduresManager({ canWrite }: Readonly<{ canWrite: boolean }>) {
  const list = useResourceList<ProcedureListItem>({ endpoint: "/procedures", defaultSort: "recordedAt" });
  const [options, setOptions] = useState<ClinicalOperationsOptions | null>(null);
  const [detail, setDetail] = useState<ProcedureListItem | null>(null);
  const [editing, setEditing] = useState<ProcedureListItem | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [statusPending, setStatusPending] = useState<number | null>(null);
  const form = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: DEFAULTS });
  useEffect(() => { apiRequest<ClinicalOperationsOptions>("/clinical-operations/options").then(setOptions).catch((reason: unknown) => { const error = reason instanceof ApiClientError ? reason : null; void showError("No se cargaron las opciones", error?.message ?? "Intente nuevamente."); }); }, []);
  function openCreate() { setEditing(null); form.reset(DEFAULTS); setFormOpen(true); }
  function openEdit(row: ProcedureListItem) { setEditing(row); form.reset({ clinicalRecordId: row.clinicalRecordId, serviceId: row.service.id, observations: row.observations ?? "" }); setFormOpen(true); }
  async function closeForm() { if (form.formState.isDirty && !(await confirmDiscardChanges())) return; setFormOpen(false); }
  const save = form.handleSubmit(async (values) => {
    const payload: ProcedureInput = { clinicalRecordId: values.clinicalRecordId, serviceId: values.serviceId, ...(values.observations ? { observations: values.observations } : {}) };
    try { await apiRequest<ProcedureListItem>(editing ? `/procedures/${editing.id}` : "/procedures", { method: editing ? "PATCH" : "POST", body: JSON.stringify(payload) }); setFormOpen(false); list.reload(); void showSuccess(editing ? "Procedimiento actualizado" : "Procedimiento registrado", "El expediente conserva el procedimiento realizado."); }
    catch (reason) { const error = applyApiFormErrors(reason, form.setError); void showError("No se guardó el procedimiento", error.message); }
  });
  async function setStatus(row: ProcedureListItem, active: boolean) {
    setStatusPending(row.id);
    try { await apiRequest<ProcedureListItem>(`/procedures/${row.id}/status`, { method: "PATCH", body: JSON.stringify({ active } satisfies StatusInput) }); list.reload(); void showSuccess(active ? "Procedimiento activado" : "Procedimiento retirado", "El registro histórico permanece disponible."); }
    catch (reason) { const error = applyApiFormErrors(reason, form.setError); void showError("No se cambió el estado", error.message); }
    finally { setStatusPending(null); }
  }
  const columns: ColumnDef<ProcedureListItem>[] = [
    { id: "recordedAt", accessorKey: "recordedAt", header: "Registro", cell: ({ row }) => <strong className="table-primary-text">{formatDateTime(row.original.recordedAt)}</strong> },
    { id: "patient", accessorFn: (row) => row.patient.name, header: "Paciente" },
    { id: "service", accessorFn: (row) => row.service.name, header: "Procedimiento" },
    { id: "record", header: "Expediente", enableSorting: false, cell: ({ row }) => `#${row.original.clinicalRecordId} · ${row.original.clinicalRecordType === "general" ? "General" : "Psicología"}` },
    { id: "status", header: "Estado", enableSorting: false, cell: ({ row }) => <StatusBadge active={row.original.active} activeLabel="Vigente" inactiveLabel="Retirado" /> },
    { id: "actions", header: "Acciones", enableSorting: false, cell: ({ row }) => <RecordActions active={row.original.active} canWrite={canWrite} entityLabel={`el procedimiento ${row.original.service.name}`} onDetail={() => setDetail(row.original)} onEdit={() => openEdit(row.original)} onStatus={(active) => setStatus(row.original, active)} statusPending={statusPending === row.original.id} /> },
  ];
  return <>
    <ResourcePanel canWrite={canWrite} columns={columns} description="Servicios y terapias realizados dentro de una consulta." emptyTitle="No hay procedimientos" emptyDescription="Cambie los filtros o registre el primer procedimiento." getRowId={(row) => String(row.id)} list={list} onCreate={openCreate} searchPlaceholder="Paciente, servicio u observación" title="Procedimientos" />
    <FormModal open={formOpen} onClose={() => { void closeForm(); }} onSubmit={save} isSubmitting={form.formState.isSubmitting} submitLabel={editing ? "Guardar cambios" : "Registrar procedimiento"} title={editing ? "Editar procedimiento" : "Nuevo procedimiento"} description="Un servicio puede registrarse una sola vez dentro de la misma consulta.">
      <FormSection title="Vínculo clínico"><FormField htmlFor="procedure-record" label="Expediente" required error={form.formState.errors.clinicalRecordId?.message}><select {...form.register("clinicalRecordId", { valueAsNumber: true })}><option value={0}>Seleccione un expediente</option>{options?.clinicalRecords.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}</select></FormField><FormField htmlFor="procedure-service" label="Servicio o terapia" required error={form.formState.errors.serviceId?.message}><select {...form.register("serviceId", { valueAsNumber: true })}><option value={0}>Seleccione un servicio</option>{options?.services.map((option) => <option key={option.id} value={option.id} disabled={!option.active}>{option.label}</option>)}</select></FormField><FormField htmlFor="procedure-notes" label="Observaciones" error={form.formState.errors.observations?.message}><textarea {...form.register("observations")} rows={4} /></FormField></FormSection>
    </FormModal>
    <DetailModal open={detail !== null} onClose={() => setDetail(null)} title="Detalle de procedimiento" footer={<button className="button button-primary" type="button" onClick={() => setDetail(null)}>Cerrar</button>}>{detail && <dl className="permission-detail-list"><div><dt>Procedimiento</dt><dd>{detail.service.name}</dd></div><div><dt>Paciente</dt><dd>{detail.patient.name}</dd></div><div><dt>Profesional</dt><dd>{detail.professional.name}</dd></div><div><dt>Expediente</dt><dd>#{detail.clinicalRecordId} · {detail.clinicalRecordType === "general" ? "General" : "Psicología"}</dd></div><div><dt>Observaciones</dt><dd>{detail.observations || "Sin observaciones"}</dd></div><div><dt>Registro</dt><dd>{formatDateTime(detail.recordedAt)}</dd></div><div><dt>Estado</dt><dd><StatusBadge active={detail.active} activeLabel="Vigente" inactiveLabel="Retirado" /></dd></div></dl>}</DetailModal>
  </>;
}
