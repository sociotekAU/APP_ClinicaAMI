import { describe, expect, it } from "vitest";
import { formatCurrency, formatDate, formatDateTime, formatDateTimeWithWeekday, formatWeekday } from "./formatters";

describe("administration formatters", () => {
  it("formatea montos en quetzales", () => {
    expect(formatCurrency(125.5)).toContain("125.50");
  });

  it("conserva textos explícitos para fechas ausentes", () => {
    expect(formatDate(null)).toBe("Sin registro");
    expect(formatDateTime(null)).toBe("Nunca");
  });

  it("incluye el día de la semana en fechas clínicas", () => {
    expect(formatDateTimeWithWeekday("2026-09-08T14:30:00-06:00").toLowerCase()).toContain("martes");
    expect(formatWeekday("2026-09-08T14:30:00-06:00").toLowerCase()).toContain("martes");
  });
});
