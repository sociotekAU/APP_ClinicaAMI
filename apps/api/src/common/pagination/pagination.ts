import type { PageMeta } from "@ami/contracts";

export function paginationOffset(page: number, pageSize: number): number {
  return (page - 1) * pageSize;
}

export function createPageMeta(
  page: number,
  pageSize: number,
  totalItems: number,
): PageMeta {
  return {
    page,
    pageSize,
    totalItems,
    totalPages: Math.ceil(totalItems / pageSize),
  };
}
