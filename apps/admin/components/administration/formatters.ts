export function formatDate(value: string | null): string {
  if (!value) return "Sin registro";
  return new Intl.DateTimeFormat("es-GT", { dateStyle: "medium" }).format(new Date(value));
}

export function formatDateTime(value: string | null): string {
  if (!value) return "Nunca";
  return new Intl.DateTimeFormat("es-GT", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function formatDateTimeWithWeekday(value: string | null): string {
  if (!value) return "Nunca";
  const formatted = new Intl.DateTimeFormat("es-GT", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
  return `${formatted.charAt(0).toUpperCase()}${formatted.slice(1)}`;
}

export function formatWeekday(value: string | null): string {
  if (!value) return "Seleccione la fecha para consultar el día.";
  return `Día seleccionado: ${formatWeekdayName(value)}.`;
}

export function formatWeekdayName(value: string | null): string {
  if (!value) return "Sin día";
  const formatted = new Intl.DateTimeFormat("es-GT", { weekday: "long" }).format(new Date(value));
  return `${formatted.charAt(0).toUpperCase()}${formatted.slice(1)}`;
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("es-GT", { style: "currency", currency: "GTQ" }).format(value);
}
