import { HttpException, type HttpStatus } from "@nestjs/common";
import type { ApiErrorCode, ApiErrorDetail } from "@ami/contracts";

export class AppException extends HttpException {
  constructor(
    readonly code: ApiErrorCode,
    message: string,
    status: HttpStatus,
    readonly details?: ApiErrorDetail[],
  ) {
    super(message, status);
  }
}
