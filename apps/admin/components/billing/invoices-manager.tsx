"use client";

import type { BillingOptions, InvoiceDetail, InvoiceInput, InvoiceListItem, InvoicePaymentMethod } from "@ami/contracts";
import { zodResolver } from "@hookform/resolvers/zod";
import type { ColumnDef } from "@tanstack/react-table";
import { Eye, Plus, Printer, Trash2, XCircle } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Controller, useFieldArray, useForm } from "react-hook-form";
import { z } from "zod";
import { ApiClientError, apiRequest } from "../../lib/api-client";
import { confirmDiscardChanges, requestInvoiceAnnulmentReason, showError, showSuccess } from "../../lib/alerts";
import { openPrintDocument } from "../../lib/print-document";
import { applyApiFormErrors } from "../administration/form-api-error";
import { formatCurrency, formatDateTime, formatDateTimeWithWeekday, formatWeekdayName } from "../administration/formatters";
import { ResourcePanel } from "../administration/resource-panel";
import { useResourceList } from "../administration/use-resource-list";
import { FormField, FormSection } from "../crud/form-field";
import { DetailModal, FormModal } from "../crud/modal";
import { Select2Field } from "../crud/select2-field";
import { StatusBadge } from "../crud/status-badge";

const STATUS_OPTIONS = [{ value: "all", label: "Todos los estados" }, { value: "pagada", label: "Pagadas" }, { value: "anulada", label: "Anuladas" }];
const PAYMENT_LABELS: Record<InvoicePaymentMethod, string> = { efectivo: "Efectivo", tarjeta: "Tarjeta", transferencia: "Transferencia" };
const lineSchema = z.object({ concept: z.string().trim().min(2, "Ingrese un concepto." ).max(255), quantity: z.number().positive("La cantidad debe ser mayor que cero."), unitPrice: z.number().min(0, "El precio no puede ser negativo.") });
const schema = z.object({ patientId: z.number().int().positive("Seleccione un paciente."), paymentMethod: z.enum(["efectivo", "tarjeta", "transferencia"]), observations: z.string().trim().max(10_000), lines: z.array(lineSchema).min(1, "Agregue al menos un concepto.") });
type FormValues = z.infer<typeof schema>;
const DEFAULTS: FormValues = { patientId: 0, paymentMethod: "efectivo", observations: "", lines: [{ concept: "", quantity: 1, unitPrice: 0 }] };

