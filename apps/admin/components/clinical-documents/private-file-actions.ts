import { apiBinaryRequest } from "../../lib/api-client";

export interface PrivateFilePreview {
  kind: "document" | "image";
  title: string;
  url: string;
}

export function formatFileSize(bytes: number | null): string {
  if (bytes === null) return "Sin tamaño registrado";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export async function loadPrivatePreview(path: string, title: string): Promise<PrivateFilePreview> {
  const response = await apiBinaryRequest(path);
  return {
    kind: response.mimeType.startsWith("image/") ? "image" : "document",
    title,
    url: URL.createObjectURL(response.blob),
  };
}

export async function downloadPrivateFile(path: string, fallbackName: string): Promise<void> {
  const response = await apiBinaryRequest(path);
  const url = URL.createObjectURL(response.blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = response.fileName || fallbackName;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
}

export function releasePrivatePreview(preview: PrivateFilePreview | null): void {
  if (preview?.url.startsWith("blob:")) URL.revokeObjectURL(preview.url);
}
