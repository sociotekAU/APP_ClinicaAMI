"use client";

import type { PatientInput, PatientListItem, StatusInput } from "@ami/contracts";
import { zodResolver } from "@hookform/resolvers/zod";
import type { ColumnDef } from "@tanstack/react-table";
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
import { DetailModal, FormModal } from "../crud/modal";
import { StatusBadge } from "../crud/status-badge";

const schema = z.object({
  firstNames: z.string().trim().min(2, "Escriba al menos 2 caracteres.").max(150),
  lastNames: z.string().trim().min(2, "Escriba al menos 2 caracteres.").max(150),
  birthDate: z.string().min(1, "Seleccione la fecha de nacimiento."),
  gender: z.enum(["", "Femenino", "Masculino", "No especificado", "Otro"]),
  phone: z.string().trim().min(4, "Escriba al menos 4 caracteres.").max(20),
  email: z.string().trim().refine((value) => !value || z.email().safeParse(value).success, "Ingrese un correo válido."),
  bloodType: z.enum(["", "A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"]),
  personalHistory: z.string().trim().max(10_000, "Los antecedentes no pueden superar 10000 caracteres."),
});
type PatientForm = z.infer<typeof schema>;
const DEFAULTS: PatientForm = { firstNames: "", lastNames: "", birthDate: "", gender: "", phone: "", email: "", bloodType: "", personalHistory: "" };