export function InvoicesManager({ canWrite }: Readonly<{ canWrite: boolean }>) {
  const list = useResourceList<InvoiceListItem>({ endpoint: "/billing/invoices", defaultSort: "issuedAt", defaultSortDescending: true });
  const [options, setOptions] = useState<BillingOptions | null>(null);
  const [detail, setDetail] = useState<InvoiceDetail | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);
  const form = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: DEFAULTS });
  const fields = useFieldArray({ control: form.control, name: "lines" });
  const watchedLines = form.watch("lines");
  const previewTotal = useMemo(() => watchedLines.reduce((total, line) => total + (Number(line.quantity) || 0) * (Number(line.unitPrice) || 0), 0), [watchedLines]);
  useEffect(() => { apiRequest<BillingOptions>("/billing/options").then(setOptions).catch((reason: unknown) => { const error = reason instanceof ApiClientError ? reason : null; void showError("No se cargaron las opciones", error?.message ?? "Intente nuevamente."); }); }, []);
  function openCreate() { form.reset(DEFAULTS); setFormOpen(true); }
  async function closeForm() { if (form.formState.isDirty && !(await confirmDiscardChanges())) return; setFormOpen(false); }
  async function openDetail(id: number) {
    setBusyId(id);
    try { setDetail(await apiRequest<InvoiceDetail>(`/billing/invoices/${id}`)); }
    catch (reason) { const error = reason instanceof ApiClientError ? reason : null; void showError("No se abrió la factura", error?.message ?? "Intente nuevamente."); }
    finally { setBusyId(null); }
  }
  const save = form.handleSubmit(async (values) => {
    const payload: InvoiceInput = { patientId: values.patientId, paymentMethod: values.paymentMethod, lines: values.lines, ...(values.observations ? { observations: values.observations } : {}) };
    try { const created = await apiRequest<InvoiceDetail>("/billing/invoices", { method: "POST", body: JSON.stringify(payload) }); setFormOpen(false); setDetail(created); list.reload(); void showSuccess("Factura emitida", `Total registrado: ${formatCurrency(created.total)}.`); }
    catch (reason) { const error = applyApiFormErrors(reason, form.setError); void showError("No se emitió la factura", error.message); }
  });
  async function annul(row: InvoiceListItem) {
    const reason = await requestInvoiceAnnulmentReason(); if (!reason) return;
    setBusyId(row.id);
    try { const updated = await apiRequest<InvoiceDetail>(`/billing/invoices/${row.id}/annul`, { method: "PATCH", body: JSON.stringify({ reason }) }); setDetail(updated); list.reload(); void showSuccess("Factura anulada", "El comprobante continúa disponible en el historial de caja."); }
    catch (reason) { const error = reason instanceof ApiClientError ? reason : null; void showError("No se anuló la factura", error?.message ?? "Intente nuevamente."); }
    finally { setBusyId(null); }
  }
  async function printInvoice(row: InvoiceListItem | InvoiceDetail) {
    let invoice = "lines" in row ? row : null;
    try { invoice ??= await apiRequest<InvoiceDetail>(`/billing/invoices/${row.id}`); }
    catch (reason) { const error = reason instanceof ApiClientError ? reason : null; void showError("No se preparó la impresión", error?.message ?? "Intente nuevamente."); return; }
    const printed = openPrintDocument({ title: `Factura #${invoice.id}${invoice.status === "anulada" ? " · ANULADA" : ""}`, subtitle: invoice.status === "anulada" ? "DOCUMENTO ANULADO — SIN VALIDEZ" : "Comprobante de servicios", fields: [{ label: "Paciente", value: invoice.patient.name }, { label: "Fecha", value: formatDateTimeWithWeekday(invoice.issuedAt) }, { label: "Forma de pago", value: PAYMENT_LABELS[invoice.paymentMethod] }, { label: "Responsable de caja", value: `${invoice.cashier.name} (${invoice.cashier.username})` }, { label: "Estado", value: invoice.status.toUpperCase() }, { label: "Total", value: formatCurrency(invoice.total) }, ...(invoice.annulmentReason ? [{ label: "Motivo de anulación", value: invoice.annulmentReason }] : []), { label: "Observaciones", value: invoice.observations || "Sin observaciones" }], tables: [{ title: "Detalle", columns: ["Concepto", "Cantidad", "Precio unitario", "Subtotal"], rows: invoice.lines.map((line) => [line.concept, String(line.quantity), formatCurrency(line.unitPrice), formatCurrency(line.subtotal)]) }], footer: invoice.status === "anulada" ? "Factura anulada. Documento conservado únicamente para trazabilidad." : "Alternativa Médica Integral A.M.I." });
    if (!printed) void showError("No se abrió la impresión", "El navegador no permitió preparar el documento.");
  }
  const columns: ColumnDef<InvoiceListItem>[] = [
    { id: "patient", accessorFn: (row) => row.patient.name, header: "Paciente" },
    { id: "issuedAt", accessorKey: "issuedAt", header: "Fecha", cell: ({ row }) => <div className="table-date-stack"><strong>{formatDateTime(row.original.issuedAt)}</strong><span>{formatWeekdayName(row.original.issuedAt)}</span></div> },
    { id: "total", accessorKey: "total", header: "Total", cell: ({ row }) => <strong>{formatCurrency(row.original.total)}</strong> },
    { id: "paymentMethod", header: "Pago", enableSorting: false, cell: ({ row }) => PAYMENT_LABELS[row.original.paymentMethod] },
    { id: "cashier", header: "Caja", enableSorting: false, cell: ({ row }) => row.original.cashier.name },
    { id: "status", header: "Estado", enableSorting: false, cell: ({ row }) => <StatusBadge active={row.original.status === "pagada"} activeLabel="Pagada" inactiveLabel="Anulada" /> },
    { id: "actions", header: "Acciones", enableSorting: false, cell: ({ row }) => <div className="record-actions"><button className="table-action-button" type="button" disabled={busyId === row.original.id} onClick={() => { void openDetail(row.original.id); }}><Eye aria-hidden="true" /> Detalle</button><button className="table-action-button" type="button" onClick={() => { void printInvoice(row.original); }}><Printer aria-hidden="true" /> Imprimir</button>{canWrite && row.original.status === "pagada" && <button className="table-action-button" type="button" disabled={busyId === row.original.id} onClick={() => { void annul(row.original); }}><XCircle aria-hidden="true" /> Anular</button>}</div> },
  ];
  return <>
    <ResourcePanel canWrite={canWrite} columns={columns} description="Comprobantes pagados y anulados, sin eliminación física." emptyTitle="No hay facturas" emptyDescription="Cambie los filtros o emita la primera factura." getRowId={(row) => String(row.id)} list={list} onCreate={openCreate} searchPlaceholder="Paciente, cajero u observación" statusOptions={STATUS_OPTIONS} title="Facturas" />
    <FormModal open={formOpen} onClose={() => { void closeForm(); }} onSubmit={save} isSubmitting={form.formState.isSubmitting} submitLabel="Emitir factura" title="Nueva factura" description="El total se calcula y valida automáticamente en la base de datos." size="lg">
      <FormSection title="Paciente y pago"><div className="crud-form-grid"><FormField htmlFor="invoice-patient" label="Paciente" required error={form.formState.errors.patientId?.message}><Controller control={form.control} name="patientId" render={({ field }) => <Select2Field id="invoice-patient" options={options?.patients ?? []} placeholder="Buscar paciente" value={field.value} onChange={field.onChange} onBlur={field.onBlur} />} /></FormField><FormField htmlFor="invoice-payment" label="Forma de pago" required error={form.formState.errors.paymentMethod?.message}><select {...form.register("paymentMethod")}><option value="efectivo">Efectivo</option><option value="tarjeta">Tarjeta</option><option value="transferencia">Transferencia</option></select></FormField></div><FormField htmlFor="invoice-observations" label="Observaciones" error={form.formState.errors.observations?.message}><textarea {...form.register("observations")} rows={2} /></FormField></FormSection>
      <FormSection title="Conceptos facturados"><div className="invoice-service-shortcuts"><span>Agregar servicio:</span>{options?.services.filter((service) => service.active).map((service) => <button type="button" key={service.id} onClick={() => fields.append({ concept: service.label, quantity: 1, unitPrice: service.price })}>{service.label} · {formatCurrency(service.price)}</button>)}</div><div className="invoice-lines">{fields.fields.map((field, index) => <div className="invoice-line" key={field.id}><FormField htmlFor={`invoice-concept-${index}`} label="Concepto" required error={form.formState.errors.lines?.[index]?.concept?.message}><input {...form.register(`lines.${index}.concept`)} /></FormField><FormField htmlFor={`invoice-quantity-${index}`} label="Cantidad" required error={form.formState.errors.lines?.[index]?.quantity?.message}><input type="number" min="0.01" step="0.01" {...form.register(`lines.${index}.quantity`, { valueAsNumber: true })} /></FormField><FormField htmlFor={`invoice-price-${index}`} label="Precio unitario" required error={form.formState.errors.lines?.[index]?.unitPrice?.message}><input type="number" min="0" step="0.01" {...form.register(`lines.${index}.unitPrice`, { valueAsNumber: true })} /></FormField><button className="table-action-button invoice-remove-line" type="button" disabled={fields.fields.length === 1} onClick={() => fields.remove(index)} aria-label={`Eliminar concepto ${index + 1}`}><Trash2 aria-hidden="true" /> Quitar</button></div>)}</div><button className="button button-secondary button-compact" type="button" onClick={() => fields.append({ concept: "", quantity: 1, unitPrice: 0 })}><Plus aria-hidden="true" /> Agregar concepto</button><p className="invoice-total-preview"><span>Total estimado</span><strong>{formatCurrency(previewTotal)}</strong></p></FormSection>
    </FormModal>
    <DetailModal open={detail !== null} onClose={() => setDetail(null)} title={`Factura #${detail?.id ?? ""}`} size="lg" footer={<><button className="button button-secondary" type="button" onClick={() => setDetail(null)}>Cerrar</button>{detail && <button className="button button-primary" type="button" onClick={() => { void printInvoice(detail); }}><Printer aria-hidden="true" /> Imprimir</button>}{canWrite && detail?.status === "pagada" && <button className="button button-secondary" type="button" onClick={() => { const selected = detail; setDetail(null); void annul(selected); }}><XCircle aria-hidden="true" /> Anular</button>}</>}>
      {detail && <div className="clinical-detail"><dl className="permission-detail-list"><div><dt>Paciente</dt><dd>{detail.patient.name}</dd></div><div><dt>Fecha</dt><dd>{formatDateTimeWithWeekday(detail.issuedAt)}</dd></div><div><dt>Forma de pago</dt><dd>{PAYMENT_LABELS[detail.paymentMethod]}</dd></div><div><dt>Responsable de caja</dt><dd>{detail.cashier.name}</dd></div><div><dt>Estado</dt><dd><StatusBadge active={detail.status === "pagada"} activeLabel="Pagada" inactiveLabel="Anulada" /></dd></div><div><dt>Total</dt><dd>{formatCurrency(detail.total)}</dd></div>{detail.annulledAt && <div><dt>Fecha de anulación</dt><dd>{formatDateTimeWithWeekday(detail.annulledAt)}</dd></div>}{detail.annulmentReason && <div><dt>Motivo</dt><dd>{detail.annulmentReason}</dd></div>}<div><dt>Observaciones</dt><dd>{detail.observations || "Sin observaciones"}</dd></div></dl><section className="record-items"><h3>Conceptos</h3>{detail.lines.map((line) => <article key={line.id}><div><strong>{line.concept}</strong><span>{line.quantity} × {formatCurrency(line.unitPrice)}</span></div><strong>{formatCurrency(line.subtotal)}</strong></article>)}</section></div>}
    </DetailModal>
  </>;
}
