import { createParamDecorator, type ExecutionContext } from "@nestjs/common";
import type { FastifyRequest } from "fastify";

export const Cookie = createParamDecorator(
  (name: string, context: ExecutionContext): string | undefined => {
    const request = context.switchToHttp().getRequest<FastifyRequest>();
    return request.cookies?.[name];
  },
);
