"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { Filter, Plus, RefreshCw, Search } from "lucide-react";
import type { FormEvent, ReactNode } from "react";
import { DataTable } from "../crud/data-table";
import type { ResourceListState } from "./use-resource-list";

interface ResourcePanelProps<T> {
  canWrite: boolean;
  columns: ColumnDef<T>[];
  description: string;
  emptyDescription: string;
  emptyTitle: string;
  extraFilters?: ReactNode;
  getRowId: (row: T) => string;
  list: ResourceListState<T>;
  onCreate: () => void;
  searchPlaceholder: string;
  statusOptions?: Array<{ label: string; value: string }>;
  title: string;
}

const DEFAULT_STATUS_OPTIONS = [
  { value: "all", label: "Todos los estados" },
  { value: "active", label: "Activos" },
  { value: "inactive", label: "Inactivos" },
];

export function ResourcePanel<T>({
  canWrite,
  columns,
  description,
  emptyDescription,
  emptyTitle,
  extraFilters,
  getRowId,
  list,
  onCreate,
  searchPlaceholder,
  statusOptions = DEFAULT_STATUS_OPTIONS,
  title,
}: ResourcePanelProps<T>) {
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    list.submitSearch();
  }

  return (
    <section className="resource-panel" aria-labelledby={`resource-${title.replaceAll(" ", "-").toLowerCase()}`}>
      <header className="resource-panel-heading">
        <div>
          <h3 id={`resource-${title.replaceAll(" ", "-").toLowerCase()}`}>{title}</h3>
          <p>{description}</p>
        </div>
        {canWrite && (
          <button className="button button-primary button-compact" type="button" onClick={onCreate}>
            <Plus aria-hidden="true" /> Nuevo registro
          </button>
        )}
      </header>

      <div className="table-toolbar">
        <form className="table-search" role="search" onSubmit={submit}>
          <label className="sr-only" htmlFor={`search-${title}`}>Buscar {title.toLowerCase()}</label>
          <Search aria-hidden="true" />
          <input
            id={`search-${title}`}
            value={list.searchInput}
            onChange={(event) => list.setSearchInput(event.target.value)}
            placeholder={searchPlaceholder}
          />
          <button type="submit">Buscar</button>
        </form>
        <div className="table-filters">
          <Filter aria-hidden="true" />
          {extraFilters}
          {statusOptions.length > 0 && <label>
            <span className="sr-only">Filtrar por estado</span>
            <select value={list.status} onChange={(event) => list.setStatus(event.target.value)}>
              {statusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>}
          <label>
            <span className="sr-only">Registros por página</span>
            <select value={list.pageSize} onChange={(event) => list.setPageSize(Number(event.target.value))}>
              <option value={10}>10 por página</option>
              <option value={20}>20 por página</option>
              <option value={50}>50 por página</option>
            </select>
          </label>
        </div>
      </div>

      {list.error ? (
        <div className="table-error" role="alert">
          <div>
            <strong>{list.error.message}</strong>
            <span>Código {list.error.code}{list.error.requestId ? ` · Solicitud ${list.error.requestId}` : ""}</span>
          </div>
          <button type="button" onClick={list.reload}>
            <RefreshCw aria-hidden="true" /> Reintentar
          </button>
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={list.items}
          emptyTitle={emptyTitle}
          emptyDescription={emptyDescription}
          getRowId={getRowId}
          loading={list.loading}
          onPageChange={list.setPage}
          onSortingChange={list.setSorting}
          pagination={list.pagination}
          sorting={list.sorting}
        />
      )}
    </section>
  );
}
