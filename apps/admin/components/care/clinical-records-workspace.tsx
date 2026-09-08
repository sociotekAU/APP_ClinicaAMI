"use client";

import type { ClinicalRecordDetail, ClinicalRecordInput, ClinicalRecordListItem, ClinicalRecordOptions, ClinicalRecordType, VitalSignsInput, VitalSignsItem } from "@ami/contracts";
import { zodResolver } from "@hookform/resolvers/zod";
import type { ColumnDef } from "@tanstack/react-table";
import { Activity, Eye, FilePenLine, HeartPulse, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { ApiClientError, apiRequest } from "../../lib/api-client";
import { confirmDiscardChanges, showError, showSuccess } from "../../lib/alerts";
import { applyApiFormErrors } from "../administration/form-api-error";
import { formatDateTime } from "../administration/formatters";
import { ResourcePanel } from "../administration/resource-panel";
import { useResourceList } from "../administration/use-resource-list";
import { FormField, FormSection } from "../crud/form-field";
import { DetailModal, FormModal } from "../crud/modal";

const recordSchema = z.object({
  appointmentId: z.number().int().positive("Seleccione una cita."),
  consultationReason: z.string().trim().min(3, "Escriba al menos 3 caracteres.").max(10_000),
  evolutionNotes: z.string().trim().max(20_000),
  diagnosisCie10: z.string().trim().refine((value) => !value || /^[A-Za-z][0-9]{2}(?:\.[0-9A-Za-z]{1,4})?$/.test(value), "Use un código CIE-10 válido, por ejemplo J00."),
});
type RecordForm = z.infer<typeof recordSchema>;
const RECORD_DEFAULTS: RecordForm = { appointmentId: 0, consultationReason: "", evolutionNotes: "", diagnosisCie10: "" };

const vitalSchema = z.object({
  weightKg: z.number().positive("Debe ser mayor que cero.").max(9999.99).optional(),
  heightCm: z.number().positive("Debe ser mayor que cero.").max(9999.99).optional(),
  bloodPressure: z.string().trim().refine((value) => !value || /^\d{2,3}\/\d{2,3}$/.test(value), "Use el formato 120/80."),
  heartRate: z.number().int().positive("Debe ser mayor que cero.").max(300).optional(),
  temperature: z.number().min(25).max(50).optional(),
}).refine((values) => values.weightKg !== undefined || values.heightCm !== undefined || values.bloodPressure || values.heartRate !== undefined || values.temperature !== undefined, { message: "Ingrese al menos una medición.", path: ["weightKg"] });
type VitalForm = z.infer<typeof vitalSchema>;
const VITAL_DEFAULTS: VitalForm = { weightKg: undefined, heightCm: undefined, bloodPressure: "", heartRate: undefined, temperature: undefined };

function numberInput() {
  return { setValueAs: (value: string) => value === "" ? undefined : Number(value) };
}

export function ClinicalRecordsWorkspace({ canWrite, type }: Readonly<{ canWrite: boolean; type: ClinicalRecordType }>) {
  const label = type === "general" ? "Expediente clínico general" : "Expediente de psicología";
  const endpoint = `/clinical-records/${type}`;
  const list = useResourceList<ClinicalRecordListItem>({ endpoint, defaultSort: "recordedAt", includeStatus: false });
  const [options, setOptions] = useState<ClinicalRecordOptions | null>(null);
  const [detail, setDetail] = useState<ClinicalRecordDetail | null>(null);
  const [editing, setEditing] = useState<ClinicalRecordListItem | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [vitalOpen, setVitalOpen] = useState(false);
  const [editingVital, setEditingVital] = useState<VitalSignsItem | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const form = useForm<RecordForm>({ resolver: zodResolver(recordSchema), defaultValues: RECORD_DEFAULTS });
  const vitalForm = useForm<VitalForm>({ resolver: zodResolver(vitalSchema), defaultValues: VITAL_DEFAULTS });

  function loadOptions() {
    apiRequest<ClinicalRecordOptions>(`${endpoint}/options`).then(setOptions).catch((reason: unknown) => {
      const error = reason instanceof ApiClientError ? reason : null;
      void showError("No se cargaron las citas", error?.message ?? "Intente nuevamente.");
    });
  }
  useEffect(loadOptions, [endpoint]);

  function openCreate() { setEditing(null); form.reset(RECORD_DEFAULTS); setFormOpen(true); }
  function openEdit(row: ClinicalRecordListItem) { setEditing(row); form.reset({ appointmentId: row.appointmentId, consultationReason: row.consultationReason, evolutionNotes: row.evolutionNotes ?? "", diagnosisCie10: row.diagnosisCie10 ?? "" }); setFormOpen(true); }
  async function closeForm() { if (form.formState.isDirty && !(await confirmDiscardChanges())) return; setFormOpen(false); }

  async function openDetail(row: ClinicalRecordListItem) {
    setDetailLoading(true);
    try { setDetail(await apiRequest<ClinicalRecordDetail>(`${endpoint}/${row.id}`)); }
    catch (reason) { const error = reason instanceof ApiClientError ? reason : null; void showError("No se abrió el expediente", error?.message ?? "Intente nuevamente."); }
    finally { setDetailLoading(false); }
  }

  const save = form.handleSubmit(async (values) => {
    const payload: ClinicalRecordInput = { appointmentId: values.appointmentId, consultationReason: values.consultationReason, ...(values.evolutionNotes ? { evolutionNotes: values.evolutionNotes } : {}), ...(values.diagnosisCie10 ? { diagnosisCie10: values.diagnosisCie10 } : {}) };
    try {
      const saved = await apiRequest<ClinicalRecordDetail>(editing ? `${endpoint}/${editing.id}` : endpoint, { method: editing ? "PATCH" : "POST", body: JSON.stringify(payload) });
      setFormOpen(false); setDetail(saved); list.reload(); loadOptions();
      void showSuccess(editing ? "Expediente actualizado" : "Expediente abierto", "La información clínica quedó guardada.");
    } catch (reason) {
      const error = applyApiFormErrors(reason, form.setError);
      void showError("No se guardó el expediente", error.message);
    }
  });

  function openVital(vital?: VitalSignsItem) {
    setEditingVital(vital ?? null);
    vitalForm.reset(vital ? { weightKg: vital.weightKg ?? undefined, heightCm: vital.heightCm ?? undefined, bloodPressure: vital.bloodPressure ?? "", heartRate: vital.heartRate ?? undefined, temperature: vital.temperature ?? undefined } : VITAL_DEFAULTS);
    setVitalOpen(true);
  }
  async function closeVital() { if (vitalForm.formState.isDirty && !(await confirmDiscardChanges())) return; setVitalOpen(false); }

  const saveVital = vitalForm.handleSubmit(async (values) => {
    if (!detail) return;
    const payload: VitalSignsInput = { weightKg: values.weightKg, heightCm: values.heightCm, heartRate: values.heartRate, temperature: values.temperature, ...(values.bloodPressure ? { bloodPressure: values.bloodPressure } : {}) };
    try {
      const path = editingVital ? `${endpoint}/${detail.id}/vital-signs/${editingVital.id}` : `${endpoint}/${detail.id}/vital-signs`;
      const saved = await apiRequest<ClinicalRecordDetail>(path, { method: editingVital ? "PATCH" : "POST", body: JSON.stringify(payload) });
      setVitalOpen(false); setDetail(saved); list.reload();
      void showSuccess(editingVital ? "Medición actualizada" : "Signos vitales registrados", "La medición quedó incorporada al expediente.");
    } catch (reason) {
      const error = applyApiFormErrors(reason, vitalForm.setError);
      void showError("No se guardaron los signos vitales", error.message);
    }
  });

  const columns: ColumnDef<ClinicalRecordListItem>[] = [
    { id: "recordedAt", accessorKey: "recordedAt", header: "Registro", cell: ({ row }) => <strong className="table-primary-text">{formatDateTime(row.original.recordedAt)}</strong> },
    { id: "patient", accessorFn: (row) => row.patient.name, header: "Paciente" },
    { id: "professional", accessorFn: (row) => row.professional.name, header: "Profesional", cell: ({ row }) => <div className="table-module-cell"><strong>{row.original.professional.name}</strong><span>{row.original.professional.specialty}</span></div> },
    { id: "diagnosis", header: "CIE-10", enableSorting: false, cell: ({ row }) => row.original.diagnosisCie10 ?? "Pendiente" },
    { id: "vitals", header: "Mediciones", enableSorting: false, cell: ({ row }) => row.original.measurementCount },
    { id: "actions", header: "Acciones", enableSorting: false, cell: ({ row }) => <div className="record-actions"><button className="table-action-button" type="button" disabled={detailLoading} onClick={() => { void openDetail(row.original); }}><Eye aria-hidden="true" /> Detalle</button>{canWrite && <button className="table-action-button" type="button" onClick={() => openEdit(row.original)}><FilePenLine aria-hidden="true" /> Editar</button>}</div> },
  ];

  return <section className="administration-workspace clinical-workspace" aria-labelledby={`clinical-${type}-title`}>
    <header className="administration-heading"><div><p className="eyebrow">Gestión clínica protegida</p><h2 id={`clinical-${type}-title`}>{label}</h2><p>Las consultas y mediciones están aisladas por tipo de expediente y profesional.</p></div><span className={canWrite ? "access-level-write" : "access-level-read"}><ShieldCheck aria-hidden="true" /> {canWrite ? "Lectura y escritura" : "Solo lectura"}</span></header>
    <ResourcePanel canWrite={canWrite} columns={columns} description="Historial longitudinal vinculado con citas completadas." emptyTitle="No hay expedientes" emptyDescription="Cambie la búsqueda o abra el primer expediente desde una cita elegible." getRowId={(row) => String(row.id)} list={list} onCreate={openCreate} searchPlaceholder="Paciente, profesional, motivo o CIE-10" statusOptions={[]} title={label} />

    <FormModal open={formOpen} onClose={() => { void closeForm(); }} onSubmit={save} isSubmitting={form.formState.isSubmitting} submitLabel={editing ? "Guardar cambios" : "Abrir expediente"} title={editing ? "Editar consulta" : "Nueva consulta"} description="La cita quedará completada al abrir el expediente." size="lg">
      <FormSection title="Consulta">
        <FormField htmlFor="record-appointment" label="Cita" required error={form.formState.errors.appointmentId?.message}><select {...form.register("appointmentId", { valueAsNumber: true })} disabled={editing !== null}><option value={0}>Seleccione una cita</option>{editing && <option value={editing.appointmentId}>{editing.patient.name} · {formatDateTime(editing.appointmentAt)}</option>}{options?.appointments.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}</select></FormField>
        <FormField htmlFor="record-reason" label="Motivo de consulta" required error={form.formState.errors.consultationReason?.message}><textarea {...form.register("consultationReason")} rows={4} /></FormField>
        <FormField htmlFor="record-notes" label="Notas de evolución" error={form.formState.errors.evolutionNotes?.message}><textarea {...form.register("evolutionNotes")} rows={6} /></FormField>
        <FormField htmlFor="record-diagnosis" label="Diagnóstico CIE-10" help="Ejemplo: J00 o F41.1" error={form.formState.errors.diagnosisCie10?.message}><input {...form.register("diagnosisCie10")} autoComplete="off" /></FormField>
      </FormSection>
    </FormModal>

    <DetailModal open={detail !== null} onClose={() => setDetail(null)} title={label} size="lg" footer={<><button className="button button-secondary" type="button" onClick={() => setDetail(null)}>Cerrar</button>{canWrite && <button className="button button-primary" type="button" onClick={() => openVital()}><HeartPulse aria-hidden="true" /> Nueva medición</button>}</>}>
      {detail && <div className="clinical-detail"><dl className="permission-detail-list"><div><dt>Paciente</dt><dd>{detail.patient.name}</dd></div><div><dt>Profesional</dt><dd>{detail.professional.name} · {detail.professional.specialty}</dd></div><div><dt>Cita</dt><dd>{formatDateTime(detail.appointmentAt)}</dd></div><div><dt>Motivo</dt><dd>{detail.consultationReason}</dd></div><div><dt>Evolución</dt><dd>{detail.evolutionNotes || "Sin notas"}</dd></div><div><dt>CIE-10</dt><dd>{detail.diagnosisCie10 || "Pendiente"}</dd></div><div><dt>Antecedentes</dt><dd>{detail.personalHistory || "Sin antecedentes registrados"}</dd></div></dl><section className="vitals-history" aria-labelledby="vitals-title"><h3 id="vitals-title"><Activity aria-hidden="true" /> Historial de signos vitales</h3>{detail.vitalSigns.length === 0 ? <p>Sin mediciones registradas.</p> : detail.vitalSigns.map((vital) => <article key={vital.id}><div><strong>{formatDateTime(vital.measuredAt)}</strong>{canWrite && <button className="table-action-button" type="button" onClick={() => openVital(vital)}><FilePenLine aria-hidden="true" /> Editar</button>}</div><dl><div><dt>Peso</dt><dd>{vital.weightKg ?? "—"} {vital.weightKg === null ? "" : "kg"}</dd></div><div><dt>Estatura</dt><dd>{vital.heightCm ?? "—"} {vital.heightCm === null ? "" : "cm"}</dd></div><div><dt>Presión</dt><dd>{vital.bloodPressure ?? "—"}</dd></div><div><dt>Frecuencia</dt><dd>{vital.heartRate ?? "—"}</dd></div><div><dt>Temperatura</dt><dd>{vital.temperature ?? "—"} {vital.temperature === null ? "" : "°C"}</dd></div><div><dt>IMC</dt><dd>{vital.bmi ?? "—"}</dd></div></dl></article>)}</section></div>}
    </DetailModal>

    <FormModal open={vitalOpen} onClose={() => { void closeVital(); }} onSubmit={saveVital} isSubmitting={vitalForm.formState.isSubmitting} submitLabel={editingVital ? "Guardar medición" : "Registrar medición"} title={editingVital ? "Editar signos vitales" : "Nuevos signos vitales"} description="Ingrese al menos una medición.">
      <FormSection title="Mediciones"><div className="crud-form-grid">
        <FormField htmlFor="vital-weight" label="Peso (kg)" error={vitalForm.formState.errors.weightKg?.message}><input {...vitalForm.register("weightKg", numberInput())} type="number" min="0.01" step="0.01" /></FormField>
        <FormField htmlFor="vital-height" label="Estatura (cm)" error={vitalForm.formState.errors.heightCm?.message}><input {...vitalForm.register("heightCm", numberInput())} type="number" min="0.01" step="0.01" /></FormField>
        <FormField htmlFor="vital-pressure" label="Presión arterial" help="Formato 120/80" error={vitalForm.formState.errors.bloodPressure?.message}><input {...vitalForm.register("bloodPressure")} inputMode="numeric" /></FormField>
        <FormField htmlFor="vital-heart-rate" label="Frecuencia cardiaca" error={vitalForm.formState.errors.heartRate?.message}><input {...vitalForm.register("heartRate", numberInput())} type="number" min="1" max="300" /></FormField>
        <FormField htmlFor="vital-temperature" label="Temperatura (°C)" error={vitalForm.formState.errors.temperature?.message}><input {...vitalForm.register("temperature", numberInput())} type="number" min="25" max="50" step="0.1" /></FormField>
      </div></FormSection>
    </FormModal>
  </section>;
}
