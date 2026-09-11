const HEX_COLOR = /^#[0-9a-f]{6}$/i;

const DATE_FORMAT = new Intl.DateTimeFormat("es-GT", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

export function safePublicationColor(value: string, fallback: string): string {
  return HEX_COLOR.test(value) ? value : fallback;
}

export function safePublicationMediaUrl(value: string | null): string | null {
  if (!value) return null;
  if (/\s/.test(value)) return null;
  if (/^\/(?!\/)[^\s]*$/.test(value)) return value;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:" ? value : null;
  } catch {
    return null;
  }
}

export function formatPublicationDate(value: string): string {
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? value : DATE_FORMAT.format(date);
}
