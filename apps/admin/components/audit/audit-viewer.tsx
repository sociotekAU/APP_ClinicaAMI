"use client";

import type { AuditAction, AuditEventDetail, AuditEventListItem, AuditOptions } from "@ami/contracts";
import type { ColumnDef } from "@tanstack/react-table";
import { Eye, LoaderCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { apiRequest } from "../../lib/api-client";
import { showError } from "../../lib/alerts";
import { formatDateTime } from "../administration/formatters";
import { ResourcePanel } from "../administration/resource-panel";
import { useResourceList } from "../administration/use-resource-list";
import { DetailModal } from "../crud/modal";

const ACTION_LABELS: Record<AuditAction, string> = {
  creacion: "Creación",
  modificacion: "Modificación",
  cambio_estado: "Cambio de estado",
  desactivacion: "Desactivación",
  reactivacion: "Reactivación",
  anulacion: "Anulación",
  cancelacion: "Cancelación",
  finalizacion: "Finalización",
  eliminacion: "Eliminación",
  cambio_password: "Cambio de contraseña",
  sistema: "Sistema",
};

function JsonSnapshot({ value, empty }: Readonly<{ value: Record<string, unknown> | null; empty: string }>) {
  return value
    ? <pre className="audit-json">{JSON.stringify(value, null, 2)}</pre>
    : <p className="audit-empty-snapshot">{empty}</p>;
}

export function AuditViewer() {
  const [action, setAction] = useState("");
  const [module, setModule] = useState("");
  const [userId, setUserId] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [options, setOptions] = useState<AuditOptions>({ actions: [], modules: [], users: [] });
  const [detail, setDetail] = useState<AuditEventDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState<string | null>(null);
  const list = useResourceList<AuditEventListItem>({
    endpoint: "/audit",
    defaultSort: "occurredAt",
    defaultSortDescending: true,
    includeStatus: false,
    extraQuery: {
      action: action || undefined,
      module: module || undefined,
      userId: userId || undefined,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
    },
  });

  useEffect(() => {
    const controller = new AbortController();
    apiRequest<AuditOptions>("/audit/options", { signal: controller.signal })
      .then(setOptions)
      .catch((reason: unknown) => {
        if (!controller.signal.aborted) void showError("No se cargaron los filtros", reason instanceof Error ? reason.message : "Intente nuevamente.");
      });
    return () => controller.abort();
  }, []);

  async function openDetail(row: AuditEventListItem) {
    setDetailLoading(row.id);
    try {
      setDetail(await apiRequest<AuditEventDetail>(`/audit/${row.id}`));
    } catch (reason) {
      void showError("No se cargó el evento", reason instanceof Error ? reason.message : "Intente nuevamente.");
    } finally {
      setDetailLoading(null);
    }
  }

  const columns: ColumnDef<AuditEventListItem>[] = [
    {
      id: "occurredAt",
      accessorKey: "occurredAt",
      header: "Fecha y hora",
      cell: ({ row }) => <time dateTime={row.original.occurredAt}>{formatDateTime(row.original.occurredAt)}</time>,
    },
    {
      id: "user",
      accessorFn: (row) => row.user.username,
      header: "Usuario",
      cell: ({ row }) => <div className="audit-user"><strong>{row.original.user.username}</strong><span>{row.original.user.role ?? "Sin rol"}</span></div>,
    },
    {
      id: "action",
      accessorKey: "action",
      header: "Acción",
      cell: ({ row }) => <span className={`audit-action audit-action-${row.original.action}`}>{ACTION_LABELS[row.original.action]}</span>,
    },
    {
      id: "entity",
      accessorKey: "entity",
      header: "Registro",
      cell: ({ row }) => <div className="audit-entity"><strong>{row.original.entity.replaceAll("_", " ")}</strong><span>{row.original.recordId ? `#${row.original.recordId}` : "Sin identificador"}</span></div>,
    },
    {
      id: "module",
      accessorKey: "module",
      header: "Módulo",
      cell: ({ row }) => row.original.module.replaceAll("_", " "),
    },
    {
      id: "fields",
      header: "Campos",
      enableSorting: false,
      cell: ({ row }) => row.original.changedFields.length || "—",
    },
    {
      id: "actions",
      header: "Detalle",
      enableSorting: false,
      cell: ({ row }) => (
        <button className="table-action-button" type="button" onClick={() => { void openDetail(row.original); }} aria-label={`Ver evento ${row.original.id}`} disabled={detailLoading === row.original.id}>
          {detailLoading === row.original.id ? <LoaderCircle className="spin" aria-hidden="true" /> : <Eye aria-hidden="true" />} Ver
        </button>
      ),
    },
  ];

  return (
    <section className="administration-workspace audit-workspace">
      <ResourcePanel
        canWrite={false}
        columns={columns}
        description="Bitácora de solo lectura con usuario, fecha, estado anterior y estado posterior. Las credenciales se ocultan automáticamente."
        emptyTitle="No hay eventos con estos filtros"
        emptyDescription="Cambie el rango, el módulo, la acción o el texto de búsqueda."
        getRowId={(row) => row.id}
        list={list}
        onCreate={() => undefined}
        searchPlaceholder="Usuario, entidad, registro o solicitud"
        statusOptions={[]}
        title="Visor de auditoría"
        extraFilters={(
          <>
            <label><span className="sr-only">Filtrar por acción</span><select value={action} onChange={(event) => setAction(event.target.value)}><option value="">Todas las acciones</option>{options.actions.map((value) => <option key={value} value={value}>{ACTION_LABELS[value]}</option>)}</select></label>
            <label><span className="sr-only">Filtrar por módulo</span><select value={module} onChange={(event) => setModule(event.target.value)}><option value="">Todos los módulos</option>{options.modules.map((value) => <option key={value} value={value}>{value.replaceAll("_", " ")}</option>)}</select></label>
            <label><span className="sr-only">Filtrar por usuario</span><select value={userId} onChange={(event) => setUserId(event.target.value)}><option value="">Todos los usuarios</option>{options.users.map((user) => <option key={user.id} value={user.id}>{user.label}</option>)}</select></label>
            <label><span className="sr-only">Fecha inicial</span><input type="date" value={dateFrom} max={dateTo || undefined} onChange={(event) => setDateFrom(event.target.value)} /></label>
            <label><span className="sr-only">Fecha final</span><input type="date" value={dateTo} min={dateFrom || undefined} onChange={(event) => setDateTo(event.target.value)} /></label>
          </>
        )}
      />

      <DetailModal
        open={detail !== null}
        onClose={() => setDetail(null)}
        size="lg"
        title="Detalle del evento de auditoría"
        description="Este evento es inmutable y conserva la atribución histórica."
        footer={<button className="button button-primary" type="button" onClick={() => setDetail(null)}>Cerrar</button>}
      >
        {detail && (
          <div className="audit-detail">
            <dl className="permission-detail-list audit-metadata">
              <div><dt>Evento</dt><dd>#{detail.id}</dd></div>
              <div><dt>Fecha</dt><dd>{formatDateTime(detail.occurredAt)}</dd></div>
              <div><dt>Usuario</dt><dd>{detail.user.username} · {detail.user.role ?? "Sin rol"}</dd></div>
              <div><dt>Acción</dt><dd>{ACTION_LABELS[detail.action]}</dd></div>
              <div><dt>Módulo / entidad</dt><dd>{detail.module} / {detail.entity}</dd></div>
              <div><dt>Registro</dt><dd>{detail.recordId ? `#${detail.recordId}` : "Sin identificador"}</dd></div>
              <div><dt>Campos modificados</dt><dd>{detail.changedFields.join(", ") || "Ninguno informado"}</dd></div>
              <div><dt>Motivo</dt><dd>{detail.reason ?? "No aplica"}</dd></div>
              <div><dt>Solicitud</dt><dd>{detail.requestId ?? "Sin referencia"}</dd></div>
              <div><dt>Origen</dt><dd>{detail.origin} · {detail.method ?? "—"} {detail.route ?? "—"}</dd></div>
              <div><dt>Dirección IP</dt><dd>{detail.ipAddress ?? "No disponible"}</dd></div>
            </dl>
            <div className="audit-comparison" aria-label="Comparación del cambio">
              <section><h3>Antes</h3><JsonSnapshot value={detail.previousData} empty="No aplica para una creación o no existía un estado previo." /></section>
              <section><h3>Después</h3><JsonSnapshot value={detail.newData} empty="El registro no devolvió un estado posterior." /></section>
            </div>
          </div>
        )}
      </DetailModal>
    </section>
  );
}
