import type { ApiSuccess, PublicWebContent } from "@ami/contracts";
import "server-only";

const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:4000/api/v1")
  .replace(/\/+$/, "");

function isPublicWebContent(value: unknown): value is PublicWebContent {
  if (!value || typeof value !== "object") return false;
  const content = value as Partial<PublicWebContent>;
  return Array.isArray(content.services)
    && Array.isArray(content.professionals)
    && Array.isArray(content.gallery)
    && Array.isArray(content.promotions)
    && Array.isArray(content.announcements);
}

export async function getPublicWebContent(): Promise<PublicWebContent | null> {
  try {
    const response = await fetch(`${API_URL}/public/web-content`, {
      headers: { accept: "application/json" },
      next: { revalidate: 60 },
      signal: AbortSignal.timeout(5_000),
    });
    if (!response.ok) return null;

    const body = (await response.json()) as Partial<ApiSuccess<unknown>>;
    return isPublicWebContent(body.data) ? body.data : null;
  } catch {
    return null;
  }
}
