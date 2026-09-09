"use client";

import type { CashSummary, InvoicePaymentMethod } from "@ami/contracts";
import { Banknote, CalendarDays, CreditCard, Landmark, RefreshCw, ReceiptText } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { ApiClientError, apiRequest } from "../../lib/api-client";
import { formatCurrency } from "../administration/formatters";

const PAYMENT_LABELS: Record<InvoicePaymentMethod, string> = { efectivo: "Efectivo", tarjeta: "Tarjeta", transferencia: "Transferencia" };

function todayInGuatemala(): string {
  return new Intl.DateTimeFormat("en-CA", { year: "numeric", month: "2-digit", day: "2-digit", timeZone: "America/Guatemala" }).format(new Date());
}

export function CashSummaryPanel() {
  const [date, setDate] = useState(todayInGuatemala);
  const [summary, setSummary] = useState<CashSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ApiClientError | null>(null);
  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try { setSummary(await apiRequest<CashSummary>(`/billing/cash-summary?date=${encodeURIComponent(date)}`)); }
    catch (reason) { setError(reason instanceof ApiClientError ? reason : new ApiClientError("No fue posible cargar el resumen.", "INTERNAL_ERROR", 500)); }
    finally { setLoading(false); }
  }, [date]);
  useEffect(() => { void load(); }, [load]);
  const icons = { efectivo: Banknote, tarjeta: CreditCard, transferencia: Landmark };
  return (
    <section className="resource-panel" aria-labelledby="cash-summary-title">
      <header className="resource-panel-heading"><div><h3 id="cash-summary-title">Resumen diario de caja</h3><p>Solo incluye facturas pagadas; las anuladas se muestran por separado.</p></div><label className="cash-date-filter"><span>Fecha de operación</span><input type="date" value={date} onChange={(event) => setDate(event.target.value)} /></label></header>
      {error ? <div className="table-error" role="alert"><div><strong>{error.message}</strong><span>Código {error.code}</span></div><button type="button" onClick={() => { void load(); }}><RefreshCw aria-hidden="true" /> Reintentar</button></div> : loading ? <p className="resource-loading">Calculando movimientos de caja…</p> : summary && <>
        <div className="metric-grid billing-metrics">
          <article className="metric-card"><span><Banknote aria-hidden="true" /></span><div><p>Total pagado</p><strong>{formatCurrency(summary.paidTotal)}</strong></div></article>
          <article className="metric-card"><span><ReceiptText aria-hidden="true" /></span><div><p>Facturas pagadas</p><strong>{summary.paidInvoiceCount}</strong></div></article>
          <article className="metric-card"><span><CalendarDays aria-hidden="true" /></span><div><p>Facturas anuladas</p><strong>{summary.annulledInvoiceCount}</strong></div></article>
        </div>
        <div className="cash-method-breakdown"><h4>Desglose por forma de pago</h4>{summary.byPaymentMethod.length === 0 ? <p>No hay facturas pagadas en la fecha seleccionada.</p> : <div className="metric-grid">{summary.byPaymentMethod.map((entry) => { const Icon = icons[entry.method]; return <article className="metric-card" key={entry.method}><span><Icon aria-hidden="true" /></span><div><p>{PAYMENT_LABELS[entry.method]} · {entry.invoiceCount} factura{entry.invoiceCount === 1 ? "" : "s"}</p><strong>{formatCurrency(entry.total)}</strong></div></article>; })}</div>}</div>
      </>}
    </section>
  );
}
