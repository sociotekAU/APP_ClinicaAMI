"use client";

import type { ConsentInput, ConsentListItem, ConsentOptions, ConsentStatus, ConsentStatusInput } from "@ami/contracts";
import { zodResolver } from "@hookform/resolvers/zod";
import type { ColumnDef } from "@tanstack/react-table";
import { Ban, Download, Eye, FileCheck2, FileSearch, FileUp, LoaderCircle, Pencil, Undo2 } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { ApiClientError, apiRequest } from "../../lib/api-client";
import { confirmDiscardChanges, requestConsentStatusReason, showError, showSuccess } from "../../lib/alerts";
import { applyApiFormErrors } from "../administration/form-api-error";
import { formatDateTime, formatDateTimeWithWeekday, formatWeekdayName } from "../administration/formatters";
import { ResourcePanel } from "../administration/resource-panel";
import { useResourceList } from "../administration/use-resource-list";
import { FormField, FormSection } from "../crud/form-field";
import { DetailModal, FormModal, MediaPreviewModal } from "../crud/modal";
import { Select2Field } from "../crud/select2-field";
import { downloadPrivateFile, formatFileSize, loadPrivatePreview, releasePrivatePreview, type PrivateFilePreview } from "./private-file-actions";

const MAX_FILE_BYTES = 10 * 1024 * 1024;
const STATUS_OPTIONS = [
  { value: "all", label: "Todos los estados" },
  { value: "pendiente", label: "Pendientes" },
  { value: "firmado", label: "Firmados" },
  { value: "rechazado", label: "Rechazados" },
  { value: "revocado", label: "Revocados" },
];
const STATUS_LABELS: Record<ConsentStatus, string> = { pendiente: "Pendiente", firmado: "Firmado", rechazado: "Rechazado", revocado: "Revocado" };
const schema = z.object({
  patientId: z.number().int().positive("Seleccione un paciente."),
  serviceId: z.number().int().positive("Seleccione un servicio."),
  observations: z.string().trim().max(10_000, "Las observaciones no pueden superar 10000 caracteres."),
});
type ConsentForm = z.infer<typeof schema>;
const DEFAULTS: ConsentForm = { patientId: 0, serviceId: 0, observations: "" };

function ConsentBadge({ status }: Readonly<{ status: ConsentStatus }>) {
  return <span className={`consent-status is-${status}`}>{STATUS_LABELS[status]}</span>;
}

