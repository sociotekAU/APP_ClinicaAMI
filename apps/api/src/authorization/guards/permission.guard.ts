import {
  type CanActivate,
  type ExecutionContext,
  HttpStatus,
  Injectable,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { FastifyRequest } from "fastify";
import { AppException } from "../../common/errors/app.exception";
import {
  PERMISSION_METADATA_KEY,
  type RequiredPermission,
} from "../authorization.constants";
import { AuthorizationService } from "../authorization.service";

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(
    private readonly authorization: AuthorizationService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requirements = this.reflector.getAllAndOverride<RequiredPermission[]>(
      PERMISSION_METADATA_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requirements?.length) return true;

    const request = context.switchToHttp().getRequest<FastifyRequest>();
    const user = request.authUser;
    if (!user) {
      throw new AppException(
        "AUTH_REQUIRED",
        "Debe iniciar sesión para continuar.",
        HttpStatus.UNAUTHORIZED,
      );
    }

    const decisions = await Promise.all(
      requirements.map((requirement) => this.authorization.hasPermission(
        user.role.id,
        requirement.module,
        requirement.action,
      )),
    );

    if (decisions.some((allowed) => !allowed)) {
      throw new AppException(
        "AUTH_FORBIDDEN",
        "Su rol no tiene permiso para realizar esta acción.",
        HttpStatus.FORBIDDEN,
      );
    }

    return true;
  }
}
