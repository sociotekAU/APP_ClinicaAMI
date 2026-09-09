export interface PrintField {
  label: string;
  value: string;
}

export interface PrintTable {
  columns: string[];
  rows: string[][];
  title: string;
}

export interface PrintDocument {
  fields: PrintField[];
  footer?: string;
  subtitle?: string;
  tables?: PrintTable[];
  title: string;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function buildPrintDocumentHtml(document: PrintDocument): string {
  const fields = document.fields.map((field) => `
    <div class="field"><dt>${escapeHtml(field.label)}</dt><dd>${escapeHtml(field.value)}</dd></div>`).join("");
  const tables = (document.tables ?? []).map((table) => `
    <section>
      <h2>${escapeHtml(table.title)}</h2>
      <table>
        <thead><tr>${table.columns.map((column) => `<th>${escapeHtml(column)}</th>`).join("")}</tr></thead>
        <tbody>${table.rows.map((row) => `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join("")}</tr>`).join("")}</tbody>
      </table>
    </section>`).join("");

  return `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(document.title)}</title>
  <style>
    @page { margin: 16mm; }
    * { box-sizing: border-box; }
    body { margin: 0; color: #102538; font-family: Arial, sans-serif; font-size: 12px; line-height: 1.45; }
    header { padding-bottom: 14px; border-bottom: 3px solid #3368a0; }
    h1 { margin: 0; color: #174d7b; font-size: 24px; }
    header p { margin: 4px 0 0; color: #526879; }
    dl { display: grid; grid-template-columns: 1fr 1fr; gap: 0; margin: 18px 0; border: 1px solid #cdd9e2; }
    .field { min-height: 58px; padding: 9px 11px; border-bottom: 1px solid #dce5eb; }
    .field:nth-child(odd) { border-right: 1px solid #dce5eb; }
    dt { color: #607383; font-size: 10px; font-weight: 700; text-transform: uppercase; }
    dd { margin: 4px 0 0; font-weight: 700; white-space: pre-wrap; }
    section { margin-top: 20px; break-inside: avoid; }
    h2 { margin: 0 0 8px; color: #174d7b; font-size: 15px; }
    table { width: 100%; border-collapse: collapse; }
    th, td { padding: 7px; border: 1px solid #cdd9e2; text-align: left; vertical-align: top; }
    th { color: #174d7b; background: #eef5fa; }
    footer { margin-top: 24px; padding-top: 8px; border-top: 1px solid #cdd9e2; color: #607383; font-size: 10px; }
    @media print { body { print-color-adjust: exact; -webkit-print-color-adjust: exact; } }
  </style>
</head>
<body>
  <header><h1>${escapeHtml(document.title)}</h1>${document.subtitle ? `<p>${escapeHtml(document.subtitle)}</p>` : ""}</header>
  <dl>${fields}</dl>
  ${tables}
  <footer>${escapeHtml(document.footer ?? "Alternativa Médica Integral A.M.I.")}</footer>
</body>
</html>`;
}

export function openPrintDocument(document: PrintDocument): boolean {
  try {
    const frame = window.document.createElement("iframe");
    frame.className = "print-document-frame";
    frame.title = `Impresión: ${document.title}`;
    window.document.body.append(frame);
    const printWindow = frame.contentWindow;
    if (!printWindow) {
      frame.remove();
      return false;
    }
    printWindow.document.open();
    printWindow.document.write(buildPrintDocumentHtml(document));
    printWindow.document.close();
    window.setTimeout(() => {
      printWindow.focus();
      printWindow.print();
    }, 100);
    window.setTimeout(() => frame.remove(), 60_000);
    return true;
  } catch {
    return false;
  }
}