export function ConsentsManager({ canWrite }: Readonly<{ canWrite: boolean }>) {
  const list = useResourceList<ConsentListItem>({ endpoint: "/consents", defaultSort: "createdAt", defaultSortDescending: true });
  const [options, setOptions] = useState<ConsentOptions | null>(null);
  const [detail, setDetail] = useState<ConsentListItem | null>(null);
  const [editing, setEditing] = useState<ConsentListItem | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [uploadTarget, setUploadTarget] = useState<ConsentListItem | null>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [preview, setPreview] = useState<PrivateFilePreview | null>(null);
  const form = useForm<ConsentForm>({ resolver: zodResolver(schema), defaultValues: DEFAULTS });

  useEffect(() => {
    apiRequest<ConsentOptions>("/consents/options").then(setOptions).catch((reason: unknown) => {
      const error = reason instanceof ApiClientError ? reason : null;
      void showError("No se cargaron las opciones", error?.message ?? "Intente nuevamente.");
    });
  }, []);
  useEffect(() => () => releasePrivatePreview(preview), [preview]);

  function openCreate() { setEditing(null); form.reset(DEFAULTS); setFormOpen(true); }
  function openEdit(row: ConsentListItem) { setEditing(row); form.reset({ patientId: row.patient.id, serviceId: row.service.id, observations: row.observations ?? "" }); setFormOpen(true); }
  async function closeForm() { if (form.formState.isDirty && !(await confirmDiscardChanges())) return; setFormOpen(false); }

  const save = form.handleSubmit(async (values) => {
    const payload: ConsentInput = { patientId: values.patientId, serviceId: values.serviceId, ...(values.observations ? { observations: values.observations } : {}) };
    try {
      await apiRequest<ConsentListItem>(editing ? `/consents/${editing.id}` : "/consents", { method: editing ? "PATCH" : "POST", body: JSON.stringify(payload) });
      setFormOpen(false);
      list.reload();
      void showSuccess(editing ? "Consentimiento actualizado" : "Consentimiento creado", "El registro quedó pendiente de documento y decisión.");
    } catch (reason) {
      const error = applyApiFormErrors(reason, form.setError);
      void showError("No se guardó el consentimiento", error.message);
    }
  });

  function openUpload(row: ConsentListItem) { setUploadTarget(row); setUploadFile(null); setUploadError(null); }
  function selectUploadFile(selected: File | null) {
    setUploadFile(selected);
    if (!selected) setUploadError("Seleccione el documento firmado.");
    else if (selected.size > MAX_FILE_BYTES) setUploadError("El archivo supera el máximo permitido de 10 MB.");
    else setUploadError(null);
  }
  async function upload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!uploadTarget || !uploadFile) { setUploadError("Seleccione el documento firmado."); return; }
    if (uploadFile.size > MAX_FILE_BYTES) { setUploadError("El archivo supera el máximo permitido de 10 MB."); return; }
    setUploading(true);
    try {
      const multipart = new FormData();
      multipart.append("file", uploadFile);
      const updated = await apiRequest<ConsentListItem>(`/consents/${uploadTarget.id}/document`, { method: "POST", body: multipart });
      setUploadTarget(null);
      if (detail?.id === updated.id) setDetail(updated);
      list.reload();
      void showSuccess("Documento adjuntado", "Revise el archivo y confirme la firma cuando corresponda.");
    } catch (cause) {
      const error = cause instanceof ApiClientError ? cause : null;
      void showError("No se adjuntó el documento", error?.message ?? "Intente nuevamente.");
    } finally { setUploading(false); }
  }

  async function changeStatus(row: ConsentListItem, status: Exclude<ConsentStatus, "pendiente">) {
    const reason = await requestConsentStatusReason(status);
    if (!reason) return;
    setBusyId(row.id);
    try {
      const payload: ConsentStatusInput = { status, reason };
      const updated = await apiRequest<ConsentListItem>(`/consents/${row.id}/status`, { method: "PATCH", body: JSON.stringify(payload) });
      if (detail?.id === updated.id) setDetail(updated);
      list.reload();
      void showSuccess(`Consentimiento ${STATUS_LABELS[status].toLowerCase()}`, "El cambio quedó registrado en la trazabilidad.");
    } catch (cause) {
      const error = cause instanceof ApiClientError ? cause : null;
      void showError("No se cambió el estado", error?.message ?? "Intente nuevamente.");
    } finally { setBusyId(null); }
  }

  async function openPreview(row: ConsentListItem) {
    setBusyId(row.id);
    try {
      releasePrivatePreview(preview);
      setPreview(await loadPrivatePreview(`/consents/${row.id}/preview`, row.document.originalName ?? `Consentimiento #${row.id}`));
    } catch (cause) {
      const error = cause instanceof ApiClientError ? cause : null;
      void showError("No se abrió el documento", error?.message ?? "Intente nuevamente.");
    } finally { setBusyId(null); }
  }

  async function download(row: ConsentListItem) {
    setBusyId(row.id);
    try { await downloadPrivateFile(`/consents/${row.id}/download`, row.document.originalName ?? `consentimiento-${row.id}`); }
    catch (cause) { const error = cause instanceof ApiClientError ? cause : null; void showError("No se descargó el documento", error?.message ?? "Intente nuevamente."); }
    finally { setBusyId(null); }
  }

  function actionButtons(row: ConsentListItem) {
    const pending = row.status === "pendiente";
    return <div className="record-actions">
      <button className="table-action-button" type="button" onClick={() => setDetail(row)}><Eye aria-hidden="true" /> Detalle</button>
      {row.document.stored && <><button className="table-action-button" type="button" disabled={busyId === row.id} onClick={() => { void openPreview(row); }}>{busyId === row.id ? <LoaderCircle className="spin" aria-hidden="true" /> : <FileSearch aria-hidden="true" />} Ver</button><button className="table-action-button" type="button" disabled={busyId === row.id} onClick={() => { void download(row); }}><Download aria-hidden="true" /> Descargar</button></>}
      {canWrite && pending && <><button className="table-action-button" type="button" onClick={() => openEdit(row)}><Pencil aria-hidden="true" /> Editar</button><button className="table-action-button" type="button" onClick={() => openUpload(row)}><FileUp aria-hidden="true" /> {row.document.stored ? "Reemplazar" : "Adjuntar"}</button>{row.document.stored && <button className="table-action-button" type="button" disabled={busyId === row.id} onClick={() => { void changeStatus(row, "firmado"); }}><FileCheck2 aria-hidden="true" /> Firmar</button>}<button className="table-action-button" type="button" disabled={busyId === row.id} onClick={() => { void changeStatus(row, "rechazado"); }}><Ban aria-hidden="true" /> Rechazar</button></>}
      {canWrite && row.status === "firmado" && <button className="status-action-button" type="button" disabled={busyId === row.id} onClick={() => { void changeStatus(row, "revocado"); }}><Undo2 aria-hidden="true" /> Revocar</button>}
    </div>;
  }

  const columns: ColumnDef<ConsentListItem>[] = [
    { id: "patient", accessorFn: (row) => row.patient.name, header: "Paciente", cell: ({ row }) => <strong className="table-primary-text">{row.original.patient.name}</strong> },
    { id: "service", accessorFn: (row) => row.service.name, header: "Servicio" },
    { id: "createdAt", accessorKey: "createdAt", header: "Fecha", cell: ({ row }) => <div className="table-date-stack"><strong>{formatDateTime(row.original.createdAt)}</strong><span>{formatWeekdayName(row.original.createdAt)}</span></div> },
    { id: "document", header: "Documento", enableSorting: false, cell: ({ row }) => row.original.document.stored ? <div className="table-date-stack"><strong>{row.original.document.originalName}</strong><span>{formatFileSize(row.original.document.sizeBytes)}</span></div> : <span className="table-muted">Pendiente de adjuntar</span> },
    { id: "status", header: "Estado", enableSorting: false, cell: ({ row }) => <ConsentBadge status={row.original.status} /> },
    { id: "actions", header: "Acciones", enableSorting: false, cell: ({ row }) => actionButtons(row.original) },
  ];

  return <>
    <ResourcePanel canWrite={canWrite} columns={columns} description="Consentimientos informados con documento privado y estados finales inmutables." emptyTitle="No hay consentimientos" emptyDescription="Cambie los filtros o cree el primer consentimiento." getRowId={(row) => String(row.id)} list={list} onCreate={openCreate} searchPlaceholder="Paciente, servicio, archivo u observación" statusOptions={STATUS_OPTIONS} title="Consentimientos informados" />
    <FormModal open={formOpen} onClose={() => { void closeForm(); }} onSubmit={save} isSubmitting={form.formState.isSubmitting} submitLabel={editing ? "Guardar cambios" : "Crear consentimiento"} title={editing ? "Editar consentimiento" : "Nuevo consentimiento"} description="El registro inicia pendiente; después se adjunta el documento y se confirma su decisión." size="lg">
      <FormSection title="Paciente y servicio"><div className="crud-form-grid"><FormField htmlFor="consent-patient" label="Paciente" required error={form.formState.errors.patientId?.message}><Controller control={form.control} name="patientId" render={({ field }) => <Select2Field id="consent-patient" options={options?.patients ?? []} placeholder="Buscar paciente" value={field.value} onChange={field.onChange} onBlur={field.onBlur} />} /></FormField><FormField htmlFor="consent-service" label="Servicio" required error={form.formState.errors.serviceId?.message}><Controller control={form.control} name="serviceId" render={({ field }) => <Select2Field id="consent-service" options={options?.services ?? []} placeholder="Buscar servicio" value={field.value} onChange={field.onChange} onBlur={field.onBlur} />} /></FormField></div><FormField htmlFor="consent-observations" label="Observaciones" error={form.formState.errors.observations?.message}><textarea {...form.register("observations")} rows={4} /></FormField></FormSection>
    </FormModal>
    <FormModal open={uploadTarget !== null} onClose={() => { if (!uploading) setUploadTarget(null); }} onSubmit={upload} isSubmitting={uploading} submitLabel="Adjuntar documento" title={uploadTarget?.document.stored ? "Reemplazar documento" : "Adjuntar documento firmado"} description="Formatos permitidos: PDF, JPG, PNG o WEBP. Tamaño máximo: 10 MB.">
      <FormSection title="Archivo privado"><p className="private-file-context"><strong>{uploadTarget?.patient.name}</strong><span>{uploadTarget?.service.name}</span></p><FormField htmlFor="consent-file" label="Documento" required error={uploadError ?? undefined} help="Podrá confirmar la firma después de revisar la vista previa."><input type="file" accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp" onChange={(event) => selectUploadFile(event.target.files?.[0] ?? null)} /></FormField>{uploadFile && !uploadError && <p className="private-file-selection"><FileSearch aria-hidden="true" /><span><strong>{uploadFile.name}</strong>{formatFileSize(uploadFile.size)}</span></p>}</FormSection>
    </FormModal>
    <DetailModal open={detail !== null} onClose={() => setDetail(null)} title={`Consentimiento #${detail?.id ?? ""}`} size="lg" footer={<><button className="button button-secondary" type="button" onClick={() => setDetail(null)}>Cerrar</button>{detail?.document.stored && <><button className="button button-secondary" type="button" onClick={() => { void openPreview(detail); }}><FileSearch aria-hidden="true" /> Ver documento</button><button className="button button-primary" type="button" onClick={() => { void download(detail); }}><Download aria-hidden="true" /> Descargar</button></>}</>}>
      {detail && <dl className="permission-detail-list"><div><dt>Paciente</dt><dd>{detail.patient.name}</dd></div><div><dt>Servicio</dt><dd>{detail.service.name}</dd></div><div><dt>Estado</dt><dd><ConsentBadge status={detail.status} /></dd></div><div><dt>Creación</dt><dd>{formatDateTimeWithWeekday(detail.createdAt)}{detail.createdBy ? ` por ${detail.createdBy.name}` : ""}</dd></div><div><dt>Documento</dt><dd>{detail.document.originalName || "Pendiente de adjuntar"}</dd></div><div><dt>Formato y tamaño</dt><dd>{detail.document.mimeType || "Sin formato"} · {formatFileSize(detail.document.sizeBytes)}</dd></div><div><dt>Huella SHA-256</dt><dd><code className="private-file-hash">{detail.document.sha256 || "No disponible"}</code></dd></div>{detail.signedAt && <div><dt>Fecha de firma</dt><dd>{formatDateTimeWithWeekday(detail.signedAt)}</dd></div>}<div><dt>Observaciones</dt><dd>{detail.observations || "Sin observaciones"}</dd></div>{detail.statusChangedAt && <div><dt>Último cambio</dt><dd>{formatDateTimeWithWeekday(detail.statusChangedAt)} · {detail.statusReason}{detail.statusChangedBy ? ` · ${detail.statusChangedBy.name}` : ""}</dd></div>}</dl>}
    </DetailModal>
    {preview && <MediaPreviewModal open onClose={() => { releasePrivatePreview(preview); setPreview(null); }} title={preview.title} kind={preview.kind} url={preview.url} />}
  </>;
}
