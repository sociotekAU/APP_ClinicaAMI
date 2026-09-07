import {
  ArgumentsHost,
  BadRequestException,
  Catch,
  type ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import type { ApiError, ApiErrorDetail } from "@ami/contracts";
import type { FastifyReply, FastifyRequest } from "fastify";
import { randomUUID } from "node:crypto";
import { AppException } from "./app.exception";

interface NestErrorResponse {
  message?: string | string[];
}

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ApiExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const request = context.getRequest<FastifyRequest>();
    const response = context.getResponse<FastifyReply>();
    const requestId = request.id || randomUUID();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let code = "INTERNAL_ERROR";
    let message = "No fue posible completar la solicitud.";
    let details: ApiErrorDetail[] | undefined;

    if (exception instanceof AppException) {
      status = exception.getStatus();
      code = exception.code;
      message = exception.message;
      details = exception.details;
    } else if (exception instanceof BadRequestException) {
      status = exception.getStatus();
      code = "VALIDATION_ERROR";
      message = "Revise los datos enviados.";
      const errorResponse = exception.getResponse() as NestErrorResponse;
      const validationMessages = Array.isArray(errorResponse.message)
        ? errorResponse.message
        : [errorResponse.message].filter((item): item is string => Boolean(item));
      details = validationMessages.map((validationMessage) => ({
        message: validationMessage,
      }));
    } else if (exception instanceof HttpException) {
      status = exception.getStatus();
      const safeHttpErrors: Record<number, { code: string; message: string }> = {
        [HttpStatus.BAD_REQUEST]: {
          code: "VALIDATION_ERROR",
          message: "Revise los datos enviados.",
        },
        [HttpStatus.UNAUTHORIZED]: {
          code: "UNAUTHORIZED",
          message: "No fue posible validar la identidad.",
        },
        [HttpStatus.FORBIDDEN]: {
          code: "FORBIDDEN",
          message: "No tiene autorización para realizar esta acción.",
        },
        [HttpStatus.NOT_FOUND]: {
          code: "RESOURCE_NOT_FOUND",
          message: "El recurso solicitado no existe.",
        },
        [HttpStatus.TOO_MANY_REQUESTS]: {
          code: "RATE_LIMIT_EXCEEDED",
          message: "Demasiados intentos. Espere un momento antes de volver a intentar.",
        },
      };
      const safeError = safeHttpErrors[status];
      code = safeError?.code ?? "HTTP_ERROR";
      message = safeError?.message ?? "No fue posible completar la solicitud.";
    } else {
      const stack = exception instanceof Error ? exception.stack : String(exception);
      this.logger.error(`Error no controlado en ${request.method} ${request.url}`, stack);
    }

    const body: ApiError = {
      error: {
        code,
        message,
        ...(details?.length ? { details } : {}),
      },
      meta: {
        requestId,
        timestamp: new Date().toISOString(),
      },
    };

    void response.header("x-request-id", requestId).status(status).send(body);
  }
}
