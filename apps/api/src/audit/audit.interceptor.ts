import { type CallHandler, type ExecutionContext, Injectable, type NestInterceptor } from "@nestjs/common";
import type { FastifyRequest } from "fastify";
import { concatMap, defer, from, map, type Observable, switchMap } from "rxjs";
import { AuditService, type AuditHttpRequest } from "./audit.service";

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private readonly audit: AuditService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== "http") return next.handle();
    const request = context.switchToHttp().getRequest<FastifyRequest>() as FastifyRequest & AuditHttpRequest;
    if (!this.audit.shouldAudit(request)) return next.handle();

    return defer(() => this.audit.prepare(request)).pipe(
      switchMap((prepared) => next.handle().pipe(
        concatMap((response) => from(this.audit.record(request, response, prepared)).pipe(
          map(() => response),
        )),
      )),
    );
  }
}
