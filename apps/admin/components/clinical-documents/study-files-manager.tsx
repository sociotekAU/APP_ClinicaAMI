"use client";

import type { StudyFileInput, StudyFileListItem, StudyFileMetadataInput, StudyFileOptions } from "@ami/contracts";
import { zodResolver } from "@hookform/resolvers/zod";
import type { ColumnDef } from "@tanstack/react-table";
import { Download, Eye, FileSearch, LoaderCircle, Pencil, Power } from "lucide-react";
import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { ApiClientError, apiRequest } from "../../lib/api-client";
import { confirmDiscardChanges, requestStudyStatusReason, showError, showSuccess } from "../../lib/alerts";
import { applyApiFormErrors } from "../administration/form-api-error";
import { formatDateTime, formatDateTimeWithWeekday, formatWeekdayName } from "../administration/formatters";
import { ResourcePanel } from "../administration/resource-panel";
import { useResourceList } from "../administration/use-resource-list";
import { FormField, FormSection } from "../crud/form-field";
import { DetailModal, FormModal, MediaPreviewModal } from "../crud/modal";
import { Select2Field } from "../crud/select2-field";
import { StatusBadge } from "../crud/status-badge";
import { downloadPrivateFile, formatFileSize, loadPrivatePreview, releasePrivatePreview, type PrivateFilePreview } from "./private-file-actions";

const MAX_FILE_BYTES = 10 * 1024 * 1024;
const schema = z.object({
  consultationId: z.number().int().positive("Seleccione una consulta."),
  studyType: z.string().trim().min(2, "Escriba al menos 2 caracteres.").max(100),
  description: z.string().trim().max(10_000, "La descripción no puede superar 10000 caracteres."),
});
type StudyForm = z.infer<typeof schema>;
const DEFAULTS: StudyForm = { consultationId: 0, studyType: "", description: "" };

