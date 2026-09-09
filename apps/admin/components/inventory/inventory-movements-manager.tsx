"use client";

import type { InventoryMovementInput, InventoryMovementListItem, InventoryMovementType, InventoryOptions } from "@ami/contracts";
import { zodResolver } from "@hookform/resolvers/zod";
import type { ColumnDef } from "@tanstack/react-table";
import { Eye, LockKeyhole } from "lucide-react";
import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { ApiClientError, apiRequest } from "../../lib/api-client";
import { confirmDiscardChanges, showError, showSuccess } from "../../lib/alerts";
import { applyApiFormErrors } from "../administration/form-api-error";
import { formatDateTimeWithWeekday } from "../administration/formatters";
import { ResourcePanel } from "../administration/resource-panel";
import { useResourceList } from "../administration/use-resource-list";
import { FormField, FormSection } from "../crud/form-field";
import { DetailModal, FormModal } from "../crud/modal";
import { Select2Field } from "../crud/select2-field";
import { StatusBadge } from "../crud/status-badge";

const TYPE_LABELS: Record<InventoryMovementType, string> = { entrada: "Entrada", salida: "Salida", merma: "Merma" };
const STATUS_OPTIONS = [{ value: "all", label: "Todos los movimientos" }, { value: "entrada", label: "Entradas" }, { value: "salida", label: "Salidas" }, { value: "merma", label: "Mermas" }];
const schema = z.object({ itemId: z.number().int().positive("Seleccione un insumo."), type: z.enum(["entrada", "salida", "merma"]), quantity: z.number().positive("La cantidad debe ser mayor que cero."), observations: z.string().trim().max(10_000) });
type FormValues = z.infer<typeof schema>;
const DEFAULTS: FormValues = { itemId: 0, type: "entrada", quantity: 1, observations: "" };

