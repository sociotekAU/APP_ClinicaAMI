"use client";

import type { DashboardMetricCode } from "@ami/contracts";
import {
  AlertTriangle,
  ArrowRight,
  CalendarCheck2,
  ClipboardCheck,
  FlaskConical,
  ReceiptText,
  Stethoscope,
  UsersRound,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { getModuleIcon, useErpContext } from "./erp-shell";

const METRIC_ICONS: Record<DashboardMetricCode, LucideIcon> = {
  active_patients: UsersRound,
  today_appointments: CalendarCheck2,
  active_professionals: Stethoscope,
  pending_lab_orders: FlaskConical,
  low_stock_items: AlertTriangle,
  today_invoices: ReceiptText,
};

export function DashboardOverview() {
  const context = useErpContext();
  const firstName = context.user.name.split(" ").find(Boolean) ?? context.user.name;
  const formattedDate = new Intl.DateTimeFormat("es-GT", {
    dateStyle: "full",
    timeZone: "America/Guatemala",
  }).format(new Date());

  return (
    <div className="erp-dashboard">
      <section className="dashboard-welcome">
        <div>
          <p className="eyebrow">{formattedDate}</p>
          <h2>Buen día, {firstName}</h2>
          <p>Este resumen muestra únicamente la información habilitada para su rol.</p>
        </div>
        <div className="dashboard-access-badge">
          <ClipboardCheck aria-hidden="true" />
          <div>
            <strong>{context.navigation.length} módulos</strong>
            <span>disponibles para {context.user.role.name}</span>
          </div>
        </div>
      </section>

      <section aria-labelledby="metricas-title">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Datos en tiempo real</p>
            <h2 id="metricas-title">Panorama de hoy</h2>
          </div>
        </div>
        <div className="metric-grid">
          {context.metrics.map((metric) => {
            const Icon = METRIC_ICONS[metric.code];
            return (
              <article className="metric-card" key={metric.code}>
                <span className="metric-icon"><Icon aria-hidden="true" /></span>
                <div>
                  <strong>{metric.value.toLocaleString("es-GT")}</strong>
                  <h3>{metric.label}</h3>
                  <p>{metric.description}</p>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section aria-labelledby="modulos-title">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Accesos autorizados</p>
            <h2 id="modulos-title">Módulos del sistema</h2>
          </div>
          <span>{context.user.role.name}</span>
        </div>
        <div className="module-grid">
          {context.navigation.map((item) => {
            const Icon = getModuleIcon(item.module);
            return (
              <Link className="module-card" href={item.href} key={item.module}>
                <span className="module-card-icon"><Icon aria-hidden="true" /></span>
                <div>
                  <span className="module-section">{item.section}</span>
                  <h3>{item.label}</h3>
                  <p>{item.description}</p>
                </div>
                <ArrowRight aria-hidden="true" />
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}
