import type { FieldValues, Path, UseFormSetError } from "react-hook-form";
import { ApiClientError } from "../../lib/api-client";
import { toFieldErrorMap } from "../../lib/crud-query";

export function applyApiFormErrors<T extends FieldValues>(
  reason: unknown,
  setError: UseFormSetError<T>,
): ApiClientError {
  const error = reason instanceof ApiClientError
    ? reason
    : new ApiClientError("No fue posible guardar el registro.", "INTERNAL_ERROR", 500);
  for (const [field, message] of Object.entries(toFieldErrorMap(error.details))) {
    setError(field as Path<T>, { message, type: "server" });
  }
  return error;
}
