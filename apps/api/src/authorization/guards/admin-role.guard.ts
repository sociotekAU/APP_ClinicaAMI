import { type CanActivate, type ExecutionContext, HttpStatus, Injectable } from "@nestjs/common";
import type { FastifyRequest } from "fastify";
import { AppException } from "../../common/errors/app.exception";

export function isAdministratorRole(roleName: string): boolean {
  const normalized = roleName.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();
  return normalized === "admin" || normalized.includes("administrador");
}

@Injectable()
export class AdminRoleGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<FastifyRequest>();
    if (!request.authUser || !isAdministratorRole(request.authUser.role.name)) {
      throw new AppException(
        "AUTH_ADMIN_REQUIRED",
        "Solo un administrador puede gestionar los permisos.",
        HttpStatus.FORBIDDEN,
      );
    }
    return true;
  }
}
