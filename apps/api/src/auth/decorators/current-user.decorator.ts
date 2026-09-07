import { createParamDecorator, type ExecutionContext } from "@nestjs/common";
import type { AuthUser } from "@ami/contracts";
import type { FastifyRequest } from "fastify";

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthUser => {
    const request = context.switchToHttp().getRequest<FastifyRequest>();

    if (!request.authUser) {
      throw new Error("El guard de autenticación no asignó el usuario.");
    }

    return request.authUser;
  },
);
