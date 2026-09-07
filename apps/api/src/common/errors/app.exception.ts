import { HttpException, type HttpStatus } from "@nestjs/common";
import type { ApiErrorDetail } from "@ami/contracts";

export class AppException extends HttpException {
  constructor(
    readonly code: string,
    message: string,
    status: HttpStatus,
    readonly details?: ApiErrorDetail[],
  ) {
    super(message, status);
  }
}
