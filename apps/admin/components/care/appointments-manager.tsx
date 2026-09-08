"use client";

import type { AgendaOptions, AppointmentInput, AppointmentListItem, AppointmentStatus, AppointmentStatusInput } from "@ami/contracts";
import { zodResolver } from "@hookform/resolvers/zod";
import type { ColumnDef } from "@tanstack/react-table";
import { Eye, Pencil } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { ApiClientError, apiRequest } from "../../lib/api-client";
import { confirmAppointmentStatus, confirmDiscardChanges, showError, showSuccess } from "../../lib/alerts";
import { applyApiFormErrors } from "../administration/form-api-error";
import { formatDateTime } from "../administration/formatters";
import { ResourcePanel } from "../administration/resource-panel";
import { useResourceList } from "../administration/use-resource-list";
import { FormField, FormSection } from "../crud/form-field";
import { DetailModal, FormModal } from "../crud/modal";

const STATUS_LABELS: Record<AppointmentStatus, string> = { programada: "programada", completada: "completada", cancelada: "cancelada", no_asistio: "inasistencia" };
const STATUS_OPTIONS = [
  { value: "all", label: "Todos los estados" },
  { value: "programada", label: "Programadas" },
  { value: "completada", label: "Completadas" },
  { value: "cancelada", label: "Canceladas" },
  { value: "no_asistio", label: "Inasistencias" },
];
const schema = z.object({
  patientId: z.number().int().positive("Seleccione un paciente."),
  professionalId: z.number().int().positive("Seleccione un profesional."),
  clinicId: z.number().int().nonnegative(),
  scheduledAt: z.string().min(1, "Seleccione fecha y hora."),
  reason: z.string().trim().min(3, "Escriba al menos 3 caracteres.").max(255),
});
type AppointmentForm = z.infer<typeof schema>;
const DEFAULTS: AppointmentForm = { patientId: 0, professionalId: 0, clinicId: 0, scheduledAt: "", reason: "" };

