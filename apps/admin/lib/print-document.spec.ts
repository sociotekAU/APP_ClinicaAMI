import { describe, expect, it } from "vitest";
import { buildPrintDocumentHtml } from "./print-document";

describe("buildPrintDocumentHtml", () => {
  it("escapa contenido clínico y conserva tablas imprimibles", () => {
    const html = buildPrintDocumentHtml({
      title: "Receta <1>",
      fields: [{ label: "Paciente", value: "Nery & Díaz" }],
      tables: [{ title: "Medicamentos", columns: ["Nombre"], rows: [["Aspirina <script>"]] }],
    });
    expect(html).toContain("Receta &lt;1&gt;");
    expect(html).toContain("Nery &amp; Díaz");
    expect(html).toContain("Aspirina &lt;script&gt;");
    expect(html).not.toContain("<script>");
  });
});
