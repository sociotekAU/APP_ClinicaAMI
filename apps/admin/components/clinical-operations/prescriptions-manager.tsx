"use client";

import type { ClinicalOperationsOptions, PrescriptionDetail, PrescriptionInput, PrescriptionListItem, PrescriptionStatus } from "@ami/contracts";
import { zodResolver } from "@hookform/resolvers/zod";
import type { ColumnDef } from "@tanstack/react-table";
import { Ban, Eye, Plus, Printer, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { z } from "zod";
import { ApiClientError, apiRequest } from "../../lib/api-client";
import { confirmDiscardChanges, requestAnnulmentReason, showError, showSuccess } from "../../lib/alerts";
import { applyApiFormErrors } from "../administration/form-api-error";
import { formatDateTime, formatDateTimeWithWeekday, formatWeekdayName } from "../administration/formatters";
import { ResourcePanel } from "../administration/resource-panel";
import { useResourceList } from "../administration/use-resource-list";
import { FormField, FormSection } from "../crud/form-field";
import { DetailModal, FormModal } from "../crud/modal";
import { StatusBadge } from "../crud/status-badge";
import { openPrintDocument } from "../../lib/print-document";

const STATUS_OPTIONS = [{ value: "all", label: "Todos los estados" }, { value: "emitida", label: "Emitidas" }, { value: "anulada", label: "Anuladas" }];
const schema = z.object({ patientId: z.number().int().positive("Seleccione un paciente."), professionalId: z.number().int().positive("Seleccione un profesional."), diagnosis: z.string().trim().min(3, "Escriba al menos 3 caracteres.").max(10_000), items: z.array(z.object({ medicationId: z.number().int().positive("Seleccione un medicamento."), dose: z.string().trim().min(2, "Escriba la dosis.").max(100), durationDays: z.number().int().positive("Debe ser mayor que cero.") })).min(1, "Agregue al menos un medicamento.").refine((items) => new Set(items.map((item) => item.medicationId)).size === items.length, "No repita medicamentos.") });
type FormValues = z.infer<typeof schema>;
const DEFAULTS: FormValues = { patientId: 0, professionalId: 0, diagnosis: "", items: [{ medicationId: 0, dose: "", durationDays: 1 }] };

function PrescriptionBadge({ status }: Readonly<{ status: PrescriptionStatus }>) {
  return <StatusBadge active={status === "emitida"} activeLabel="Emitida" inactiveLabel="Anulada" />;
}

export function PrescriptionsManager({ canWrite }: Readonly<{ canWrite: boolean }>) {
  const list = useResourceList<PrescriptionListItem>({ endpoint: "/prescriptions", defaultSort: "issuedAt" });
  const [options, setOptions] = useState<ClinicalOperationsOptions | null>(null);
  const [detail, setDetail] = useState<PrescriptionDetail | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);
  const form = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: DEFAULTS });
  const lines = useFieldArray({ control: form.control, name: "items" });

  function loadOptions() { apiRequest<ClinicalOperationsOptions>("/clinical-operations/options").then(setOptions).catch((reason: unknown) => { const error = reason instanceof ApiClientError ? reason : null; void showError("No se cargaron las opciones", error?.message ?? "Intente nuevamente."); }); }
  useEffect(loadOptions, []);
  function openCreate() { form.reset(DEFAULTS); setFormOpen(true); }
  async function closeForm() { if (form.formState.isDirty && !(await confirmDiscardChanges())) return; setFormOpen(false); }
  async function openDetail(row: PrescriptionListItem) {
    setBusyId(row.id);
    try { setDetail(await apiRequest<PrescriptionDetail>(`/prescriptions/${row.id}`)); }
    catch (reason) { const error = reason instanceof ApiClientError ? reason : null; void showError("No se abrió la receta", error?.message ?? "Intente nuevamente."); }
    finally { setBusyId(null); }
  }
  async function printFromList(row: PrescriptionListItem) {
    setBusyId(row.id);
    try { printPrescription(await apiRequest<PrescriptionDetail>(`/prescriptions/${row.id}`)); }
    catch (reason) { const error = reason instanceof ApiClientError ? reason : null; void showError("No se imprimió la receta", error?.message ?? "Intente nuevamente."); }
    finally { setBusyId(null); }
  }
  const save = form.handleSubmit(async (values) => {
    try {
      const created = await apiRequest<PrescriptionDetail>("/prescriptions", { method: "POST", body: JSON.stringify(values satisfies PrescriptionInput) });
      setFormOpen(false); setDetail(created); list.reload(); void showSuccess("Receta emitida", "La prescripción quedó guardada como historial inmutable.");
    } catch (reason) { const error = applyApiFormErrors(reason, form.setError); void showError("No se emitió la receta", error.message); }
  }, () => {
    void showError("Revise la receta", "Complete los campos obligatorios y verifique que no haya medicamentos repetidos.");
  });
  async function annul(row: PrescriptionListItem) {
    const reason = await requestAnnulmentReason(); if (!reason) return;
    setBusyId(row.id);
    try { const updated = await apiRequest<PrescriptionDetail>(`/prescriptions/${row.id}/annul`, { method: "PATCH", body: JSON.stringify({ reason }) }); setDetail(updated); list.reload(); void showSuccess("Receta anulada", "El registro se conservó con el motivo indicado."); }
    catch (failure) { const error = failure instanceof ApiClientError ? failure : null; void showError("No se anuló la receta", error?.message ?? "Intente nuevamente."); }
    finally { setBusyId(null); }
  }
  function printPrescription(prescription: PrescriptionDetail) {
    const opened = openPrintDocument({
      title: `Receta médica #${prescription.id}`,
      subtitle: prescription.status === "anulada" ? "RECETA ANULADA — NO UTILIZAR" : "Alternativa Médica Integral A.M.I.",
      fields: [
        { label: "Profesional", value: `${prescription.professional.name} · ${prescription.professional.specialty}` },
        { label: "Paciente", value: prescription.patient.name },
        { label: "Fecha de emisión", value: formatDateTimeWithWeekday(prescription.issuedAt) },
        { label: "Diagnóstico o indicación", value: prescription.diagnosis },
        { label: "Estado", value: prescription.status === "emitida" ? "Emitida" : "Anulada" },
        ...(prescription.annulmentReason ? [{ label: "Motivo de anulación", value: prescription.annulmentReason }] : []),
      ],
      tables: [{
        title: "Medicamentos indicados",
        columns: ["Medicamento", "Dosis e indicaciones", "Duración"],
        rows: prescription.items.map((item) => [item.medication.label, item.dose, `${item.durationDays} ${item.durationDays === 1 ? "día" : "días"}`]),
      }],
      footer: prescription.status === "anulada" ? "Documento anulado; se conserva únicamente como historial." : "Siga las indicaciones del profesional tratante.",
    });
    if (!opened) void showError("No se abrió la impresión", "Permita ventanas emergentes para imprimir la receta.");
  }
  const columns: ColumnDef<PrescriptionListItem>[] = [
    { id: "professional", accessorFn: (row) => row.professional.name, header: "Profesional", cell: ({ row }) => <div className="table-module-cell"><strong>{row.original.professional.name}</strong><span>{row.original.professional.specialty}</span></div> },
    { id: "patient", accessorFn: (row) => row.patient.name, header: "Paciente" },
    { id: "issuedAt", accessorKey: "issuedAt", header: "Fecha", cell: ({ row }) => <div className="table-date-stack"><strong>{formatDateTime(row.original.issuedAt)}</strong><span>{formatWeekdayName(row.original.issuedAt)}</span></div> },
    { id: "items", header: "Medicamentos", enableSorting: false, cell: ({ row }) => row.original.itemCount },
    { id: "status", header: "Estado", enableSorting: false, cell: ({ row }) => <PrescriptionBadge status={row.original.status} /> },
    { id: "actions", header: "Acciones", enableSorting: false, cell: ({ row }) => <div className="record-actions"><button className="table-action-button" type="button" disabled={busyId === row.original.id} onClick={() => { void openDetail(row.original); }}><Eye aria-hidden="true" /> Detalle</button><button className="table-action-button" type="button" disabled={busyId === row.original.id} onClick={() => { void printFromList(row.original); }}><Printer aria-hidden="true" /> Imprimir</button>{canWrite && row.original.status === "emitida" && <button className="status-action-button" type="button" disabled={busyId === row.original.id} onClick={() => { void annul(row.original); }}><Ban aria-hidden="true" /> Anular</button>}</div> },
  ];
  return <>
    <ResourcePanel canWrite={canWrite} columns={columns} description="Prescripciones emitidas y anulaciones conservadas como historial." emptyTitle="No hay recetas" emptyDescription="Cambie los filtros o emita la primera receta." getRowId={(row) => String(row.id)} list={list} onCreate={openCreate} searchPlaceholder="Paciente, profesional o diagnóstico" statusOptions={STATUS_OPTIONS} title="Recetas" />
    <FormModal open={formOpen} onClose={() => { void closeForm(); }} onSubmit={save} isSubmitting={form.formState.isSubmitting} submitLabel="Emitir receta" title="Nueva receta" description="Una vez emitida no puede editarse; si existe un error deberá anularse." size="lg">
      <FormSection title="Paciente y diagnóstico"><div className="crud-form-grid"><FormField htmlFor="rx-patient" label="Paciente" required error={form.formState.errors.patientId?.message}><select {...form.register("patientId", { valueAsNumber: true })}><option value={0}>Seleccione un paciente</option>{options?.patients.map((option) => <option key={option.id} value={option.id} disabled={!option.active}>{option.label}</option>)}</select></FormField><FormField htmlFor="rx-professional" label="Profesional" required error={form.formState.errors.professionalId?.message}><select {...form.register("professionalId", { valueAsNumber: true })}><option value={0}>Seleccione un profesional</option>{options?.professionals.map((option) => <option key={option.id} value={option.id} disabled={!option.active}>{option.label}</option>)}</select></FormField></div><FormField htmlFor="rx-diagnosis" label="Diagnóstico o indicación" required error={form.formState.errors.diagnosis?.message}><textarea {...form.register("diagnosis")} rows={3} /></FormField></FormSection>
      <FormSection title="Medicamentos"><div className="repeatable-list">{lines.fields.map((line, index) => <div className="repeatable-row" key={line.id}><div className="crud-form-grid"><FormField htmlFor={`rx-med-${index}`} label="Medicamento" required error={form.formState.errors.items?.[index]?.medicationId?.message}><select {...form.register(`items.${index}.medicationId`, { valueAsNumber: true })}><option value={0}>Seleccione</option>{options?.medications.map((option) => <option key={option.id} value={option.id} disabled={!option.active}>{option.label}</option>)}</select></FormField><FormField htmlFor={`rx-duration-${index}`} label="Duración (días)" required error={form.formState.errors.items?.[index]?.durationDays?.message}><input {...form.register(`items.${index}.durationDays`, { valueAsNumber: true })} type="number" min={1} /></FormField></div><FormField htmlFor={`rx-dose-${index}`} label="Dosis e indicaciones" required error={form.formState.errors.items?.[index]?.dose?.message}><input {...form.register(`items.${index}.dose`)} placeholder="1 tableta cada 8 horas" /></FormField>{lines.fields.length > 1 && <button className="button button-secondary button-compact" type="button" onClick={() => lines.remove(index)}><Trash2 aria-hidden="true" /> Quitar</button>}</div>)}</div>{typeof form.formState.errors.items?.message === "string" && <p className="crud-field-error" role="alert">{form.formState.errors.items.message}</p>}<button className="button button-secondary button-compact" type="button" onClick={() => lines.append({ medicationId: 0, dose: "", durationDays: 1 })}><Plus aria-hidden="true" /> Agregar medicamento</button></FormSection>
    </FormModal>
    <DetailModal open={detail !== null} onClose={() => setDetail(null)} title={`Receta #${detail?.id ?? ""}`} size="lg" footer={<><button className="button button-secondary" type="button" onClick={() => setDetail(null)}>Cerrar</button>{detail && <button className="button button-primary" type="button" onClick={() => printPrescription(detail)}><Printer aria-hidden="true" /> Imprimir receta</button>}</>}>{detail && <div className="clinical-detail"><dl className="permission-detail-list"><div><dt>Profesional</dt><dd>{detail.professional.name}</dd></div><div><dt>Paciente</dt><dd>{detail.patient.name}</dd></div><div><dt>Emisión</dt><dd>{formatDateTimeWithWeekday(detail.issuedAt)}</dd></div><div><dt>Diagnóstico</dt><dd>{detail.diagnosis}</dd></div><div><dt>Estado</dt><dd><PrescriptionBadge status={detail.status} /></dd></div>{detail.annulledAt && <><div><dt>Anulación</dt><dd>{formatDateTime(detail.annulledAt)}</dd></div><div><dt>Motivo</dt><dd>{detail.annulmentReason}</dd></div></>}</dl><details className="record-accordion" open><summary>Medicamentos indicados <span>{detail.items.length}</span></summary><section className="record-items">{detail.items.map((item) => <article key={item.id}><strong>{item.medication.label}</strong><span>{item.dose}</span><small>{item.durationDays} {item.durationDays === 1 ? "día" : "días"}</small></article>)}</section></details></div>}</DetailModal>
  </>;
}
