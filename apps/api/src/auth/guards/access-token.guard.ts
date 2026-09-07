import { CanActivate, type ExecutionContext, HttpStatus, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { FastifyRequest } from "fastify";
import { AppException } from "../../common/errors/app.exception";
import { ACCESS_COOKIE_NAME } from "../auth.constants";
import { AuthService } from "../auth.service";
import { ALLOW_PASSWORD_CHANGE_PENDING } from "../decorators/allow-password-change-pending.decorator";

@Injectable()
export class AccessTokenGuard implements CanActivate {
  constructor(
    private readonly authService: AuthService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<FastifyRequest>();
    const token = request.cookies?.[ACCESS_COOKIE_NAME];

    if (!token) {
      throw new AppException(
        "AUTH_REQUIRED",
        "Debe iniciar sesión para continuar.",
        HttpStatus.UNAUTHORIZED,
      );
    }

    request.authUser = await this.authService.authenticateAccessToken(token);
    const canContinueWithTemporaryPassword = this.reflector.getAllAndOverride<boolean>(
      ALLOW_PASSWORD_CHANGE_PENDING,
      [context.getHandler(), context.getClass()],
    );

    if (request.authUser.mustChangePassword && !canContinueWithTemporaryPassword) {
      throw new AppException(
        "AUTH_PASSWORD_CHANGE_REQUIRED",
        "Debe actualizar la contraseña temporal antes de continuar.",
        HttpStatus.FORBIDDEN,
      );
    }

    return true;
  }
}
