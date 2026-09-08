"use client";

import type { ServiceInput, ServiceListItem, StatusInput } from "@ami/contracts";
import { zodResolver } from "@hookform/resolvers/zod";
import type { ColumnDef } from "@tanstack/react-table";
import { ImageIcon } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { apiRequest } from "../../lib/api-client";
import { confirmDiscardChanges, showError, showSuccess } from "../../lib/alerts";
import { DetailModal, FormModal, MediaPreviewModal } from "../crud/modal";
import { FormField, FormSection } from "../crud/form-field";
import { StatusBadge } from "../crud/status-badge";
import { applyApiFormErrors } from "./form-api-error";
import { formatCurrency, formatDate } from "./formatters";
import { RecordActions } from "./record-actions";
import { ResourcePanel } from "./resource-panel";
import { useResourceList } from "./use-resource-list";

const mediaUrl = /^(\/[^\s]*|https?:\/\/[^\s]+)$/i;
const schema = z.object({
  name: z.string().trim().min(2, "Escriba al menos 2 caracteres.").max(150),
  description: z.string().trim().max(2000, "La descripción no puede superar 2000 caracteres."),
  price: z.number({ message: "Ingrese un precio válido." }).min(0, "El precio no puede ser negativo.").max(99_999_999.99),
  imageUrl: z.string().trim().max(255).refine((value) => !value || mediaUrl.test(value), "Use una ruta local o una dirección http/https."),
});
type ServiceForm = z.infer<typeof schema>;
const DEFAULTS: ServiceForm = { name: "", description: "", price: 0, imageUrl: "" };