export function StudyFilesManager({ canWrite }: Readonly<{ canWrite: boolean }>) {
  const list = useResourceList<StudyFileListItem>({ endpoint: "/study-files", defaultSort: "uploadedAt", defaultSortDescending: true });
  const [options, setOptions] = useState<StudyFileOptions | null>(null);
  const [detail, setDetail] = useState<StudyFileListItem | null>(null);
  const [editing, setEditing] = useState<StudyFileListItem | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [preview, setPreview] = useState<PrivateFilePreview | null>(null);
  const form = useForm<StudyForm>({ resolver: zodResolver(schema), defaultValues: DEFAULTS });

  useEffect(() => {
    apiRequest<StudyFileOptions>("/study-files/options").then(setOptions).catch((reason: unknown) => {
      const error = reason instanceof ApiClientError ? reason : null;
      void showError("No se cargaron las consultas", error?.message ?? "Intente nuevamente.");
    });
  }, []);

  useEffect(() => () => releasePrivatePreview(preview), [preview]);

  function openCreate() {
    setEditing(null);
    setFile(null);
    setFileError(null);
    form.reset(DEFAULTS);
    setFormOpen(true);
  }

  function openEdit(row: StudyFileListItem) {
    setEditing(row);
    setFile(null);
    setFileError(null);
    form.reset({ consultationId: row.consultation.id, studyType: row.studyType, description: row.description ?? "" });
    setFormOpen(true);
  }

  async function closeForm() {
    if ((form.formState.isDirty || file) && !(await confirmDiscardChanges())) return;
    setFormOpen(false);
  }

  function selectFile(selected: File | null) {
    setFile(selected);
    if (!selected) setFileError("Seleccione el documento del estudio.");
    else if (selected.size > MAX_FILE_BYTES) setFileError("El archivo supera el máximo permitido de 10 MB.");
    else setFileError(null);
  }

  const save = form.handleSubmit(async (values) => {
    if (!editing && !file) { setFileError("Seleccione el documento del estudio."); return; }
    if (!editing && file && file.size > MAX_FILE_BYTES) { setFileError("El archivo supera el máximo permitido de 10 MB."); return; }
    try {
      if (editing) {
        const payload: StudyFileMetadataInput = { studyType: values.studyType, ...(values.description ? { description: values.description } : {}) };
        await apiRequest<StudyFileListItem>(`/study-files/${editing.id}`, { method: "PATCH", body: JSON.stringify(payload) });
      } else if (file) {
        const consultation = options?.consultations.find((item) => item.id === values.consultationId);
        if (!consultation) { form.setError("consultationId", { message: "Seleccione una consulta válida." }); return; }
        const payload: StudyFileInput = { patientId: consultation.patientId, consultationId: values.consultationId, studyType: values.studyType, ...(values.description ? { description: values.description } : {}) };
        const multipart = new FormData();
        multipart.append("patientId", String(payload.patientId));
        multipart.append("consultationId", String(payload.consultationId));
        multipart.append("studyType", payload.studyType);
        if (payload.description) multipart.append("description", payload.description);
        multipart.append("file", file);
        await apiRequest<StudyFileListItem>("/study-files", { method: "POST", body: multipart });
      }
      setFormOpen(false);
      list.reload();
      void showSuccess(editing ? "Estudio actualizado" : "Estudio archivado", editing ? "Los metadatos quedaron actualizados." : "El archivo quedó resguardado en el almacenamiento privado.");
    } catch (reason) {
      const error = applyApiFormErrors(reason, form.setError);
      void showError("No se guardó el estudio", error.message);
    }
  });

  async function changeStatus(row: StudyFileListItem) {
    const nextActive = !row.active;
    const reason = await requestStudyStatusReason(nextActive);
    if (!reason) return;
    setBusyId(row.id);
    try {
      await apiRequest<StudyFileListItem>(`/study-files/${row.id}/status`, { method: "PATCH", body: JSON.stringify({ active: nextActive, reason }) });
      list.reload();
      void showSuccess(nextActive ? "Archivo reactivado" : "Archivo desactivado", "El documento y la trazabilidad permanecen conservados.");
    } catch (cause) {
      const error = cause instanceof ApiClientError ? cause : null;
      void showError("No se cambió el estado", error?.message ?? "Intente nuevamente.");
    } finally { setBusyId(null); }
  }

  async function openPreview(row: StudyFileListItem) {
    setBusyId(row.id);
    try {
      releasePrivatePreview(preview);
      setPreview(await loadPrivatePreview(`/study-files/${row.id}/preview`, row.document.originalName ?? row.studyType));
    } catch (cause) {
      const error = cause instanceof ApiClientError ? cause : null;
      void showError("No se abrió el archivo", error?.message ?? "Intente nuevamente.");
    } finally { setBusyId(null); }
  }

  async function download(row: StudyFileListItem) {
    setBusyId(row.id);
    try { await downloadPrivateFile(`/study-files/${row.id}/download`, row.document.originalName ?? `estudio-${row.id}`); }
    catch (cause) { const error = cause instanceof ApiClientError ? cause : null; void showError("No se descargó el archivo", error?.message ?? "Intente nuevamente."); }
    finally { setBusyId(null); }
  }

  const columns: ColumnDef<StudyFileListItem>[] = [
    { id: "patient", accessorFn: (row) => row.patient.name, header: "Paciente", cell: ({ row }) => <strong className="table-primary-text">{row.original.patient.name}</strong> },
    { id: "studyType", accessorKey: "studyType", header: "Estudio", cell: ({ row }) => <div className="table-date-stack"><strong>{row.original.studyType}</strong><span>{row.original.document.originalName ?? "Documento histórico no migrado"}</span></div> },
    { id: "professional", header: "Profesional", enableSorting: false, cell: ({ row }) => <div className="table-date-stack"><strong>{row.original.consultation.professional.name}</strong><span>Consulta #{row.original.consultation.id}</span></div> },
    { id: "uploadedAt", accessorKey: "uploadedAt", header: "Fecha", cell: ({ row }) => <div className="table-date-stack"><strong>{formatDateTime(row.original.uploadedAt)}</strong><span>{formatWeekdayName(row.original.uploadedAt)}</span></div> },
    { id: "size", header: "Tamaño", enableSorting: false, cell: ({ row }) => formatFileSize(row.original.document.sizeBytes) },
    { id: "status", header: "Estado", enableSorting: false, cell: ({ row }) => <StatusBadge active={row.original.active} activeLabel="Activo" inactiveLabel="Inactivo" /> },
    { id: "actions", header: "Acciones", enableSorting: false, cell: ({ row }) => <div className="record-actions">
      <button className="table-action-button" type="button" onClick={() => setDetail(row.original)}><Eye aria-hidden="true" /> Detalle</button>
      {row.original.document.stored && <><button className="table-action-button" type="button" disabled={busyId === row.original.id} onClick={() => { void openPreview(row.original); }}>{busyId === row.original.id ? <LoaderCircle className="spin" aria-hidden="true" /> : <FileSearch aria-hidden="true" />} Ver</button><button className="table-action-button" type="button" disabled={busyId === row.original.id} onClick={() => { void download(row.original); }}><Download aria-hidden="true" /> Descargar</button></>}
      {canWrite && <><button className="table-action-button" type="button" onClick={() => openEdit(row.original)}><Pencil aria-hidden="true" /> Editar</button><button className="status-action-button" type="button" disabled={busyId === row.original.id} onClick={() => { void changeStatus(row.original); }}><Power aria-hidden="true" /> {row.original.active ? "Desactivar" : "Reactivar"}</button></>}
    </div> },
  ];

  return <>
    <ResourcePanel canWrite={canWrite} columns={columns} description="Documentos clínicos privados asociados a una consulta, con verificación de integridad y trazabilidad." emptyTitle="No hay archivos de estudios" emptyDescription="Cambie los filtros o archive el primer estudio." getRowId={(row) => String(row.id)} list={list} onCreate={openCreate} searchPlaceholder="Paciente, estudio, archivo o descripción" title="Archivos de estudios" />
    <FormModal open={formOpen} onClose={() => { void closeForm(); }} onSubmit={save} isSubmitting={form.formState.isSubmitting} submitLabel={editing ? "Guardar cambios" : "Archivar estudio"} title={editing ? "Editar estudio" : "Nuevo archivo de estudio"} description={editing ? "El documento original no puede reemplazarse; solo se actualizan sus metadatos." : "Formatos permitidos: PDF, JPG, PNG o WEBP. Tamaño máximo: 10 MB."} size="lg">
      <FormSection title="Identificación clínica">
        {!editing && <FormField htmlFor="study-consultation" label="Consulta y paciente" required error={form.formState.errors.consultationId?.message}><Controller control={form.control} name="consultationId" render={({ field }) => <Select2Field id="study-consultation" options={options?.consultations ?? []} placeholder="Buscar paciente, profesional o fecha" value={field.value} onChange={field.onChange} onBlur={field.onBlur} />} /></FormField>}
        {editing && <p className="private-file-context"><strong>{editing.patient.name}</strong><span>{editing.consultation.professional.name} · Consulta #{editing.consultation.id}</span></p>}
        <FormField htmlFor="study-type" label="Tipo de estudio" required error={form.formState.errors.studyType?.message}><input {...form.register("studyType")} placeholder="Ej. Radiografía, ultrasonido o informe" /></FormField>
        <FormField htmlFor="study-description" label="Descripción" error={form.formState.errors.description?.message}><textarea {...form.register("description")} rows={4} /></FormField>
      </FormSection>
      {!editing && <FormSection title="Documento privado"><FormField htmlFor="study-file" label="Archivo" required error={fileError ?? undefined} help="El servidor valida el contenido real y calcula una huella SHA-256."><input type="file" accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp" onChange={(event) => selectFile(event.target.files?.[0] ?? null)} /></FormField>{file && !fileError && <p className="private-file-selection"><FileSearch aria-hidden="true" /><span><strong>{file.name}</strong>{formatFileSize(file.size)}</span></p>}</FormSection>}
    </FormModal>
    <DetailModal open={detail !== null} onClose={() => setDetail(null)} title="Detalle del archivo de estudio" size="lg" footer={<><button className="button button-secondary" type="button" onClick={() => setDetail(null)}>Cerrar</button>{detail?.document.stored && <><button className="button button-secondary" type="button" onClick={() => { void openPreview(detail); }}><FileSearch aria-hidden="true" /> Ver archivo</button><button className="button button-primary" type="button" onClick={() => { void download(detail); }}><Download aria-hidden="true" /> Descargar</button></>}</>}>
      {detail && <dl className="permission-detail-list"><div><dt>Paciente</dt><dd>{detail.patient.name}</dd></div><div><dt>Profesional</dt><dd>{detail.consultation.professional.name}</dd></div><div><dt>Consulta</dt><dd>#{detail.consultation.id} · {formatDateTimeWithWeekday(detail.consultation.recordedAt)}</dd></div><div><dt>Tipo de estudio</dt><dd>{detail.studyType}</dd></div><div><dt>Descripción</dt><dd>{detail.description || "Sin descripción"}</dd></div><div><dt>Documento</dt><dd>{detail.document.originalName || "Archivo histórico sin metadatos privados"}</dd></div><div><dt>Formato y tamaño</dt><dd>{detail.document.mimeType || "Sin formato"} · {formatFileSize(detail.document.sizeBytes)}</dd></div><div><dt>Huella SHA-256</dt><dd><code className="private-file-hash">{detail.document.sha256 || "No disponible"}</code></dd></div><div><dt>Archivado</dt><dd>{formatDateTimeWithWeekday(detail.uploadedAt)} por {detail.uploadedBy.name}</dd></div><div><dt>Estado</dt><dd><StatusBadge active={detail.active} activeLabel="Activo" inactiveLabel="Inactivo" /></dd></div>{detail.statusChangedAt && <div><dt>Último cambio</dt><dd>{formatDateTimeWithWeekday(detail.statusChangedAt)} · {detail.statusReason}</dd></div>}</dl>}
    </DetailModal>
    {preview && <MediaPreviewModal open onClose={() => { releasePrivatePreview(preview); setPreview(null); }} title={preview.title} kind={preview.kind} url={preview.url} />}
  </>;
}
