"use client";

import type { InventoryItemInput, InventoryItemListItem, InventoryItemType, InventoryOptions, StatusInput } from "@ami/contracts";
import { zodResolver } from "@hookform/resolvers/zod";
import type { ColumnDef } from "@tanstack/react-table";
import { AlertTriangle } from "lucide-react";
import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { ApiClientError, apiRequest } from "../../lib/api-client";
import { confirmDiscardChanges, showError, showSuccess } from "../../lib/alerts";
import { applyApiFormErrors } from "../administration/form-api-error";
import { formatCurrency, formatDate } from "../administration/formatters";
import { RecordActions } from "../administration/record-actions";
import { ResourcePanel } from "../administration/resource-panel";
import { useResourceList } from "../administration/use-resource-list";
import { FormField, FormSection } from "../crud/form-field";
import { DetailModal, FormModal } from "../crud/modal";
import { Select2Field } from "../crud/select2-field";
import { StatusBadge } from "../crud/status-badge";

const TYPE_LABELS: Record<InventoryItemType, string> = { medicamento: "Medicamento", reactivo_laboratorio: "Reactivo de laboratorio", material_clinico: "Material clínico" };
const STATUS_OPTIONS = [{ value: "all", label: "Todos los estados" }, { value: "active", label: "Activos" }, { value: "inactive", label: "Inactivos" }, { value: "low", label: "Existencia baja" }];
const schema = z.object({ name: z.string().trim().min(2, "Ingrese el nombre.").max(150), type: z.enum(["medicamento", "reactivo_laboratorio", "material_clinico"]), supplierId: z.number().int().nonnegative(), medicationId: z.number().int().nonnegative(), minimumStock: z.number().min(0, "El mínimo no puede ser negativo."), costPrice: z.number().min(0, "El costo no puede ser negativo."), unit: z.string().trim().min(1, "Ingrese la unidad.").max(30) }).superRefine((value, context) => { if (value.type === "medicamento" && value.medicationId < 1) context.addIssue({ code: z.ZodIssueCode.custom, path: ["medicationId"], message: "Vincule un medicamento." }); });
type FormValues = z.infer<typeof schema>;
const DEFAULTS: FormValues = { name: "", type: "material_clinico", supplierId: 0, medicationId: 0, minimumStock: 0, costPrice: 0, unit: "unidad" };

