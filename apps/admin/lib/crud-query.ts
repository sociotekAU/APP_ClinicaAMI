import type { ApiErrorDetail } from "@ami/contracts";

type QueryValue = boolean | number | string | null | undefined;

export function buildListQuery(values: Record<string, QueryValue>): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(values)) {
    if (value === undefined || value === null || value === "") continue;
    query.set(key, String(value));
  }
  const serialized = query.toString();
  return serialized ? `?${serialized}` : "";
}

export function toFieldErrorMap(details: ApiErrorDetail[] | undefined): Record<string, string> {
  if (!details) return {};
  return details.reduce<Record<string, string>>((errors, detail) => {
    if (detail.field && !errors[detail.field]) errors[detail.field] = detail.message;
    return errors;
  }, {});
}