export function PatientsManager({ canWrite }: Readonly<{ canWrite: boolean }>) {
  const list = useResourceList<PatientListItem>({ endpoint: "/patients", defaultSort: "lastName" });
  const [detail, setDetail] = useState<PatientListItem | null>(null);
  const [editing, setEditing] = useState<PatientListItem | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [statusPending, setStatusPending] = useState<number | null>(null);
  const form = useForm<PatientForm>({ resolver: zodResolver(schema), defaultValues: DEFAULTS });

  function openCreate() {
    setEditing(null);
    form.reset(DEFAULTS);
    setFormOpen(true);
  }

  function openEdit(row: PatientListItem) {
    setEditing(row);
    form.reset({
      firstNames: row.firstNames,
      lastNames: row.lastNames,
      birthDate: row.birthDate,
      gender: (row.gender as PatientForm["gender"]) ?? "",
      phone: row.phone,
      email: row.email ?? "",
      bloodType: (row.bloodType as PatientForm["bloodType"]) ?? "",
      personalHistory: row.personalHistory ?? "",
    });
    setFormOpen(true);
  }

  async function closeForm() {
    if (form.formState.isDirty && !(await confirmDiscardChanges())) return;
    setFormOpen(false);
  }

  const save = form.handleSubmit(async (values) => {
    const payload: PatientInput = {
      firstNames: values.firstNames,
      lastNames: values.lastNames,
      birthDate: values.birthDate,
      phone: values.phone,
      ...(values.gender ? { gender: values.gender } : {}),
      ...(values.email ? { email: values.email } : {}),
      ...(values.bloodType ? { bloodType: values.bloodType } : {}),
      ...(values.personalHistory ? { personalHistory: values.personalHistory } : {}),
    };
    try {
      await apiRequest<PatientListItem>(editing ? `/patients/${editing.id}` : "/patients", {
        method: editing ? "PATCH" : "POST",
        body: JSON.stringify(payload),
      });
      setFormOpen(false);
      list.reload();
      void showSuccess(editing ? "Paciente actualizado" : "Paciente registrado", "La ficha quedó guardada correctamente.");
    } catch (reason) {
      const error = applyApiFormErrors(reason, form.setError);
      void showError("No se guardó el paciente", error.message);
    }
  });

  async function setStatus(row: PatientListItem, active: boolean) {
    setStatusPending(row.id);
    try {
      await apiRequest<PatientListItem>(`/patients/${row.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ active } satisfies StatusInput),
      });
      list.reload();
      void showSuccess(active ? "Paciente activado" : "Paciente desactivado", "Su historial clínico permanece intacto.");
    } catch (reason) {
      const error = applyApiFormErrors(reason, form.setError);
      void showError("No se cambió el estado", error.message);
    } finally {
      setStatusPending(null);
    }
  }

  const columns: ColumnDef<PatientListItem>[] = [
    { id: "lastName", accessorFn: (row) => `${row.lastNames} ${row.firstNames}`, header: "Paciente", cell: ({ row }) => <div className="table-module-cell"><strong>{row.original.fullName}</strong><span>{row.original.email || "Sin correo"}</span></div> },
    { id: "phone", accessorKey: "phone", header: "Teléfono", enableSorting: false },
    { id: "birthDate", accessorKey: "birthDate", header: "Nacimiento", cell: ({ row }) => formatDate(row.original.birthDate) },
    { id: "appointments", header: "Citas", enableSorting: false, cell: ({ row }) => row.original.appointmentCount },
    { id: "status", header: "Estado", enableSorting: false, cell: ({ row }) => <StatusBadge active={row.original.active} activeLabel="Activo" inactiveLabel="Inactivo" /> },
    { id: "actions", header: "Acciones", enableSorting: false, cell: ({ row }) => <RecordActions active={row.original.active} canWrite={canWrite} entityLabel={`al paciente ${row.original.fullName}`} onDetail={() => setDetail(row.original)} onEdit={() => openEdit(row.original)} onStatus={(active) => setStatus(row.original, active)} statusPending={statusPending === row.original.id} /> },
  ];

  return <>
    <ResourcePanel canWrite={canWrite} columns={columns} description="Registro central de pacientes y antecedentes personales." emptyTitle="No hay pacientes" emptyDescription="Cambie los filtros o registre al primer paciente." getRowId={(row) => String(row.id)} list={list} onCreate={openCreate} searchPlaceholder="Nombre, teléfono o correo" title="Pacientes" />

    <FormModal open={formOpen} onClose={() => { void closeForm(); }} onSubmit={save} isSubmitting={form.formState.isSubmitting} submitLabel={editing ? "Guardar cambios" : "Registrar paciente"} title={editing ? "Editar paciente" : "Nuevo paciente"} description="Los campos marcados son obligatorios." size="lg">
      <FormSection title="Identificación">
        <div className="crud-form-grid">
          <FormField htmlFor="patient-first-names" label="Nombres" required error={form.formState.errors.firstNames?.message}><input {...form.register("firstNames")} autoComplete="given-name" /></FormField>
          <FormField htmlFor="patient-last-names" label="Apellidos" required error={form.formState.errors.lastNames?.message}><input {...form.register("lastNames")} autoComplete="family-name" /></FormField>
          <FormField htmlFor="patient-birth-date" label="Fecha de nacimiento" required error={form.formState.errors.birthDate?.message}><input {...form.register("birthDate")} type="date" max={new Date().toISOString().slice(0, 10)} /></FormField>
          <FormField htmlFor="patient-gender" label="Género" error={form.formState.errors.gender?.message}><select {...form.register("gender")}><option value="">Sin especificar</option><option>Femenino</option><option>Masculino</option><option>No especificado</option><option>Otro</option></select></FormField>
          <FormField htmlFor="patient-blood" label="Tipo de sangre" error={form.formState.errors.bloodType?.message}><select {...form.register("bloodType")}><option value="">Sin registrar</option>{["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map((value) => <option key={value}>{value}</option>)}</select></FormField>
        </div>
      </FormSection>
      <FormSection title="Contacto y antecedentes">
        <div className="crud-form-grid">
          <FormField htmlFor="patient-phone" label="Teléfono" required error={form.formState.errors.phone?.message}><input {...form.register("phone")} type="tel" autoComplete="tel" /></FormField>
          <FormField htmlFor="patient-email" label="Correo" error={form.formState.errors.email?.message}><input {...form.register("email")} type="email" autoComplete="email" /></FormField>
        </div>
        <FormField htmlFor="patient-history" label="Antecedentes personales" error={form.formState.errors.personalHistory?.message}><textarea {...form.register("personalHistory")} rows={5} /></FormField>
      </FormSection>
    </FormModal>

    <DetailModal open={detail !== null} onClose={() => setDetail(null)} title="Ficha del paciente" footer={<button className="button button-primary" type="button" onClick={() => setDetail(null)}>Cerrar</button>}>
      {detail && <dl className="permission-detail-list">
        <div><dt>Paciente</dt><dd>{detail.fullName}</dd></div><div><dt>Nacimiento</dt><dd>{formatDate(detail.birthDate)}</dd></div><div><dt>Género</dt><dd>{detail.gender || "Sin especificar"}</dd></div><div><dt>Tipo de sangre</dt><dd>{detail.bloodType || "Sin registrar"}</dd></div><div><dt>Teléfono</dt><dd>{detail.phone}</dd></div><div><dt>Correo</dt><dd>{detail.email || "Sin registrar"}</dd></div><div><dt>Antecedentes</dt><dd>{detail.personalHistory || "Sin antecedentes registrados"}</dd></div><div><dt>Citas</dt><dd>{detail.appointmentCount}</dd></div><div><dt>Estado</dt><dd><StatusBadge active={detail.active} activeLabel="Activo" inactiveLabel="Inactivo" /></dd></div>
      </dl>}
    </DetailModal>
  </>;
}