export function InventoryItemsManager({ canWrite }: Readonly<{ canWrite: boolean }>) {
  const list = useResourceList<InventoryItemListItem>({ endpoint: "/inventory/items", defaultSort: "name" });
  const [options, setOptions] = useState<InventoryOptions | null>(null);
  const [detail, setDetail] = useState<InventoryItemListItem | null>(null);
  const [editing, setEditing] = useState<InventoryItemListItem | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [statusPending, setStatusPending] = useState<number | null>(null);
  const form = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: DEFAULTS });
  const selectedType = form.watch("type");
  useEffect(() => { apiRequest<InventoryOptions>("/inventory/options").then(setOptions).catch((reason: unknown) => { const error = reason instanceof ApiClientError ? reason : null; void showError("No se cargaron las opciones", error?.message ?? "Intente nuevamente."); }); }, []);
  function reloadOptions() { void apiRequest<InventoryOptions>("/inventory/options").then(setOptions); }
  function openCreate() { setEditing(null); form.reset(DEFAULTS); setFormOpen(true); }
  function openEdit(row: InventoryItemListItem) { setEditing(row); form.reset({ name: row.name, type: row.type, supplierId: row.supplier?.id ?? 0, medicationId: row.medication?.id ?? 0, minimumStock: row.minimumStock, costPrice: row.costPrice, unit: row.unit }); setFormOpen(true); }
  async function closeForm() { if (form.formState.isDirty && !(await confirmDiscardChanges())) return; setFormOpen(false); }
  const save = form.handleSubmit(async (values) => {
    const payload: InventoryItemInput = { name: values.name, type: values.type, supplierId: values.supplierId || null, medicationId: values.type === "medicamento" ? values.medicationId : null, minimumStock: values.minimumStock, costPrice: values.costPrice, unit: values.unit };
    try { await apiRequest<InventoryItemListItem>(editing ? `/inventory/items/${editing.id}` : "/inventory/items", { method: editing ? "PATCH" : "POST", body: JSON.stringify(payload) }); setFormOpen(false); list.reload(); reloadOptions(); void showSuccess(editing ? "Insumo actualizado" : "Insumo creado", "La existencia solo cambia mediante movimientos de inventario."); }
    catch (reason) { const error = applyApiFormErrors(reason, form.setError); void showError("No se guardó el insumo", error.message); }
  });
  async function setStatus(row: InventoryItemListItem, active: boolean) {
    setStatusPending(row.id);
    try { await apiRequest<InventoryItemListItem>(`/inventory/items/${row.id}/status`, { method: "PATCH", body: JSON.stringify({ active } satisfies StatusInput) }); list.reload(); reloadOptions(); void showSuccess(active ? "Insumo activado" : "Insumo desactivado", "El kardex histórico no fue modificado."); }
    catch (reason) { const error = applyApiFormErrors(reason, form.setError); void showError("No se cambió el estado", error.message); }
    finally { setStatusPending(null); }
  }
  const columns: ColumnDef<InventoryItemListItem>[] = [
    { id: "name", accessorKey: "name", header: "Insumo", cell: ({ row }) => <div className="table-module-cell"><strong>{row.original.name}</strong><span>{TYPE_LABELS[row.original.type]}</span></div> },
    { id: "stock", accessorKey: "currentStock", header: "Existencia", cell: ({ row }) => <div className={`stock-level${row.original.lowStock ? " is-low" : ""}`}><strong>{row.original.currentStock} {row.original.unit}</strong>{row.original.lowStock && <span><AlertTriangle aria-hidden="true" /> Bajo mínimo ({row.original.minimumStock})</span>}</div> },
    { id: "supplier", header: "Proveedor", enableSorting: false, cell: ({ row }) => row.original.supplier?.name ?? "Sin proveedor" },
    { id: "cost", header: "Costo", enableSorting: false, cell: ({ row }) => formatCurrency(row.original.costPrice) },
    { id: "status", header: "Estado", enableSorting: false, cell: ({ row }) => <StatusBadge active={row.original.active} activeLabel="Activo" inactiveLabel="Inactivo" /> },
    { id: "actions", header: "Acciones", enableSorting: false, cell: ({ row }) => <RecordActions active={row.original.active} canWrite={canWrite} entityLabel={`el insumo ${row.original.name}`} onDetail={() => setDetail(row.original)} onEdit={() => openEdit(row.original)} onStatus={(active) => setStatus(row.original, active)} statusPending={statusPending === row.original.id} /> },
  ];
  return <>
    <ResourcePanel canWrite={canWrite} columns={columns} description="Existencias actuales, costo y alerta automática de mínimo." emptyTitle="No hay insumos" emptyDescription="Cambie los filtros o cree el primer insumo." getRowId={(row) => String(row.id)} list={list} onCreate={openCreate} searchPlaceholder="Nombre, tipo, proveedor o medicamento" statusOptions={STATUS_OPTIONS} title="Insumos de inventario" />
    <FormModal open={formOpen} onClose={() => { void closeForm(); }} onSubmit={save} isSubmitting={form.formState.isSubmitting} submitLabel={editing ? "Guardar cambios" : "Crear insumo"} title={editing ? "Editar insumo" : "Nuevo insumo"} description="Registre después una entrada para establecer o aumentar la existencia.">
      <FormSection title="Clasificación"><div className="crud-form-grid"><FormField htmlFor="item-name" label="Nombre" required error={form.formState.errors.name?.message}><input {...form.register("name")} /></FormField><FormField htmlFor="item-type" label="Tipo" required error={form.formState.errors.type?.message}><select {...form.register("type")} onChange={(event) => { form.setValue("type", event.target.value as InventoryItemType, { shouldDirty: true }); if (event.target.value !== "medicamento") form.setValue("medicationId", 0, { shouldDirty: true }); }}><option value="material_clinico">Material clínico</option><option value="reactivo_laboratorio">Reactivo de laboratorio</option><option value="medicamento">Medicamento</option></select></FormField><FormField htmlFor="item-supplier" label="Proveedor" error={form.formState.errors.supplierId?.message}><Controller control={form.control} name="supplierId" render={({ field }) => <Select2Field id="item-supplier" options={options?.suppliers ?? []} placeholder="Sin proveedor" value={field.value} onChange={field.onChange} onBlur={field.onBlur} />} /></FormField>{selectedType === "medicamento" && <FormField htmlFor="item-medication" label="Medicamento vinculado" required error={form.formState.errors.medicationId?.message}><Controller control={form.control} name="medicationId" render={({ field }) => <Select2Field id="item-medication" options={options?.medications ?? []} placeholder="Buscar medicamento" value={field.value} onChange={field.onChange} onBlur={field.onBlur} />} /></FormField>}</div></FormSection>
      <FormSection title="Control de existencia"><div className="crud-form-grid"><FormField htmlFor="item-minimum" label="Existencia mínima" required error={form.formState.errors.minimumStock?.message}><input type="number" min="0" step="0.01" {...form.register("minimumStock", { valueAsNumber: true })} /></FormField><FormField htmlFor="item-cost" label="Costo unitario" required error={form.formState.errors.costPrice?.message}><input type="number" min="0" step="0.01" {...form.register("costPrice", { valueAsNumber: true })} /></FormField><FormField htmlFor="item-unit" label="Unidad de medida" required error={form.formState.errors.unit?.message}><input {...form.register("unit")} placeholder="unidad, caja, ml" /></FormField></div></FormSection>
    </FormModal>
    <DetailModal open={detail !== null} onClose={() => setDetail(null)} title="Detalle de insumo" footer={<button className="button button-primary" type="button" onClick={() => setDetail(null)}>Cerrar</button>}>{detail && <dl className="permission-detail-list"><div><dt>Nombre</dt><dd>{detail.name}</dd></div><div><dt>Tipo</dt><dd>{TYPE_LABELS[detail.type]}</dd></div><div><dt>Existencia actual</dt><dd>{detail.currentStock} {detail.unit}</dd></div><div><dt>Existencia mínima</dt><dd>{detail.minimumStock} {detail.unit}</dd></div><div><dt>Alerta</dt><dd>{detail.lowStock ? "Existencia baja" : "Existencia suficiente"}</dd></div><div><dt>Costo unitario</dt><dd>{formatCurrency(detail.costPrice)}</dd></div><div><dt>Proveedor</dt><dd>{detail.supplier?.name ?? "Sin proveedor"}</dd></div><div><dt>Medicamento vinculado</dt><dd>{detail.medication?.name ?? "No aplica"}</dd></div><div><dt>Movimientos</dt><dd>{detail.movementCount}</dd></div><div><dt>Fecha de alta</dt><dd>{formatDate(detail.createdAt)}</dd></div><div><dt>Estado</dt><dd><StatusBadge active={detail.active} activeLabel="Activo" inactiveLabel="Inactivo" /></dd></div></dl>}</DetailModal>
  </>;
}
