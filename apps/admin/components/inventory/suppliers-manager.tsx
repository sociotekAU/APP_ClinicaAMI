"use client";

import type { StatusInput, SupplierInput, SupplierListItem } from "@ami/contracts";
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

const schema = z.object({ companyName: z.string().trim().min(2, "Ingrese la empresa.").max(150), contact: z.string().trim().max(150), phone: z.string().trim().min(4, "Ingrese un teléfono.").max(20), email: z.union([z.literal(""), z.string().email("Ingrese un correo válido.").max(150)]), address: z.string().trim().max(10_000) });
type FormValues = z.infer<typeof schema>;
const DEFAULTS: FormValues = { companyName: "", contact: "", phone: "", email: "", address: "" };

export function SuppliersManager({ canWrite }: Readonly<{ canWrite: boolean }>) {
  const list = useResourceList<SupplierListItem>({ endpoint: "/inventory/suppliers", defaultSort: "companyName" });
  const [detail, setDetail] = useState<SupplierListItem | null>(null);
  const [editing, setEditing] = useState<SupplierListItem | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [statusPending, setStatusPending] = useState<number | null>(null);
  const form = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: DEFAULTS });
  function openCreate() { setEditing(null); form.reset(DEFAULTS); setFormOpen(true); }
  function openEdit(row: SupplierListItem) { setEditing(row); form.reset({ companyName: row.companyName, contact: row.contact ?? "", phone: row.phone, email: row.email ?? "", address: row.address ?? "" }); setFormOpen(true); }
  async function closeForm() { if (form.formState.isDirty && !(await confirmDiscardChanges())) return; setFormOpen(false); }
  const save = form.handleSubmit(async (values) => {
    const payload: SupplierInput = { companyName: values.companyName, phone: values.phone, ...(values.contact ? { contact: values.contact } : {}), ...(values.email ? { email: values.email } : {}), ...(values.address ? { address: values.address } : {}) };
    try { await apiRequest<SupplierListItem>(editing ? `/inventory/suppliers/${editing.id}` : "/inventory/suppliers", { method: editing ? "PATCH" : "POST", body: JSON.stringify(payload) }); setFormOpen(false); list.reload(); void showSuccess(editing ? "Proveedor actualizado" : "Proveedor creado", "El catálogo de abastecimiento quedó actualizado."); }
    catch (reason) { const error = applyApiFormErrors(reason, form.setError); void showError("No se guardó el proveedor", error.message); }
  });
  async function setStatus(row: SupplierListItem, active: boolean) {
    setStatusPending(row.id);
    try { await apiRequest<SupplierListItem>(`/inventory/suppliers/${row.id}/status`, { method: "PATCH", body: JSON.stringify({ active } satisfies StatusInput) }); list.reload(); void showSuccess(active ? "Proveedor activado" : "Proveedor desactivado", "Los insumos y movimientos históricos permanecen disponibles."); }
    catch (reason) { const error = applyApiFormErrors(reason, form.setError); void showError("No se cambió el estado", error.message); }
    finally { setStatusPending(null); }
  }
  const columns: ColumnDef<SupplierListItem>[] = [
    { id: "companyName", accessorKey: "companyName", header: "Proveedor", cell: ({ row }) => <div className="table-module-cell"><strong>{row.original.companyName}</strong><span>{row.original.contact || "Sin contacto asignado"}</span></div> },
    { id: "phone", accessorKey: "phone", header: "Teléfono", enableSorting: false },
    { id: "email", accessorKey: "email", header: "Correo", enableSorting: false, cell: ({ row }) => row.original.email || "Sin correo" },
    { id: "items", header: "Insumos", enableSorting: false, cell: ({ row }) => row.original.itemCount },
    { id: "status", header: "Estado", enableSorting: false, cell: ({ row }) => <StatusBadge active={row.original.active} activeLabel="Activo" inactiveLabel="Inactivo" /> },
    { id: "actions", header: "Acciones", enableSorting: false, cell: ({ row }) => <RecordActions active={row.original.active} canWrite={canWrite} entityLabel={`el proveedor ${row.original.companyName}`} onDetail={() => setDetail(row.original)} onEdit={() => openEdit(row.original)} onStatus={(active) => setStatus(row.original, active)} statusPending={statusPending === row.original.id} /> },
  ];
  return <>
    <ResourcePanel canWrite={canWrite} columns={columns} description="Empresas que abastecen farmacia, laboratorio y material clínico." emptyTitle="No hay proveedores" emptyDescription="Cambie los filtros o cree el primer proveedor." getRowId={(row) => String(row.id)} list={list} onCreate={openCreate} searchPlaceholder="Empresa, contacto, teléfono o correo" title="Proveedores" />
    <FormModal open={formOpen} onClose={() => { void closeForm(); }} onSubmit={save} isSubmitting={form.formState.isSubmitting} submitLabel={editing ? "Guardar cambios" : "Crear proveedor"} title={editing ? "Editar proveedor" : "Nuevo proveedor"} description="Los campos de contacto facilitan la reposición de existencias.">
      <FormSection title="Identificación"><div className="crud-form-grid"><FormField htmlFor="supplier-company" label="Empresa" required error={form.formState.errors.companyName?.message}><input {...form.register("companyName")} /></FormField><FormField htmlFor="supplier-contact" label="Contacto" error={form.formState.errors.contact?.message}><input {...form.register("contact")} /></FormField><FormField htmlFor="supplier-phone" label="Teléfono" required error={form.formState.errors.phone?.message}><input {...form.register("phone")} /></FormField><FormField htmlFor="supplier-email" label="Correo" error={form.formState.errors.email?.message}><input type="email" {...form.register("email")} /></FormField></div><FormField htmlFor="supplier-address" label="Dirección" error={form.formState.errors.address?.message}><textarea {...form.register("address")} rows={3} /></FormField></FormSection>
    </FormModal>
    <DetailModal open={detail !== null} onClose={() => setDetail(null)} title="Detalle de proveedor" footer={<button className="button button-primary" type="button" onClick={() => setDetail(null)}>Cerrar</button>}>{detail && <dl className="permission-detail-list"><div><dt>Empresa</dt><dd>{detail.companyName}</dd></div><div><dt>Contacto</dt><dd>{detail.contact || "Sin registro"}</dd></div><div><dt>Teléfono</dt><dd>{detail.phone}</dd></div><div><dt>Correo</dt><dd>{detail.email || "Sin registro"}</dd></div><div><dt>Dirección</dt><dd>{detail.address || "Sin registro"}</dd></div><div><dt>Insumos vinculados</dt><dd>{detail.itemCount}</dd></div><div><dt>Fecha de alta</dt><dd>{formatDate(detail.createdAt)}</dd></div><div><dt>Estado</dt><dd><StatusBadge active={detail.active} activeLabel="Activo" inactiveLabel="Inactivo" /></dd></div></dl>}</DetailModal>
  </>;
}
