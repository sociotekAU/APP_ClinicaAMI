"use client";

import type { AgendaOptions, ClinicInput, ClinicListItem, StatusInput } from "@ami/contracts";
import { zodResolver } from "@hookform/resolvers/zod";
import type { ColumnDef } from "@tanstack/react-table";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { ApiClientError, apiRequest } from "../../lib/api-client";
import { confirmDiscardChanges, showError, showSuccess } from "../../lib/alerts";
import { applyApiFormErrors } from "../administration/form-api-error";
import { RecordActions } from "../administration/record-actions";
import { ResourcePanel } from "../administration/resource-panel";
import { useResourceList } from "../administration/use-resource-list";
import { FormField, FormSection } from "../crud/form-field";
import { DetailModal, FormModal } from "../crud/modal";
import { StatusBadge } from "../crud/status-badge";

const schema = z.object({
  number: z.string().trim().min(1, "Ingrese el número o código.").max(30),
  room: z.string().trim().min(2, "Ingrese al menos 2 caracteres.").max(100),
  schedule: z.string().trim().min(3, "Describa el horario.").max(2000),
  professionalId: z.number().int().positive("Seleccione un profesional."),
});
type ClinicForm = z.infer<typeof schema>;
const DEFAULTS: ClinicForm = { number: "", room: "", schedule: "", professionalId: 0 };

