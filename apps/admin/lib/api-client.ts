import type {
  ApiError,
  ApiErrorCode,
  ApiErrorDetail,
  ApiSuccess,
  PaginatedData,
  PaginatedResponse,
} from "@ami/contracts";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:4000/api/v1";

export class ApiClientError extends Error {
  constructor(
    message: string,
    readonly code: ApiErrorCode,
    readonly status: number,
    readonly requestId?: string,
    readonly details?: ApiErrorDetail[],
  ) {
    super(message);
    this.name = "ApiClientError";
  }
}

async function parseError(response: Response): Promise<ApiClientError> {
  try {
    const body = (await response.json()) as ApiError;
    return new ApiClientError(
      body.error?.message ?? "No fue posible completar la solicitud.",
      body.error?.code ?? "HTTP_ERROR",
      response.status,
      body.meta?.requestId,
      body.error?.details,
    );
  } catch {
    return new ApiClientError(
      "No fue posible completar la solicitud.",
      "NETWORK_RESPONSE_ERROR",
      response.status,
    );
  }
}

async function refreshSession(): Promise<boolean> {
  try {
    const response = await fetch(`${API_URL}/auth/refresh`, {
      method: "POST",
      credentials: "include",
      cache: "no-store",
    });
    return response.ok;
  } catch {
    return false;
  }
}

async function requestResponse(
  path: string,
  init: RequestInit,
  retryAfterRefresh: boolean,
): Promise<Response> {
  let response: Response;
  const isFormData = typeof FormData !== "undefined" && init.body instanceof FormData;

  try {
    response = await fetch(`${API_URL}${path}`, {
      ...init,
      cache: "no-store",
      credentials: "include",
      headers: {
        ...(init.body && !isFormData ? { "content-type": "application/json" } : {}),
        ...init.headers,
      },
    });
  } catch {
    throw new ApiClientError(
      "No se pudo establecer comunicación con el servidor.",
      "NETWORK_UNAVAILABLE",
      0,
    );
  }

  if (response.status === 401 && retryAfterRefresh && !path.startsWith("/auth/login")) {
    if (await refreshSession()) {
      return requestResponse(path, init, false);
    }
  }

  if (!response.ok) throw await parseError(response);
  return response;
}

function responseFilename(response: Response): string | null {
  const disposition = response.headers.get("content-disposition");
  if (!disposition) return null;
  const encoded = disposition.match(/filename\*=UTF-8''([^;]+)/i)?.[1];
  if (encoded) {
    try { return decodeURIComponent(encoded); }
    catch { return encoded; }
  }
  return disposition.match(/filename="([^"]+)"/i)?.[1] ?? null;
}

export async function apiBinaryRequest(path: string): Promise<{
  blob: Blob;
  fileName: string | null;
  mimeType: string;
  sha256: string | null;
}> {
  const response = await requestResponse(path, {}, true);
  return {
    blob: await response.blob(),
    fileName: responseFilename(response),
    mimeType: response.headers.get("content-type") ?? "application/octet-stream",
    sha256: response.headers.get("x-content-sha256"),
  };
}

export async function apiRequest<T>(
  path: string,
  init: RequestInit = {},
  retryAfterRefresh = true,
): Promise<T> {
  const response = await requestResponse(path, init, retryAfterRefresh);
  const body = (await response.json()) as ApiSuccess<T>;
  return body.data;
}

export async function apiPaginatedRequest<T>(
  path: string,
  init: RequestInit = {},
): Promise<PaginatedData<T>> {
  const response = await requestResponse(path, init, true);
  const body = (await response.json()) as PaginatedResponse<T>;
  return {
    items: body.data,
    pagination: body.pagination,
  };
}
