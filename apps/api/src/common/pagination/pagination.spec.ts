import { describe, expect, it } from "vitest";
import { createPageMeta, paginationOffset } from "./pagination";

describe("server pagination", () => {
  it("calcula desplazamiento y páginas totales", () => {
    expect(paginationOffset(3, 10)).toBe(20);
    expect(createPageMeta(3, 10, 29)).toEqual({
      page: 3,
      pageSize: 10,
      totalItems: 29,
      totalPages: 3,
    });
  });

  it("representa una colección vacía sin páginas ficticias", () => {
    expect(createPageMeta(1, 10, 0).totalPages).toBe(0);
  });
});