export function ClinicsManager({ canWrite }: Readonly<{ canWrite: boolean }>) {
  const list = useResourceList<ClinicListItem>({ endpoint: "/agenda/clinics", defaultSort: "number" });
  const [options, setOptions] = useState<AgendaOptions | null>(null);
  const [detail, setDetail] = useState<ClinicListItem | null>(null);
  const [editing, setEditing] = useState<ClinicListItem | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [statusPending, setStatusPending] = useState<number | null>(null);
  const form = useForm<ClinicForm>({ resolver: zodResolver(schema), defaultValues: DEFAULTS });

  useEffect(() => {
    apiRequest<AgendaOptions>("/agenda/options").then(setOptions).catch((reason: unknown) => {
      const error = reason instanceof ApiClientError ? reason : null;
      void showError("No se cargaron las opciones", error?.message ?? "Intente nuevamente.");
    });
  }, []);

  function openCreate() { setEditing(null); form.reset(DEFAULTS); setFormOpen(true); }
  function openEdit(row: ClinicListItem) { setEditing(row); form.reset({ number: row.number, room: row.room, schedule: row.schedule, professionalId: row.professional.id }); setFormOpen(true); }
  async function closeForm() { if (form.formState.isDirty && !(await confirmDiscardChanges())) return; setFormOpen(false); }

  const save = form.handleSubmit(async (values) => {
    const payload: ClinicInput = values;
    try {
      await apiRequest<ClinicListItem>(editing ? `/agenda/clinics/${editing.id}` : "/agenda/clinics", { method: editing ? "PATCH" : "POST", body: JSON.stringify(payload) });
      setFormOpen(false); list.reload();
      void showSuccess(editing ? "Consultorio actualizado" : "Consultorio creado", "La asignación quedó guardada correctamente.");
    } catch (reason) {
      const error = applyApiFormErrors(reason, form.setError);
      void showError("No se guardó el consultorio", error.message);
    }
  });

  async function setStatus(row: ClinicListItem, active: boolean) {
    setStatusPending(row.id);
    try {
      await apiRequest<ClinicListItem>(`/agenda/clinics/${row.id}/status`, { method: "PATCH", body: JSON.stringify({ active } satisfies StatusInput) });
      list.reload();
      void showSuccess(active ? "Consultorio activado" : "Consultorio desactivado", "Las citas históricas conservaron su asignación.");
    } catch (reason) {
      const error = applyApiFormErrors(reason, form.setError);
      void showError("No se cambió el estado", error.message);
    } finally { setStatusPending(null); }
  }

  const columns: ColumnDef<ClinicListItem>[] = [
    { id: "number", accessorKey: "number", header: "Consultorio", cell: ({ row }) => <div className="table-module-cell"><strong>{row.original.number}</strong><span>{row.original.room}</span></div> },
    { id: "professional", accessorFn: (row) => row.professional.name, header: "Profesional" },
    { id: "schedule", header: "Horario", enableSorting: false, cell: ({ row }) => row.original.schedule },
    { id: "appointments", header: "Citas", enableSorting: false, cell: ({ row }) => row.original.appointmentCount },
    { id: "status", header: "Estado", enableSorting: false, cell: ({ row }) => <StatusBadge active={row.original.active} activeLabel="Activo" inactiveLabel="Inactivo" /> },
    { id: "actions", header: "Acciones", enableSorting: false, cell: ({ row }) => <RecordActions active={row.original.active} canWrite={canWrite} entityLabel={`el consultorio ${row.original.number}`} onDetail={() => setDetail(row.original)} onEdit={() => openEdit(row.original)} onStatus={(active) => setStatus(row.original, active)} statusPending={statusPending === row.original.id} /> },
  ];

  return <>
    <ResourcePanel canWrite={canWrite} columns={columns} description="Consultorios disponibles y profesional responsable." emptyTitle="No hay consultorios" emptyDescription="Cambie los filtros o cree el primer consultorio." getRowId={(row) => String(row.id)} list={list} onCreate={openCreate} searchPlaceholder="Código, sala o profesional" title="Consultorios" />
    <FormModal open={formOpen} onClose={() => { void closeForm(); }} onSubmit={save} isSubmitting={form.formState.isSubmitting} submitLabel={editing ? "Guardar cambios" : "Crear consultorio"} title={editing ? "Editar consultorio" : "Nuevo consultorio"} description="Cada código de consultorio debe ser único.">
      <FormSection title="Ubicación y responsable"><div className="crud-form-grid">
        <FormField htmlFor="clinic-number" label="Número o código" required error={form.formState.errors.number?.message}><input {...form.register("number")} autoComplete="off" /></FormField>
        <FormField htmlFor="clinic-room" label="Sala" required error={form.formState.errors.room?.message}><input {...form.register("room")} autoComplete="off" /></FormField>
        <FormField htmlFor="clinic-professional" label="Profesional" required error={form.formState.errors.professionalId?.message}><select {...form.register("professionalId", { valueAsNumber: true })}><option value={0}>Seleccione un profesional</option>{options?.professionals.map((option) => <option key={option.id} value={option.id} disabled={!option.active}>{option.label}{option.active ? "" : " (inactivo)"}</option>)}</select></FormField>
      </div></FormSection>
      <FormSection title="Disponibilidad"><FormField htmlFor="clinic-schedule" label="Horario" required error={form.formState.errors.schedule?.message}><textarea {...form.register("schedule")} rows={4} placeholder="Lunes a viernes, 08:00–17:00" /></FormField></FormSection>
    </FormModal>
    <DetailModal open={detail !== null} onClose={() => setDetail(null)} title="Detalle de consultorio" footer={<button className="button button-primary" type="button" onClick={() => setDetail(null)}>Cerrar</button>}>
      {detail && <dl className="permission-detail-list"><div><dt>Consultorio</dt><dd>{detail.number}</dd></div><div><dt>Sala</dt><dd>{detail.room}</dd></div><div><dt>Profesional</dt><dd>{detail.professional.name}</dd></div><div><dt>Horario</dt><dd>{detail.schedule}</dd></div><div><dt>Citas históricas</dt><dd>{detail.appointmentCount}</dd></div><div><dt>Estado</dt><dd><StatusBadge active={detail.active} activeLabel="Activo" inactiveLabel="Inactivo" /></dd></div></dl>}
    </DetailModal>
  </>;
}
