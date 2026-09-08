"use client";

import type { PageMeta } from "@ami/contracts";
import type { OnChangeFn, SortingState } from "@tanstack/react-table";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ApiClientError, apiPaginatedRequest } from "../../lib/api-client";
import { buildListQuery } from "../../lib/crud-query";

const EMPTY_PAGINATION: PageMeta = {
  page: 1,
  pageSize: 10,
  totalItems: 0,
  totalPages: 0,
};

interface ResourceListOptions {
  defaultStatus?: string;
  defaultSort: string;
  endpoint: string;
  extraQuery?: Record<string, number | string | undefined>;
  includeStatus?: boolean;
}

export function useResourceList<T>({ defaultSort, defaultStatus = "all", endpoint, extraQuery = {}, includeStatus = true }: ResourceListOptions) {
  const [items, setItems] = useState<T[]>([]);
  const [pagination, setPagination] = useState<PageMeta>(EMPTY_PAGINATION);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSizeState] = useState(10);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatusState] = useState(defaultStatus);
  const [sorting, setSortingState] = useState<SortingState>([{ id: defaultSort, desc: false }]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ApiClientError | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const extraQueryKey = useMemo(() => JSON.stringify(extraQuery), [extraQuery]);
  const sort = sorting[0];

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    const query = buildListQuery({
      page,
      pageSize,
      search,
      ...(includeStatus ? { status } : {}),
      sortBy: sort?.id ?? defaultSort,
      sortDirection: sort?.desc ? "desc" : "asc",
      ...(JSON.parse(extraQueryKey) as Record<string, number | string | undefined>),
    });

    apiPaginatedRequest<T>(`${endpoint}${query}`, { signal: controller.signal })
      .then((result) => {
        setItems(result.items);
        setPagination(result.pagination);
        if (result.pagination.totalPages > 0 && page > result.pagination.totalPages) {
          setPage(result.pagination.totalPages);
        }
      })
      .catch((reason: unknown) => {
        if (controller.signal.aborted) return;
        setError(reason instanceof ApiClientError
          ? reason
          : new ApiClientError("No fue posible cargar los registros.", "INTERNAL_ERROR", 500));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [defaultSort, endpoint, extraQueryKey, includeStatus, page, pageSize, reloadToken, search, sort?.desc, sort?.id, status]);

  const submitSearch = useCallback(() => {
    setPage(1);
    setSearch(searchInput.trim());
  }, [searchInput]);
  const reload = useCallback(() => setReloadToken((value) => value + 1), []);
  const setPageSize = useCallback((value: number) => {
    setPageSizeState(value);
    setPage(1);
  }, []);
  const setStatus = useCallback((value: string) => {
    setStatusState(value);
    setPage(1);
  }, []);
  const setSorting: OnChangeFn<SortingState> = useCallback((updater) => {
    setSortingState((current) => typeof updater === "function" ? updater(current) : updater);
    setPage(1);
  }, []);

  return {
    error,
    items,
    loading,
    pageSize,
    pagination,
    reload,
    searchInput,
    setPage,
    setPageSize,
    setSearchInput,
    setSorting,
    setStatus,
    sorting,
    status,
    submitSearch,
  };
}

export type ResourceListState<T> = ReturnType<typeof useResourceList<T>>;