export function InventoryMovementsManager({ canWrite }: Readonly<{ canWrite: boolean }>) {
  const list = useResourceList<InventoryMovementListItem>({ endpoint: "/inventory/movements", defaultSort: "recordedAt", defaultSortDescending: true });
  const [options, setOptions] = useState<InventoryOptions | null>(null);
  const [detail, setDetail] = useState<InventoryMovementListItem | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const form = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: DEFAULTS });
  const selectedItem = options?.items.find((item) => item.id === form.watch("itemId"));
  function loadOptions() { void apiRequest<InventoryOptions>("/inventory/options").then(setOptions).catch((reason: unknown) => { const error = reason instanceof ApiClientError ? reason : null; void showError("No se cargaron las opciones", error?.message ?? "Intente nuevamente."); }); }
  useEffect(loadOptions, []);
  function openCreate() { form.reset(DEFAULTS); setFormOpen(true); }
  async function closeForm() { if (form.formState.isDirty && !(await confirmDiscardChanges())) return; setFormOpen(false); }
  const save = form.handleSubmit(async (values) => {
    const payload: InventoryMovementInput = { itemId: values.itemId, type: values.type, quantity: values.quantity, ...(values.observations ? { observations: values.observations } : {}) };
    try { const created = await apiRequest<InventoryMovementListItem>("/inventory/movements", { method: "POST", body: JSON.stringify(payload) }); setFormOpen(false); setDetail(created); list.reload(); loadOptions(); void showSuccess("Movimiento registrado", `Existencia resultante: ${created.resultingStock ?? "—"} ${created.item.unit}.`); }
    catch (reason) { const error = applyApiFormErrors(reason, form.setError); void showError("No se registró el movimiento", error.message); }
  });
  const columns: ColumnDef<InventoryMovementListItem>[] = [
    { id: "item", accessorFn: (row) => row.item.name, header: "Insumo", cell: ({ row }) => <div className="table-module-cell"><strong>{row.original.item.name}</strong><span>{row.original.item.unit}</span></div> },
    { id: "recordedAt", accessorKey: "recordedAt", header: "Fecha", cell: ({ row }) => formatDateTimeWithWeekday(row.original.recordedAt) },
    { id: "type", header: "Movimiento", enableSorting: false, cell: ({ row }) => <StatusBadge active={row.original.type === "entrada"} activeLabel="Entrada" inactiveLabel={row.original.type === "merma" ? "Merma" : "Salida"} /> },
    { id: "quantity", accessorKey: "quantity", header: "Cantidad", cell: ({ row }) => `${row.original.quantity} ${row.original.item.unit}` },
    { id: "stock", header: "Existencia", enableSorting: false, cell: ({ row }) => <span>{row.original.previousStock ?? "—"} → <strong>{row.original.resultingStock ?? "—"}</strong></span> },
    { id: "user", header: "Registrado por", enableSorting: false, cell: ({ row }) => row.original.user.name },
    { id: "actions", header: "Acciones", enableSorting: false, cell: ({ row }) => <button className="table-action-button" type="button" onClick={() => setDetail(row.original)}><Eye aria-hidden="true" /> Detalle</button> },
  ];
  return <>
    <ResourcePanel canWrite={canWrite} columns={columns} description="Kardex inmutable: cada entrada, salida o merma conserva responsable y saldo." emptyTitle="No hay movimientos" emptyDescription="Cambie los filtros o registre el primer movimiento." getRowId={(row) => String(row.id)} list={list} onCreate={openCreate} searchPlaceholder="Insumo, responsable u observación" statusOptions={STATUS_OPTIONS} title="Movimientos de inventario" />
    <FormModal open={formOpen} onClose={() => { void closeForm(); }} onSubmit={save} isSubmitting={form.formState.isSubmitting} submitLabel="Registrar movimiento" title="Nuevo movimiento" description="Después de guardarse no podrá editarse ni eliminarse.">
      <FormSection title="Existencia"><div className="crud-form-grid"><FormField htmlFor="movement-item" label="Insumo" required error={form.formState.errors.itemId?.message} help={selectedItem ? `Existencia disponible: ${selectedItem.currentStock} ${selectedItem.unit}.` : undefined}><Controller control={form.control} name="itemId" render={({ field }) => <Select2Field id="movement-item" options={options?.items ?? []} placeholder="Buscar insumo" value={field.value} onChange={field.onChange} onBlur={field.onBlur} />} /></FormField><FormField htmlFor="movement-type" label="Tipo" required error={form.formState.errors.type?.message}><select {...form.register("type")}><option value="entrada">Entrada</option><option value="salida">Salida</option><option value="merma">Merma</option></select></FormField><FormField htmlFor="movement-quantity" label="Cantidad" required error={form.formState.errors.quantity?.message}><input type="number" min="0.01" step="0.01" {...form.register("quantity", { valueAsNumber: true })} /></FormField></div><FormField htmlFor="movement-observations" label="Observaciones" error={form.formState.errors.observations?.message}><textarea {...form.register("observations")} rows={3} /></FormField></FormSection>
    </FormModal>
    <DetailModal open={detail !== null} onClose={() => setDetail(null)} title="Detalle de movimiento" footer={<button className="button button-primary" type="button" onClick={() => setDetail(null)}>Cerrar</button>}>{detail && <><p className="immutable-record-notice"><LockKeyhole aria-hidden="true" /> Registro inmutable protegido por la base de datos.</p><dl className="permission-detail-list"><div><dt>Insumo</dt><dd>{detail.item.name}</dd></div><div><dt>Movimiento</dt><dd>{TYPE_LABELS[detail.type]}</dd></div><div><dt>Cantidad</dt><dd>{detail.quantity} {detail.item.unit}</dd></div><div><dt>Existencia anterior</dt><dd>{detail.previousStock ?? "Sin registro"} {detail.item.unit}</dd></div><div><dt>Existencia resultante</dt><dd>{detail.resultingStock ?? "Sin registro"} {detail.item.unit}</dd></div><div><dt>Fecha</dt><dd>{formatDateTimeWithWeekday(detail.recordedAt)}</dd></div><div><dt>Responsable</dt><dd>{detail.user.name} ({detail.user.username})</dd></div><div><dt>Observaciones</dt><dd>{detail.observations || "Sin observaciones"}</dd></div></dl></>}
    </DetailModal>
  </>;
}