export function ServicesManager({ canWrite }: Readonly<{ canWrite: boolean }>) {
  const list = useResourceList<ServiceListItem>({
    endpoint: "/administration/services",
    defaultSort: "name",
  });
  const [detail, setDetail] = useState<ServiceListItem | null>(null);
  const [preview, setPreview] = useState<ServiceListItem | null>(null);
  const [editing, setEditing] = useState<ServiceListItem | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [statusPending, setStatusPending] = useState<number | null>(null);
  const form = useForm<ServiceForm>({ resolver: zodResolver(schema), defaultValues: DEFAULTS });

  function openCreate() {
    setEditing(null);
    form.reset(DEFAULTS);
    setFormOpen(true);
  }

  function openEdit(row: ServiceListItem) {
    setEditing(row);
    form.reset({
      name: row.name,
      description: row.description ?? "",
      price: row.price,
      imageUrl: row.imageUrl ?? "",
    });
    setFormOpen(true);
  }

  async function closeForm() {
    if (form.formState.isDirty && !(await confirmDiscardChanges())) return;
    setFormOpen(false);
  }

  const save = form.handleSubmit(async (values) => {
    const payload: ServiceInput = {
      name: values.name,
      price: values.price,
      ...(values.description ? { description: values.description } : {}),
      ...(values.imageUrl ? { imageUrl: values.imageUrl } : {}),
    };
    try {
      await apiRequest<ServiceListItem>(
        editing ? `/administration/services/${editing.id}` : "/administration/services",
        { method: editing ? "PATCH" : "POST", body: JSON.stringify(payload) },
      );
      setFormOpen(false);
      list.reload();
      void showSuccess(editing ? "Servicio actualizado" : "Servicio creado", "La información comercial quedó guardada.");
    } catch (reason) {
      const error = applyApiFormErrors(reason, form.setError);
      void showError("No se guardó el servicio", `${error.message}${error.requestId ? ` Referencia ${error.requestId}.` : ""}`);
    }
  });

  async function setStatus(row: ServiceListItem, active: boolean) {
    setStatusPending(row.id);
    try {
      await apiRequest<ServiceListItem>(`/administration/services/${row.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ active } satisfies StatusInput),
      });
      list.reload();
      void showSuccess(active ? "Servicio activado" : "Servicio desactivado", "El historial del servicio permanece disponible.");
    } catch (reason) {
      const error = applyApiFormErrors(reason, form.setError);
      void showError("No se cambió el estado", error.message);
    } finally {
      setStatusPending(null);
    }
  }

  const columns: ColumnDef<ServiceListItem>[] = [
    {
      id: "name",
      accessorKey: "name",
      header: "Servicio",
      cell: ({ row }) => <strong className="table-primary-text">{row.original.name}</strong>,
    },
    {
      id: "price",
      accessorKey: "price",
      header: "Precio",
      cell: ({ row }) => formatCurrency(row.original.price),
    },
    {
      id: "image",
      header: "Imagen",
      enableSorting: false,
      cell: ({ row }) => row.original.imageUrl ? (
        <button className="table-action-button" type="button" onClick={() => setPreview(row.original)}>
          <ImageIcon aria-hidden="true" /> Ver imagen
        </button>
      ) : <span className="table-muted">Sin imagen</span>,
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
          entityLabel={`el servicio ${row.original.name}`}
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
        description="Servicios clínicos disponibles para atención, consentimientos y facturación."
        emptyTitle="No hay servicios"
        emptyDescription="Cambie los filtros o registre el primer servicio."
        getRowId={(row) => String(row.id)}
        list={list}
        onCreate={openCreate}
        searchPlaceholder="Buscar nombre o descripción"
        title="Servicios"
      />

      <FormModal
        open={formOpen}
        onClose={() => { void closeForm(); }}
        onSubmit={save}
        isSubmitting={form.formState.isSubmitting}
        submitLabel={editing ? "Guardar cambios" : "Crear servicio"}
        title={editing ? "Editar servicio" : "Nuevo servicio"}
        description="El precio puede permanecer en Q0.00 cuando se define posteriormente."
      >
        <FormSection title="Información del servicio">
          <div className="crud-form-grid">
            <FormField htmlFor="service-name" label="Nombre" required error={form.formState.errors.name?.message}>
              <input {...form.register("name")} autoComplete="off" />
            </FormField>
            <FormField htmlFor="service-price" label="Precio (GTQ)" required error={form.formState.errors.price?.message}>
              <input {...form.register("price", { valueAsNumber: true })} type="number" min="0" step="0.01" />
            </FormField>
          </div>
          <FormField htmlFor="service-description" label="Descripción" error={form.formState.errors.description?.message}>
            <textarea {...form.register("description")} rows={4} />
          </FormField>
          <FormField htmlFor="service-image" label="URL de imagen" help="Puede usar una ruta local que empiece con / o una dirección http/https." error={form.formState.errors.imageUrl?.message}>
            <input {...form.register("imageUrl")} type="url" placeholder="/servicios/imagen.jpg" />
          </FormField>
        </FormSection>
      </FormModal>

      <DetailModal
        open={detail !== null}
        onClose={() => setDetail(null)}
        title="Detalle del servicio"
        footer={<button className="button button-primary" type="button" onClick={() => setDetail(null)}>Cerrar</button>}
      >
        {detail && (
          <dl className="permission-detail-list">
            <div><dt>Nombre</dt><dd>{detail.name}</dd></div>
            <div><dt>Descripción</dt><dd>{detail.description || "Sin descripción"}</dd></div>
            <div><dt>Precio</dt><dd>{formatCurrency(detail.price)}</dd></div>
            <div><dt>Imagen</dt><dd>{detail.imageUrl || "Sin imagen"}</dd></div>
            <div><dt>Estado</dt><dd><StatusBadge active={detail.active} activeLabel="Activo" inactiveLabel="Inactivo" /></dd></div>
            <div><dt>Creación</dt><dd>{formatDate(detail.createdAt)}</dd></div>
          </dl>
        )}
      </DetailModal>

      {preview?.imageUrl && (
        <MediaPreviewModal
          open
          onClose={() => setPreview(null)}
          title={preview.name}
          kind="image"
          url={preview.imageUrl}
          alt={`Imagen de ${preview.name}`}
        />
      )}
    </>
  );
}
