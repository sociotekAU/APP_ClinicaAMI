import { HttpStatus } from "@nestjs/common";
import type { ApiErrorCode } from "@ami/contracts";

interface DatabaseErrorLike {
  code?: unknown;
}

export interface ClassifiedError {
  code: ApiErrorCode;
  message: string;
  status: HttpStatus;
}

const DATABASE_ERROR_CATALOG: Record<string, ClassifiedError> = {
  P2002: {
    code: "RESOURCE_CONFLICT",
    message: "Ya existe un registro con los mismos datos únicos.",
    status: HttpStatus.CONFLICT,
  },
  P2003: {
    code: "RESOURCE_IN_USE",
    message: "El registro está relacionado con otra información y no puede modificarse de esa forma.",
    status: HttpStatus.CONFLICT,
  },
  P2000: {
    code: "VALIDATION_ERROR",
    message: "Uno de los valores supera la longitud permitida.",
    status: HttpStatus.BAD_REQUEST,
  },
  P2004: {
    code: "VALIDATION_ERROR",
    message: "Los datos no cumplen una regla de integridad del sistema.",
    status: HttpStatus.BAD_REQUEST,
  },
  P2011: {
    code: "VALIDATION_ERROR",
    message: "Falta un dato obligatorio para completar la operación.",
    status: HttpStatus.BAD_REQUEST,
  },
  P2012: {
    code: "VALIDATION_ERROR",
    message: "Falta un valor requerido para completar la operación.",
    status: HttpStatus.BAD_REQUEST,
  },
  P2025: {
    code: "RESOURCE_NOT_FOUND",
    message: "El registro solicitado no existe o ya no está disponible.",
    status: HttpStatus.NOT_FOUND,
  },
  P1001: {
    code: "DATABASE_ERROR",
    message: "El servicio de datos no está disponible temporalmente.",
    status: HttpStatus.SERVICE_UNAVAILABLE,
  },
  P1002: {
    code: "DATABASE_ERROR",
    message: "El servicio de datos tardó demasiado en responder.",
    status: HttpStatus.SERVICE_UNAVAILABLE,
  },
};

export function classifyDatabaseError(exception: unknown): ClassifiedError | null {
  if (typeof exception !== "object" || exception === null) return null;
  const code = (exception as DatabaseErrorLike).code;
  if (typeof code !== "string") return null;
  return DATABASE_ERROR_CATALOG[code] ?? null;
}

export function validationDetail(message: string): { field?: string; message: string } {
  const [candidate] = message.split(" ", 1);
  const field = candidate && /^[a-zA-Z][a-zA-Z0-9_]*$/.test(candidate)
    ? candidate
    : undefined;
  return { ...(field ? { field } : {}), message };
}
