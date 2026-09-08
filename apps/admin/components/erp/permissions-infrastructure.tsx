"use client";

import type {
  ErpModuleCode,
  PageMeta,
  PermissionAction,
  PermissionListItem,
} from "@ami/contracts";
import type { ColumnDef, OnChangeFn, SortingState } from "@tanstack/react-table";
import { Eye, Filter, RefreshCw, Search, ShieldCheck } from "lucide-react";
import { type FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { DataTable } from "../crud/data-table";
import { DetailModal } from "../crud/modal";
import { StatusBadge } from "../crud/status-badge";
import { ApiClientError, apiPaginatedRequest } from "../../lib/api-client";
import { buildListQuery } from "../../lib/crud-query";
import { useErpContext } from "./erp-shell";

const EMPTY_PAGINATION: PageMeta = {
  page: 1,
  pageSize: 10,
  totalItems: 0,
  totalPages: 0,
};

const CAPABILITY_OPTIONS: Array<{ value: PermissionAction; label: string }> = [
  { value: "read", label: "Con lectura" },
  { value: "write", label: "Con escritura" },
  { value: "delete", label: "Con eliminación" },
];

export function PermissionsInfrastructure() {
  const context = useErpContext();
  const [items, setItems] = useState<PermissionListItem[]>([]);
  const [pagination, setPagination] = useState<PageMeta>(EMPTY_PAGINATION);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [module, setModule] = useState<ErpModuleCode | "">("");
  const [capability, setCapability] = useState<PermissionAction | "">("");
  const [sorting, setSorting] = useState<SortingState>([{ id: "role", desc: false }]);
  const [selected, setSelected] = useState<PermissionListItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ApiClientError | null>(null);
  const [reload, setReload] = useState(0);

  const sort = sorting[0];
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    const query = buildListQuery({
      page,
      pageSize,
      search,
      module,
      capability,
      sortBy: sort?.id === "module" ? "module" : "role",
      sortDirection: sort?.desc ? "desc" : "asc",
    });

    apiPaginatedRequest<PermissionListItem>(`/erp/permissions${query}`, {
      signal: controller.signal,
    })
      .then((result) => {
        setItems(result.items);
        setPagination(result.pagination);
      })
      .catch((reason: unknown) => {
        if (controller.signal.aborted) return;
        setError(reason instanceof ApiClientError
          ? reason
          : new ApiClientError("No fue posible cargar los permisos.", "INTERNAL_ERROR", 500));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [capability, module, page, pageSize, reload, search, sort?.desc, sort?.id]);

  const closeDetail = useCallback(() => setSelected(null), []);
  const columns = useMemo<ColumnDef<PermissionListItem>[]>(() => [
    {
      id: "role",
      accessorFn: (row) => row.role.name,
      header: "Rol",
      cell: ({ row }) => <strong className="table-primary-text">{row.original.role.name}</strong>,
    },
    {
      id: "module",
      accessorFn: (row) => row.moduleLabel,
      header: "Módulo",
      cell: ({ row }) => (
        <div className="table-module-cell">
          <strong>{row.original.moduleLabel}</strong>
          <span>{row.original.module}</span>
        </div>
      ),
    },
    {
      id: "read",
      header: "Lectura",
      enableSorting: false,
      cell: ({ row }) => <StatusBadge active={row.original.canRead} />,
    },
    {
      id: "write",
      header: "Escritura",
      enableSorting: false,
      cell: ({ row }) => <StatusBadge active={row.original.canWrite} />,
    },
    {
      id: "delete",
      header: "Eliminación",
      enableSorting: false,
      cell: ({ row }) => <StatusBadge active={row.original.canDelete} />,
    },
    {
      id: "actions",
      header: "Acciones",
      enableSorting: false,
      cell: ({ row }) => (
        <button className="table-action-button" type="button" onClick={() => setSelected(row.original)}>
          <Eye aria-hidden="true" /> Ver detalle
        </button>
      ),
    },
  ], []);

  const handleSortingChange: OnChangeFn<SortingState> = (updater) => {
    setSorting((current) => typeof updater === "function" ? updater(current) : updater);
    setPage(1);
  };

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  }

  return (
    <section className="permission-explorer" aria-labelledby="permissions-title">
      <header className="permission-explorer-heading">
        <div>
          <p className="eyebrow">Infraestructura CRUD en operación</p>
          <h2 id="permissions-title">Matriz de permisos</h2>
          <p>Consulta paginada desde PostgreSQL. Esta vista no modifica asignaciones.</p>
        </div>
        <span><ShieldCheck aria-hidden="true" /> Solo administradores</span>
      </header>

      <div className="table-toolbar">
        <form className="table-search" role="search" onSubmit={submitSearch}>
          <label className="sr-only" htmlFor="permission-search">Buscar permisos</label>
          <Search aria-hidden="true" />
          <input
            id="permission-search"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="Buscar rol o módulo"
          />
          <button type="submit">Buscar</button>
        </form>

        <div className="table-filters">
          <Filter aria-hidden="true" />
          <label>
            <span className="sr-only">Filtrar por módulo</span>
            <select
              value={module}
              onChange={(event) => {
                setModule(event.target.value as ErpModuleCode | "");
                setPage(1);
              }}
            >
              <option value="">Todos los módulos</option>
              {context.navigation.map((item) => (
                <option value={item.module} key={item.module}>{item.label}</option>
              ))}
            </select>
          </label>
          <label>
            <span className="sr-only">Filtrar por capacidad</span>
            <select
              value={capability}
              onChange={(event) => {
                setCapability(event.target.value as PermissionAction | "");
                setPage(1);
              }}
            >
              <option value="">Todas las capacidades</option>
              {CAPABILITY_OPTIONS.map((option) => (
                <option value={option.value} key={option.value}>{option.label}</option>
              ))}
            </select>
          </label>
          <label>
            <span className="sr-only">Registros por página</span>
            <select
              value={pageSize}
              onChange={(event) => {
                setPageSize(Number(event.target.value));
                setPage(1);
              }}
            >
              <option value={10}>10 por página</option>
              <option value={20}>20 por página</option>
              <option value={50}>50 por página</option>
            </select>
          </label>
        </div>
      </div>

      {error ? (
        <div className="table-error" role="alert">
          <div>
            <strong>{error.message}</strong>
            <span>Código {error.code}{error.requestId ? ` · Solicitud ${error.requestId}` : ""}</span>
          </div>
          <button type="button" onClick={() => setReload((value) => value + 1)}>
            <RefreshCw aria-hidden="true" /> Reintentar
          </button>
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={items}
          emptyTitle="No hay permisos que coincidan"
          emptyDescription="Cambie la búsqueda o los filtros para ver otros resultados."
          getRowId={(row) => row.id}
          loading={loading}
          onPageChange={setPage}
          onSortingChange={handleSortingChange}
          pagination={pagination}
          sorting={sorting}
        />
      )}

      <DetailModal
        open={selected !== null}
        onClose={closeDetail}
        title="Detalle del permiso"
        description="Asignación efectiva almacenada en PostgreSQL."
        footer={<button className="button button-primary" type="button" onClick={closeDetail}>Cerrar</button>}
      >
        {selected && (
          <dl className="permission-detail-list">
            <div><dt>Rol</dt><dd>{selected.role.name}</dd></div>
            <div><dt>Módulo</dt><dd>{selected.moduleLabel}</dd></div>
            <div><dt>Código</dt><dd><code>{selected.module}</code></dd></div>
            <div><dt>Lectura</dt><dd><StatusBadge active={selected.canRead} /></dd></div>
            <div><dt>Escritura</dt><dd><StatusBadge active={selected.canWrite} /></dd></div>
            <div><dt>Eliminación</dt><dd><StatusBadge active={selected.canDelete} /></dd></div>
          </dl>
        )}
      </DetailModal>
    </section>
  );
}
