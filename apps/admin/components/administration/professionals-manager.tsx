"use client";

import type {
  AdministrationOptions,
  ProfessionalInput,
  ProfessionalListItem,
  StatusInput,
} from "@ami/contracts";
import { zodResolver } from "@hookform/resolvers/zod";
import type { ColumnDef } from "@tanstack/react-table";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { ApiClientError, apiRequest } from "../../lib/api-client";
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
  dpi: z.string().trim().refine((value) => !value || /^\d{13}$/.test(value), "El DPI debe contener 13 dígitos."),
  licenseNumber: z.string().trim().max(50, "El colegiado no puede superar 50 caracteres."),
  phone: z.string().trim().max(20, "El teléfono no puede superar 20 caracteres."),
  email: z.string().trim().refine((value) => !value || z.email().safeParse(value).success, "Ingrese un correo válido."),
  startDate: z.string().refine((value) => !value || /^\d{4}-\d{2}-\d{2}$/.test(value), "Ingrese una fecha válida."),
  specialtyId: z.number().int().positive("Seleccione una especialidad."),
});
type ProfessionalForm = z.infer<typeof schema>;
const DEFAULTS: ProfessionalForm = {
  name: "",
  dpi: "",
  licenseNumber: "",
  phone: "",
  email: "",
  startDate: "",
  specialtyId: 0,
};