function toLocalInput(value: string): string {
  const date = new Date(value);
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function AppointmentBadge({ status }: Readonly<{ status: AppointmentStatus }>) {
  const positive = status === "programada" || status === "completada";
  return <span className={`status-badge ${positive ? "is-active" : "is-inactive"}`}>{STATUS_LABELS[status]}</span>;
}

export function AppointmentsManager({ canWrite }: Readonly<{ canWrite: boolean }>) {
  const list = useResourceList<AppointmentListItem>({ endpoint: "/agenda/appointments", defaultSort: "scheduledAt", defaultStatus: "all" });
  const [options, setOptions] = useState<AgendaOptions | null>(null);
  const [detail, setDetail] = useState<AppointmentListItem | null>(null);
  const [editing, setEditing] = useState<AppointmentListItem | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [statusPending, setStatusPending] = useState<number | null>(null);
  const form = useForm<AppointmentForm>({ resolver: zodResolver(schema), defaultValues: DEFAULTS });
  const selectedProfessional = form.watch("professionalId");
  const clinicOptions = useMemo(() => options?.clinics.filter((option) => option.professionalId === selectedProfessional) ?? [], [options, selectedProfessional]);

  useEffect(() => {
    apiRequest<AgendaOptions>("/agenda/options").then(setOptions).catch((reason: unknown) => {
      const error = reason instanceof ApiClientError ? reason : null;
      void showError("No se cargaron las opciones", error?.message ?? "Intente nuevamente.");
    });
  }, []);

  function openCreate() { setEditing(null); form.reset(DEFAULTS); setFormOpen(true); }
  function openEdit(row: AppointmentListItem) {
    setEditing(row);
    form.reset({ patientId: row.patient.id, professionalId: row.professional.id, clinicId: row.clinic?.id ?? 0, scheduledAt: toLocalInput(row.scheduledAt), reason: row.reason });
    setFormOpen(true);
  }
  async function closeForm() { if (form.formState.isDirty && !(await confirmDiscardChanges())) return; setFormOpen(false); }

  const save = form.handleSubmit(async (values) => {
    const payload: AppointmentInput = { patientId: values.patientId, professionalId: values.professionalId, clinicId: values.clinicId || null, scheduledAt: new Date(values.scheduledAt).toISOString(), reason: values.reason };
    try {
      await apiRequest<AppointmentListItem>(editing ? `/agenda/appointments/${editing.id}` : "/agenda/appointments", { method: editing ? "PATCH" : "POST", body: JSON.stringify(payload) });
      setFormOpen(false); list.reload();
      void showSuccess(editing ? "Cita actualizada" : "Cita programada", "La agenda quedó actualizada correctamente.");
    } catch (reason) {
      const error = applyApiFormErrors(reason, form.setError);
      void showError("No se guardó la cita", error.message);
    }
  });

  async function changeStatus(row: AppointmentListItem, status: AppointmentStatus) {
    if (status === row.status || !(await confirmAppointmentStatus(STATUS_LABELS[status]))) return;
    setStatusPending(row.id);
    try {
      await apiRequest<AppointmentListItem>(`/agenda/appointments/${row.id}/status`, { method: "PATCH", body: JSON.stringify({ status } satisfies AppointmentStatusInput) });
      list.reload();
      void showSuccess("Estado actualizado", `La cita se marcó como ${STATUS_LABELS[status]}.`);
    } catch (reason) {
      const error = reason instanceof ApiClientError ? reason : null;
      void showError("No se cambió el estado", error?.message ?? "Intente nuevamente.");
    } finally { setStatusPending(null); }
  }

  const columns: ColumnDef<AppointmentListItem>[] = [
    { id: "scheduledAt", accessorKey: "scheduledAt", header: "Fecha y hora", cell: ({ row }) => <strong className="table-primary-text">{formatDateTime(row.original.scheduledAt)}</strong> },
    { id: "patient", accessorFn: (row) => row.patient.name, header: "Paciente" },
    { id: "professional", accessorFn: (row) => row.professional.name, header: "Profesional", cell: ({ row }) => <div className="table-module-cell"><strong>{row.original.professional.name}</strong><span>{row.original.professional.specialty}</span></div> },
    { id: "clinic", header: "Consultorio", enableSorting: false, cell: ({ row }) => row.original.clinic?.name ?? "Por asignar" },
    { id: "status", header: "Estado", enableSorting: false, cell: ({ row }) => <AppointmentBadge status={row.original.status} /> },
    { id: "actions", header: "Acciones", enableSorting: false, cell: ({ row }) => <div className="record-actions"><button className="table-action-button" type="button" onClick={() => setDetail(row.original)}><Eye aria-hidden="true" /> Detalle</button>{canWrite && row.original.status === "programada" && !row.original.hasClinicalRecord && <><button className="table-action-button" type="button" onClick={() => openEdit(row.original)}><Pencil aria-hidden="true" /> Editar</button><label className="table-inline-select"><span className="sr-only">Cambiar estado</span><select value={row.original.status} disabled={statusPending === row.original.id} onChange={(event) => { void changeStatus(row.original, event.target.value as AppointmentStatus); }}><option value="programada">Programada</option><option value="completada">Completada</option><option value="cancelada">Cancelada</option><option value="no_asistio">No asistió</option></select></label></>}</div> },
  ];

  return <>
    <ResourcePanel canWrite={canWrite} columns={columns} description="Programación clínica con control de estado y asignación de consultorio." emptyTitle="No hay citas" emptyDescription="Cambie los filtros o programe la primera cita." getRowId={(row) => String(row.id)} list={list} onCreate={openCreate} searchPlaceholder="Paciente, profesional o motivo" statusOptions={STATUS_OPTIONS} title="Agenda de citas" />
    <FormModal open={formOpen} onClose={() => { void closeForm(); }} onSubmit={save} isSubmitting={form.formState.isSubmitting} submitLabel={editing ? "Guardar cambios" : "Programar cita"} title={editing ? "Editar cita" : "Nueva cita"} description="Un profesional y un paciente no pueden tener dos citas a la misma hora." size="lg">
      <FormSection title="Asignación">
        <div className="crud-form-grid">
          <FormField htmlFor="appointment-patient" label="Paciente" required error={form.formState.errors.patientId?.message}><select {...form.register("patientId", { valueAsNumber: true })}><option value={0}>Seleccione un paciente</option>{options?.patients.map((option) => <option key={option.id} value={option.id} disabled={!option.active}>{option.label}{option.active ? "" : " (inactivo)"}</option>)}</select></FormField>
          <FormField htmlFor="appointment-professional" label="Profesional" required error={form.formState.errors.professionalId?.message}><select {...form.register("professionalId", { valueAsNumber: true })} onChange={(event) => { form.setValue("professionalId", Number(event.target.value), { shouldDirty: true }); form.setValue("clinicId", 0, { shouldDirty: true }); }}><option value={0}>Seleccione un profesional</option>{options?.professionals.map((option) => <option key={option.id} value={option.id} disabled={!option.active}>{option.label}{option.active ? "" : " (inactivo)"}</option>)}</select></FormField>
          <FormField htmlFor="appointment-clinic" label="Consultorio" error={form.formState.errors.clinicId?.message}><select {...form.register("clinicId", { valueAsNumber: true })}><option value={0}>Por asignar</option>{clinicOptions.map((option) => <option key={option.id} value={option.id} disabled={!option.active}>{option.label}{option.active ? "" : " (inactivo)"}</option>)}</select></FormField>
          <FormField htmlFor="appointment-date" label="Fecha y hora" required error={form.formState.errors.scheduledAt?.message}><input {...form.register("scheduledAt")} type="datetime-local" /></FormField>
        </div>
      </FormSection>
      <FormSection title="Motivo"><FormField htmlFor="appointment-reason" label="Motivo de la cita" required error={form.formState.errors.reason?.message}><textarea {...form.register("reason")} rows={4} /></FormField></FormSection>
    </FormModal>
    <DetailModal open={detail !== null} onClose={() => setDetail(null)} title="Detalle de cita" footer={<button className="button button-primary" type="button" onClick={() => setDetail(null)}>Cerrar</button>}>
      {detail && <dl className="permission-detail-list"><div><dt>Fecha y hora</dt><dd>{formatDateTime(detail.scheduledAt)}</dd></div><div><dt>Paciente</dt><dd>{detail.patient.name}</dd></div><div><dt>Profesional</dt><dd>{detail.professional.name}</dd></div><div><dt>Especialidad</dt><dd>{detail.professional.specialty}</dd></div><div><dt>Consultorio</dt><dd>{detail.clinic?.name ?? "Por asignar"}</dd></div><div><dt>Motivo</dt><dd>{detail.reason}</dd></div><div><dt>Estado</dt><dd><AppointmentBadge status={detail.status} /></dd></div><div><dt>Expediente</dt><dd>{detail.hasClinicalRecord ? "Registrado" : "Pendiente"}</dd></div></dl>}
    </DetailModal>
  </>;
}
