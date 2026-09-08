import { describe, expect, it } from "vitest";
import { formatCurrency, formatDate, formatDateTime } from "./formatters";

describe("administration formatters", () => {
  it("formatea montos en quetzales", () => {
    expect(formatCurrency(125.5)).toContain("125.50");
  });

  it("conserva textos explícitos para fechas ausentes", () => {
    expect(formatDate(null)).toBe("Sin registro");
    expect(formatDateTime(null)).toBe("Nunca");
  });
});
