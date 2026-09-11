import { describe, expect, it } from "vitest";
import { formatPublicationDate, safePublicationColor, safePublicationMediaUrl } from "./publication-presentation";

describe("publication presentation", () => {
  it("acepta únicamente imágenes públicas seguras", () => {
    expect(safePublicationMediaUrl("/MEDIA/promocion.jpg")).toBe("/MEDIA/promocion.jpg");
    expect(safePublicationMediaUrl("https://images.example.com/promo.jpg")).toBe("https://images.example.com/promo.jpg");
    expect(safePublicationMediaUrl("javascript:alert(1)")).toBeNull();
    expect(safePublicationMediaUrl("//images.example.com/promo.jpg")).toBeNull();
    expect(safePublicationMediaUrl("https://images.example.com/promo con espacio.jpg")).toBeNull();
  });

  it("valida colores y presenta fechas sin alterar el día", () => {
    expect(safePublicationColor("#0b4c81", "#ffffff")).toBe("#0b4c81");
    expect(safePublicationColor("red", "#ffffff")).toBe("#ffffff");
    expect(formatPublicationDate("2026-09-07")).toContain("7");
    expect(formatPublicationDate("2026-09-07")).toContain("septiembre");
  });
});
