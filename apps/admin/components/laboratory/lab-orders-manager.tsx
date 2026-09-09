"use client";

import type { LabOrderDetail, LabOrderInput, LabOrderListItem, LabOrderOptions, LabOrderStatus, LabResultInput, LabResultItem } from "@ami/contracts";
import { zodResolver } from "@hookform/resolvers/zod";
import type { ColumnDef } from "@tanstack/react-table";
import { CheckCircle2, Eye, FilePenLine, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { ApiClientError, apiRequest } from "../../lib/api-client";
import { confirmDiscardChanges, confirmLabCompletion, showError, showSuccess } from "../../lib/alerts";
import { applyApiFormErrors } from "../administration/form-api-error";
import { formatDateTime, formatDateTimeWithWeekday, formatWeekdayName } from "../administration/formatters";
import { ResourcePanel } from "../administration/resource-panel";
import { useResourceList } from "../administration/use-resource-list";
import { FormField, FormSection } from "../crud/form-field";
import { DetailModal, FormModal } from "../crud/modal";
import { StatusBadge } from "../crud/status-badge";

const STATUS_OPTIONS = [{ value: "all", label: "Todos los estados" }, { value: "pendiente", label: "Pendientes" }, { value: "procesando", label: "En proceso" }, { value: "finalizado", label: "Finalizadas" }];
const orderSchema = z.object({ patientId: z.number().int().positive("Seleccione un paciente."), professionalId: z.number().int().nonnegative(), observations: z.string().trim().max(10_000), testIds: z.array(z.number().int().positive()).min(1, "Seleccione al menos un examen.") });
type OrderForm = z.infer<typeof orderSchema>;
const ORDER_DEFAULTS: OrderForm = { patientId: 0, professionalId: 0, observations: "", testIds: [] };
const resultSchema = z.object({ value: z.string().trim().min(1, "Ingrese el resultado.").max(255), observations: z.string().trim().max(10_000) });
type ResultForm = z.infer<typeof resultSchema>;

function OrderBadge({ status }: Readonly<{ status: LabOrderStatus }>) {
  return <StatusBadge active={status !== "pendiente"} activeLabel={status === "finalizado" ? "Finalizada" : "En proceso"} inactiveLabel="Pendiente" />;
}

export function LabOrdersManager({ canWrite }: Readonly<{ canWrite: boolean }>) {
  const list = useResourceList<LabOrderListItem>({ endpoint: "/laboratory/orders", defaultSort: "orderedAt" });
  const [options, setOptions] = useState<LabOrderOptions | null>(null);
  const [detail, setDetail] = useState<LabOrderDetail | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [resultOpen, setResultOpen] = useState(false);
  const [editingResult, setEditingResult] = useState<LabResultItem | null>(null);
  const [resultParent, setResultParent] = useState<LabOrderDetail | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [testSearch, setTestSearch] = useState("");
  const form = useForm<OrderForm>({ resolver: zodResolver(orderSchema), defaultValues: ORDER_DEFAULTS });
  const resultForm = useForm<ResultForm>({ resolver: zodResolver(resultSchema), defaultValues: { value: "", observations: "" } });
  useEffect(() => { apiRequest<LabOrderOptions>("/laboratory/options").then(setOptions).catch((reason: unknown) => { const error = reason instanceof ApiClientError ? reason : null; void showError("No se cargaron las opciones", error?.message ?? "Intente nuevamente."); }); }, []);
  const filteredTests = useMemo(() => {
    const normalized = testSearch.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();
    if (!normalized) return options?.tests ?? [];
    return (options?.tests ?? []).filter((option) => option.label.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().includes(normalized));
  }, [options?.tests, testSearch]);
  function openCreate() { form.reset(ORDER_DEFAULTS); setTestSearch(""); setFormOpen(true); }
  async function closeForm() { if (form.formState.isDirty && !(await confirmDiscardChanges())) return; setFormOpen(false); }
  async function openDetail(row: LabOrderListItem) {
    setBusyId(row.id);
    try { setDetail(await apiRequest<LabOrderDetail>(`/laboratory/orders/${row.id}`)); }
    catch (reason) { const error = reason instanceof ApiClientError ? reason : null; void showError("No se abrió la orden", error?.message ?? "Intente nuevamente."); }
    finally { setBusyId(null); }
  }
  const saveOrder = form.handleSubmit(async (values) => {
    const payload: LabOrderInput = { patientId: values.patientId, professionalId: values.professionalId || null, testIds: values.testIds, ...(values.observations ? { observations: values.observations } : {}) };
    try { const created = await apiRequest<LabOrderDetail>("/laboratory/orders", { method: "POST", body: JSON.stringify(payload) }); setFormOpen(false); setDetail(created); list.reload(); void showSuccess("Orden creada", "Los exámenes quedaron pendientes de resultado."); }
    catch (reason) { const error = applyApiFormErrors(reason, form.setError); void showError("No se creó la orden", error.message); }
  });
  function openResult(parent: LabOrderDetail, result: LabResultItem) { setResultParent(parent); setEditingResult(result); resultForm.reset({ value: result.value ?? "", observations: result.observations ?? "" }); setDetail(null); setResultOpen(true); }
  async function closeResult() { if (resultForm.formState.isDirty && !(await confirmDiscardChanges())) return; setResultOpen(false); setDetail(resultParent); }
  const saveResult = resultForm.handleSubmit(async (values) => {
    if (!resultParent || !editingResult) return;
    try { const updated = await apiRequest<LabOrderDetail>(`/laboratory/orders/${resultParent.id}/results/${editingResult.id}`, { method: "PATCH", body: JSON.stringify(values satisfies LabResultInput) }); setResultOpen(false); setDetail(updated); list.reload(); void showSuccess("Resultado guardado", "La orden quedó actualizada."); }
    catch (reason) { const error = applyApiFormErrors(reason, resultForm.setError); void showError("No se guardó el resultado", error.message); }
  });
  async function setStatus(order: LabOrderDetail, status: Exclude<LabOrderStatus, "pendiente">) {
    if (status === "finalizado" && !(await confirmLabCompletion())) return;
    setBusyId(order.id);
    try { const updated = await apiRequest<LabOrderDetail>(`/laboratory/orders/${order.id}/status`, { method: "PATCH", body: JSON.stringify({ status }) }); setDetail(updated); list.reload(); void showSuccess(status === "finalizado" ? "Orden finalizada" : "Orden en proceso", status === "finalizado" ? "Los resultados quedaron bloqueados." : "Ya puede registrar resultados."); }
    catch (reason) { const error = reason instanceof ApiClientError ? reason : null; void showError("No se cambió el estado", error?.message ?? "Intente nuevamente."); }
    finally { setBusyId(null); }
  }
  const columns: ColumnDef<LabOrderListItem>[] = [
    { id: "professional", accessorFn: (row) => row.professional?.name ?? "Externa", header: "Profesional" },
    { id: "patient", accessorFn: (row) => row.patient.name, header: "Paciente" },
    { id: "orderedAt", accessorKey: "orderedAt", header: "Fecha", cell: ({ row }) => <div className="table-date-stack"><strong>{formatDateTime(row.original.orderedAt)}</strong><span>{formatWeekdayName(row.original.orderedAt)}</span></div> },
    { id: "order", header: "Orden", enableSorting: false, cell: ({ row }) => <strong className="table-primary-text">#{row.original.id}</strong> },
    { id: "progress", header: "Resultados", enableSorting: false, cell: ({ row }) => `${row.original.completedResultCount}/${row.original.resultCount}` },
    { id: "status", header: "Estado", enableSorting: false, cell: ({ row }) => <OrderBadge status={row.original.status} /> },
    { id: "actions", header: "Acciones", enableSorting: false, cell: ({ row }) => <button className="table-action-button" type="button" disabled={busyId === row.original.id} onClick={() => { void openDetail(row.original); }}><Eye aria-hidden="true" /> Detalle</button> },
  ];
  return <>
    <ResourcePanel canWrite={canWrite} columns={columns} description="Órdenes, avance de resultados y cierre protegido." emptyTitle="No hay órdenes" emptyDescription="Cambie los filtros o cree la primera orden." getRowId={(row) => String(row.id)} list={list} onCreate={openCreate} searchPlaceholder="Paciente, profesional u observación" statusOptions={STATUS_OPTIONS} title="Órdenes de laboratorio" />
    <FormModal open={formOpen} onClose={() => { void closeForm(); }} onSubmit={saveOrder} isSubmitting={form.formState.isSubmitting} submitLabel="Crear orden" title="Nueva orden de laboratorio" description="Los exámenes seleccionados se crean inicialmente como pendientes." size="lg">
      <FormSection title="Paciente y referencia"><div className="crud-form-grid"><FormField htmlFor="lab-patient" label="Paciente" required error={form.formState.errors.patientId?.message}><select {...form.register("patientId", { valueAsNumber: true })}><option value={0}>Seleccione un paciente</option>{options?.patients.map((option) => <option key={option.id} value={option.id} disabled={!option.active}>{option.label}</option>)}</select></FormField><FormField htmlFor="lab-professional" label="Profesional solicitante" error={form.formState.errors.professionalId?.message}><select {...form.register("professionalId", { valueAsNumber: true })}><option value={0}>Orden externa</option>{options?.professionals.map((option) => <option key={option.id} value={option.id} disabled={!option.active}>{option.label}</option>)}</select></FormField></div><FormField htmlFor="lab-notes" label="Observaciones" error={form.formState.errors.observations?.message}><textarea {...form.register("observations")} rows={3} /></FormField></FormSection>
      <FormSection title="Exámenes"><label className="option-search" htmlFor="lab-test-search"><Search aria-hidden="true" /><span className="sr-only">Buscar examen</span><input id="lab-test-search" type="search" value={testSearch} onChange={(event) => setTestSearch(event.target.value)} placeholder="Buscar examen por nombre o categoría" autoComplete="off" /></label><Controller control={form.control} name="testIds" render={({ field }) => filteredTests.length > 0 ? <div className="checkbox-grid">{filteredTests.map((option) => <label key={option.id} className={!option.active ? "is-disabled" : ""}><input type="checkbox" disabled={!option.active} checked={field.value.includes(option.id)} onChange={(event) => field.onChange(event.target.checked ? [...field.value, option.id] : field.value.filter((id) => id !== option.id))} /><span>{option.label}</span></label>)}</div> : <p className="option-search-empty">No hay exámenes que coincidan con la búsqueda.</p>} />{form.formState.errors.testIds?.message && <p className="crud-field-error" role="alert">{form.formState.errors.testIds.message}</p>}</FormSection>
    </FormModal>
    <DetailModal open={detail !== null} onClose={() => setDetail(null)} title={`Orden de laboratorio #${detail?.id ?? ""}`} size="lg" footer={<><button className="button button-secondary" type="button" onClick={() => setDetail(null)}>Cerrar</button>{canWrite && detail?.status === "pendiente" && <button className="button button-primary" type="button" onClick={() => { void setStatus(detail, "procesando"); }}>Iniciar proceso</button>}{canWrite && detail && detail.status !== "finalizado" && detail.resultCount > 0 && detail.completedResultCount === detail.resultCount && <button className="button button-primary" type="button" onClick={() => { void setStatus(detail, "finalizado"); }}><CheckCircle2 aria-hidden="true" /> Finalizar orden</button>}</>}>
      {detail && <div className="clinical-detail"><dl className="permission-detail-list"><div><dt>Paciente</dt><dd>{detail.patient.name}</dd></div><div><dt>Solicitante</dt><dd>{detail.professional?.name ?? "Orden externa"}</dd></div><div><dt>Fecha</dt><dd>{formatDateTimeWithWeekday(detail.orderedAt)}</dd></div><div><dt>Estado</dt><dd><OrderBadge status={detail.status} /></dd></div><div><dt>Observaciones</dt><dd>{detail.observations || "Sin observaciones"}</dd></div>{detail.finalizedAt && <div><dt>Finalización</dt><dd>{formatDateTimeWithWeekday(detail.finalizedAt)}</dd></div>}</dl><section className="lab-results"><h3>Resultados ({detail.completedResultCount}/{detail.resultCount})</h3>{detail.results.map((result) => <article key={result.id}><div><div><strong>{result.test.name}</strong><span>{result.test.category}</span></div>{canWrite && detail.status !== "finalizado" && <button className="table-action-button" type="button" onClick={() => openResult(detail, result)}><FilePenLine aria-hidden="true" /> {result.value ? "Editar" : "Registrar"}</button>}</div><dl><div><dt>Resultado</dt><dd>{result.value ?? "Pendiente"}{result.value && result.test.unit ? ` ${result.test.unit}` : ""}</dd></div><div><dt>Referencia</dt><dd>{result.test.referenceValues ?? "Sin definir"}</dd></div><div><dt>Observaciones</dt><dd>{result.observations ?? "Sin observaciones"}</dd></div></dl></article>)}</section></div>}
    </DetailModal>
    <FormModal open={resultOpen} onClose={() => { void closeResult(); }} onSubmit={saveResult} isSubmitting={resultForm.formState.isSubmitting} submitLabel="Guardar resultado" title={`Resultado: ${editingResult?.test.name ?? ""}`} description={editingResult?.test.referenceValues ? `Referencia: ${editingResult.test.referenceValues}${editingResult.test.unit ? ` ${editingResult.test.unit}` : ""}` : "Sin valores de referencia definidos."}>
      <FormSection title="Resultado"><FormField htmlFor="lab-value" label="Valor obtenido" required error={resultForm.formState.errors.value?.message}><input {...resultForm.register("value")} /></FormField><FormField htmlFor="lab-result-notes" label="Observaciones" error={resultForm.formState.errors.observations?.message}><textarea {...resultForm.register("observations")} rows={4} /></FormField></FormSection>
    </FormModal>
  </>;
}