export function ProfessionalsManager({ canWrite }: Readonly<{ canWrite: boolean }>) {
  const [specialtyFilter, setSpecialtyFilter] = useState("");
  const extraQuery = useMemo(
    () => ({ specialtyId: specialtyFilter ? Number(specialtyFilter) : undefined }),
    [specialtyFilter],
  );
  const list = useResourceList<ProfessionalListItem>({
    endpoint: "/administration/professionals",
    defaultSort: "name",
    extraQuery,
  });
  const [options, setOptions] = useState<AdministrationOptions | null>(null);
  const [detail, setDetail] = useState<ProfessionalListItem | null>(null);
  const [editing, setEditing] = useState<ProfessionalListItem | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [statusPending, setStatusPending] = useState<number | null>(null);
  const form = useForm<ProfessionalForm>({ resolver: zodResolver(schema), defaultValues: DEFAULTS });

  useEffect(() => {
    apiRequest<AdministrationOptions>("/administration/options")
      .then(setOptions)
      .catch((reason: unknown) => {
        const error = reason instanceof ApiClientError ? reason : null;
        void showError("No se cargaron las opciones", error?.message ?? "Intente nuevamente.");
      });
  }, []);

  function openCreate() {
    setEditing(null);
    form.reset(DEFAULTS);
    setFormOpen(true);
  }

  function openEdit(row: ProfessionalListItem) {
    setEditing(row);
    form.reset({
      name: row.name,
      dpi: row.dpi ?? "",
      licenseNumber: row.licenseNumber ?? "",
      phone: row.phone ?? "",
      email: row.email ?? "",
      startDate: row.startDate ?? "",
      specialtyId: row.specialty.id,
    });
    setFormOpen(true);
  }

  async function closeForm() {
    if (form.formState.isDirty && !(await confirmDiscardChanges())) return;
    setFormOpen(false);
  }

  const save = form.handleSubmit(async (values) => {
    const payload: ProfessionalInput = {
      name: values.name,
      specialtyId: values.specialtyId,
      ...(values.dpi ? { dpi: values.dpi } : {}),
      ...(values.licenseNumber ? { licenseNumber: values.licenseNumber } : {}),
      ...(values.phone ? { phone: values.phone } : {}),
      ...(values.email ? { email: values.email } : {}),
      ...(values.startDate ? { startDate: values.startDate } : {}),
    };
    try {
      await apiRequest<ProfessionalListItem>(
        editing ? `/administration/professionals/${editing.id}` : "/administration/professionals",
        { method: editing ? "PATCH" : "POST", body: JSON.stringify(payload) },
      );
      setFormOpen(false);
      list.reload();
      void showSuccess(editing ? "Profesional actualizado" : "Profesional creado", "La ficha profesional quedó guardada.");
    } catch (reason) {
      const error = applyApiFormErrors(reason, form.setError);
      void showError("No se guardó el profesional", `${error.message}${error.requestId ? ` Referencia ${error.requestId}.` : ""}`);
    }
  });

  async function setStatus(row: ProfessionalListItem, active: boolean) {
    setStatusPending(row.id);
    try {
      await apiRequest<ProfessionalListItem>(`/administration/professionals/${row.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ active } satisfies StatusInput),
      });
      list.reload();
      void showSuccess(
        active ? "Profesional activado" : "Profesional desactivado",
        active
          ? "La ficha vuelve a estar disponible para la operación clínica."
          : "La cuenta vinculada también se desactivó; los historiales permanecen intactos.",
      );
    } catch (reason) {
      const error = applyApiFormErrors(reason, form.setError);
      void showError("No se cambió el estado", error.message);
    } finally {
      setStatusPending(null);
    }
  }

  const columns: ColumnDef<ProfessionalListItem>[] = [
    {
      id: "name",
      accessorKey: "name",
      header: "Profesional",
      cell: ({ row }) => (
        <div className="table-module-cell">
          <strong>{row.original.name}</strong>
          <span>{row.original.email || "Correo pendiente"}</span>
        </div>
      ),
    },
    {
      id: "specialty",
      accessorFn: (row) => row.specialty.name,
      header: "Especialidad",
    },
    {
      id: "contact",
      header: "Contacto",
      enableSorting: false,
      cell: ({ row }) => row.original.phone || "Pendiente",
    },
    {
      id: "user",
      header: "Cuenta",
      enableSorting: false,
      cell: ({ row }) => <StatusBadge active={row.original.hasUser} activeLabel="Vinculada" inactiveLabel="Sin cuenta" />,
    },
    {
      id: "status",
      header: "Estado",
      enableSorting: false,
      cell: ({ row }) => <StatusBadge active={row.original.active} activeLabel="Activo" inactiveLabel="Inactivo" />,
    },
    {
      id: "actions",
      header: "Acciones",
      enableSorting: false,
      cell: ({ row }) => (
        <RecordActions
          active={row.original.active}
          canWrite={canWrite}
          entityLabel={`al profesional ${row.original.name}`}
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
        description="Directorio del equipo clínico, sus credenciales y especialidad."
        emptyTitle="No hay profesionales"
        emptyDescription="Cambie los filtros o registre el primer profesional."
        extraFilters={(
          <label>
            <span className="sr-only">Filtrar por especialidad</span>
            <select value={specialtyFilter} onChange={(event) => setSpecialtyFilter(event.target.value)}>
              <option value="">Todas las especialidades</option>
              {options?.specialties.map((option) => (
                <option key={option.id} value={option.id}>{option.label}</option>
              ))}
            </select>
          </label>
        )}
        getRowId={(row) => String(row.id)}
        list={list}
        onCreate={openCreate}
        searchPlaceholder="Nombre, correo o colegiado"
        title="Profesionales"
      />

      <FormModal
        open={formOpen}
        onClose={() => { void closeForm(); }}
        onSubmit={save}
        isSubmitting={form.formState.isSubmitting}
        submitLabel={editing ? "Guardar cambios" : "Crear profesional"}
        title={editing ? "Editar profesional" : "Nuevo profesional"}
        description="Los datos privados pueden completarse posteriormente."
        size="lg"
      >
        <FormSection title="Identificación profesional">
          <div className="crud-form-grid">
            <FormField htmlFor="professional-name" label="Nombre completo" required error={form.formState.errors.name?.message}>
              <input {...form.register("name")} autoComplete="name" />
            </FormField>
            <FormField htmlFor="professional-specialty" label="Especialidad" required error={form.formState.errors.specialtyId?.message}>
              <select {...form.register("specialtyId", { valueAsNumber: true })}>
                <option value={0}>Seleccione una especialidad</option>
                {options?.specialties.map((option) => (
                  <option
                    key={option.id}
                    value={option.id}
                    disabled={!option.active && option.id !== editing?.specialty.id}
                  >
                    {option.label}{option.active ? "" : " (inactiva)"}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField htmlFor="professional-dpi" label="DPI" help="13 dígitos, sin espacios." error={form.formState.errors.dpi?.message}>
              <input {...form.register("dpi")} inputMode="numeric" maxLength={13} autoComplete="off" />
            </FormField>
            <FormField htmlFor="professional-license" label="Colegiado o licencia" error={form.formState.errors.licenseNumber?.message}>
              <input {...form.register("licenseNumber")} autoComplete="off" />
            </FormField>
          </div>
        </FormSection>
        <FormSection title="Contacto e incorporación">
          <div className="crud-form-grid">
            <FormField htmlFor="professional-phone" label="Teléfono" error={form.formState.errors.phone?.message}>
              <input {...form.register("phone")} type="tel" autoComplete="tel" />
            </FormField>
            <FormField htmlFor="professional-email" label="Correo" error={form.formState.errors.email?.message}>
              <input {...form.register("email")} type="email" autoComplete="email" />
            </FormField>
            <FormField htmlFor="professional-start-date" label="Fecha de inicio" error={form.formState.errors.startDate?.message}>
              <input {...form.register("startDate")} type="date" />
            </FormField>
          </div>
        </FormSection>
      </FormModal>

      <DetailModal
        open={detail !== null}
        onClose={() => setDetail(null)}
        title="Ficha del profesional"
        footer={<button className="button button-primary" type="button" onClick={() => setDetail(null)}>Cerrar</button>}
      >
        {detail && (
          <dl className="permission-detail-list">
            <div><dt>Nombre</dt><dd>{detail.name}</dd></div>
            <div><dt>Especialidad</dt><dd>{detail.specialty.name}</dd></div>
            <div><dt>DPI</dt><dd>{detail.dpi || "Pendiente"}</dd></div>
            <div><dt>Colegiado</dt><dd>{detail.licenseNumber || "Pendiente"}</dd></div>
            <div><dt>Teléfono</dt><dd>{detail.phone || "Pendiente"}</dd></div>
            <div><dt>Correo</dt><dd>{detail.email || "Pendiente"}</dd></div>
            <div><dt>Fecha de inicio</dt><dd>{formatDate(detail.startDate)}</dd></div>
            <div><dt>Cuenta ERP</dt><dd>{detail.hasUser ? "Vinculada" : "Sin vincular"}</dd></div>
            <div><dt>Estado</dt><dd><StatusBadge active={detail.active} activeLabel="Activo" inactiveLabel="Inactivo" /></dd></div>
          </dl>
        )}
      </DetailModal>
    </>
  );
}
