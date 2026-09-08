"use client";

import type { PageMeta } from "@ami/contracts";
import {
  flexRender,
  getCoreRowModel,
  type ColumnDef,
  type OnChangeFn,
  type SortingState,
  useReactTable,
} from "@tanstack/react-table";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronFirst,
  ChevronLast,
  ChevronLeft,
  ChevronRight,
  LoaderCircle,
} from "lucide-react";

interface DataTableProps<TData> {
  columns: ColumnDef<TData>[];
  data: TData[];
  emptyDescription: string;
  emptyTitle: string;
  getRowId: (row: TData) => string;
  loading?: boolean;
  onPageChange: (page: number) => void;
  onSortingChange: OnChangeFn<SortingState>;
  pagination: PageMeta;
  sorting: SortingState;
}

export function DataTable<TData>({
  columns,
  data,
  emptyDescription,
  emptyTitle,
  getRowId,
  loading = false,
  onPageChange,
  onSortingChange,
  pagination,
  sorting,
}: DataTableProps<TData>) {
  const table = useReactTable({
    columns,
    data,
    getCoreRowModel: getCoreRowModel(),
    getRowId,
    manualPagination: true,
    manualSorting: true,
    onSortingChange,
    pageCount: pagination.totalPages,
    state: {
      pagination: {
        pageIndex: Math.max(0, pagination.page - 1),
        pageSize: pagination.pageSize,
      },
      sorting,
    },
  });
  const firstItem = pagination.totalItems === 0
    ? 0
    : (pagination.page - 1) * pagination.pageSize + 1;
  const lastItem = Math.min(pagination.page * pagination.pageSize, pagination.totalItems);
  const previousDisabled = loading || pagination.page <= 1;
  const nextDisabled = loading || pagination.totalPages === 0 || pagination.page >= pagination.totalPages;

  return (
    <div className="data-table-shell" aria-busy={loading}>
      <div className="data-table-scroll">
        <table className="data-table">
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  const sorted = header.column.getIsSorted();
                  return (
                    <th
                      key={header.id}
                      scope="col"
                      aria-sort={sorted === "asc" ? "ascending" : sorted === "desc" ? "descending" : undefined}
                    >
                      {header.isPlaceholder ? null : header.column.getCanSort() ? (
                        <button type="button" onClick={header.column.getToggleSortingHandler()}>
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          {sorted === "asc"
                            ? <ArrowUp aria-hidden="true" />
                            : sorted === "desc"
                              ? <ArrowDown aria-hidden="true" />
                              : <ArrowUpDown aria-hidden="true" />}
                        </button>
                      ) : flexRender(header.column.columnDef.header, header.getContext())}
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody>
            {loading && data.length === 0 ? (
              <tr>
                <td className="table-state" colSpan={columns.length}>
                  <LoaderCircle className="spin" aria-hidden="true" /> Cargando registros…
                </td>
              </tr>
            ) : table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <tr key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td className="table-empty" colSpan={columns.length}>
                  <strong>{emptyTitle}</strong>
                  <span>{emptyDescription}</span>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="data-table-footer">
        <p aria-live="polite">
          Mostrando <strong>{firstItem}–{lastItem}</strong> de <strong>{pagination.totalItems}</strong>
        </p>
        <div className="pagination-controls" aria-label="Paginación">
          <button type="button" disabled={previousDisabled} onClick={() => onPageChange(1)} aria-label="Primera página">
            <ChevronFirst aria-hidden="true" />
          </button>
          <button type="button" disabled={previousDisabled} onClick={() => onPageChange(pagination.page - 1)} aria-label="Página anterior">
            <ChevronLeft aria-hidden="true" />
          </button>
          <span>Página {pagination.totalPages === 0 ? 0 : pagination.page} de {pagination.totalPages}</span>
          <button type="button" disabled={nextDisabled} onClick={() => onPageChange(pagination.page + 1)} aria-label="Página siguiente">
            <ChevronRight aria-hidden="true" />
          </button>
          <button type="button" disabled={nextDisabled} onClick={() => onPageChange(pagination.totalPages)} aria-label="Última página">
            <ChevronLast aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
}
