"use client";

import type { SpecialtyInput, SpecialtyListItem, StatusInput } from "@ami/contracts";
import { zodResolver } from "@hookform/resolvers/zod";
import type { ColumnDef } from "@tanstack/react-table";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { apiRequest } from "../../lib/api-client";
import { confirmDiscardChanges, showError, showSuccess } from "../../lib/alerts";
import { DetailModal, FormModal } from "../crud/modal";
import { FormField, FormSection } from "../crud/form-field";
import { StatusBadge } from "../crud/status-badge";
import { applyApiFormErrors } from "./form-api-error";
import { formatDate } from "./formatters";
import { RecordActions } from "./record-actions";
import { ResourcePanel } from "./resource-panel";
import { useResourceList } from "./use-resource-list";

const schema = z.object({
  name: z.string().trim().min(2, "Escriba al menos 2 caracteres.").max(150),
  description: z.string().trim().max(2000, "La descripción no puede superar 2000 caracteres."),
});
type SpecialtyForm = z.infer<typeof schema>;
const DEFAULTS: SpecialtyForm = { name: "", description: "" };

export function SpecialtiesManager({ canWrite }: Readonly<{ canWrite: boolean }>) {
  const list = useResourceList<SpecialtyListItem>({
    endpoint: "/administration/specialties",
    defaultSort: "name",
  });
  const [detail, setDetail] = useState<SpecialtyListItem | null>(null);
  const [editing, setEditing] = useState<SpecialtyListItem | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [statusPending, setStatusPending] = useState<number | null>(null);
  const form = useForm<SpecialtyForm>({ resolver: zodResolver(schema), defaultValues: DEFAULTS });

  function openCreate() {
    setEditing(null);
    form.reset(DEFAULTS);
    setFormOpen(true);
  }

  function openEdit(row: SpecialtyListItem) {
    setEditing(row);
    form.reset({ name: row.name, description: row.description ?? "" });
    setFormOpen(true);
  }

  async function closeForm() {
    if (form.formState.isDirty && !(await confirmDiscardChanges())) return;
    setFormOpen(false);
  }

  const save = form.handleSubmit(async (values) => {
    const payload: SpecialtyInput = {
      name: values.name,
      ...(values.description ? { description: values.description } : {}),
    };
    try {
      await apiRequest<SpecialtyListItem>(
        editing ? `/administration/specialties/${editing.id}` : "/administration/specialties",
        { method: editing ? "PATCH" : "POST", body: JSON.stringify(payload) },
      );
      setFormOpen(false);
      list.reload();
      void showSuccess(
        editing ? "Especialidad actualizada" : "Especialidad creada",
        "Los cambios quedaron guardados correctamente.",
      );
    } catch (reason) {
      const error = applyApiFormErrors(reason, form.setError);
      void showError("No se guardó la especialidad", `${error.message}${error.requestId ? ` Referencia ${error.requestId}.` : ""}`);
    }
  });

  async function setStatus(row: SpecialtyListItem, active: boolean) {
    setStatusPending(row.id);
    try {
      await apiRequest<SpecialtyListItem>(`/administration/specialties/${row.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ active } satisfies StatusInput),
      });
      list.reload();
      void showSuccess(
        active ? "Especialidad activada" : "Especialidad desactivada",
        active
          ? "La especialidad vuelve a estar disponible."
          : "Sus profesionales se desactivaron automáticamente y el historial se conservó.",
      );
    } catch (reason) {
      const error = applyApiFormErrors(reason, form.setError);
      void showError("No se cambió el estado", error.message);
    } finally {
      setStatusPending(null);
    }
  }

  const columns: ColumnDef<SpecialtyListItem>[] = [
    {
      id: "name",
      accessorKey: "name",
      header: "Especialidad",
      cell: ({ row }) => <strong className="table-primary-text">{row.original.name}</strong>,
    },
    {
      id: "professionals",
      header: "Profesionales",
      enableSorting: false,
      cell: ({ row }) => row.original.professionalCount,
    },
    {
      id: "status",
      header: "Estado",
      enableSorting: false,
      cell: ({ row }) => <StatusBadge active={row.original.active} activeLabel="Activa" inactiveLabel="Inactiva" />,
    },
    {
      id: "createdAt",
      accessorKey: "createdAt",
      header: "Creación",
      cell: ({ row }) => formatDate(row.original.createdAt),
    },
    {
      id: "actions",
      header: "Acciones",
      enableSorting: false,
      cell: ({ row }) => (
        <RecordActions
          active={row.original.active}
          canWrite={canWrite}
          entityLabel={`la especialidad ${row.original.name}`}
          onDetail={() => setDetail(row.original)}
          onEdit={() => openEdit(row.original)}
          onStatus={(active) => setStatus(row.original, active)}
          statusPending={statusPending === row.original.id}
        />
      ),
    },
  ];

  return (
    <>
      <ResourcePanel
        canWrite={canWrite}
        columns={columns}
        description="Catálogo base para clasificar al equipo clínico."
        emptyTitle="No hay especialidades"
        emptyDescription="Cambie los filtros o cree la primera especialidad."
        getRowId={(row) => String(row.id)}
        list={list}
        onCreate={openCreate}
        searchPlaceholder="Buscar por nombre"
        title="Especialidades"
      />

      <FormModal
        open={formOpen}
        onClose={() => { void closeForm(); }}
        onSubmit={save}
        isSubmitting={form.formState.isSubmitting}
        submitLabel={editing ? "Guardar cambios" : "Crear especialidad"}
        title={editing ? "Editar especialidad" : "Nueva especialidad"}
        description="Los nombres no pueden repetirse, incluso con mayúsculas diferentes."
      >
        <FormSection title="Información general">
          <FormField htmlFor="specialty-name" label="Nombre" required error={form.formState.errors.name?.message}>
            <input {...form.register("name")} autoComplete="off" />
          </FormField>
          <FormField htmlFor="specialty-description" label="Descripción" error={form.formState.errors.description?.message}>
            <textarea {...form.register("description")} rows={4} />
          </FormField>
        </FormSection>
      </FormModal>

      <DetailModal
        open={detail !== null}
        onClose={() => setDetail(null)}
        title="Detalle de especialidad"
        footer={<button className="button button-primary" type="button" onClick={() => setDetail(null)}>Cerrar</button>}
      >
        {detail && (
          <dl className="permission-detail-list">
            <div><dt>Nombre</dt><dd>{detail.name}</dd></div>
            <div><dt>Descripción</dt><dd>{detail.description || "Sin descripción"}</dd></div>
            <div><dt>Profesionales</dt><dd>{detail.professionalCount}</dd></div>
            <div><dt>Estado</dt><dd><StatusBadge active={detail.active} activeLabel="Activa" inactiveLabel="Inactiva" /></dd></div>
            <div><dt>Creación</dt><dd>{formatDate(detail.createdAt)}</dd></div>
          </dl>
        )}
      </DetailModal>
    </>
  );
}
