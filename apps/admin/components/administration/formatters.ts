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

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("es-GT", { style: "currency", currency: "GTQ" }).format(value);
}
