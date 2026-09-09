"use client";

import type { WebPublicationState } from "@ami/contracts";

const PUBLICATION_LABELS: Record<WebPublicationState, string> = {
  draft: "Borrador",
  scheduled: "Programado",
  active: "Vigente",
  expired: "Vencido",
};

export function PublicationBadge({ state }: Readonly<{ state: WebPublicationState }>) {
  return <span className={`publication-badge publication-${state}`}>{PUBLICATION_LABELS[state]}</span>;
}

export function formatPublicationDate(value: string): string {
  return new Intl.DateTimeFormat("es-GT", { dateStyle: "medium", timeZone: "America/Guatemala" })
    .format(new Date(`${value}T12:00:00-06:00`));
}

export const mediaUrl = /^(\/[^\s]*|https?:\/\/[^\s]+)$/i;
