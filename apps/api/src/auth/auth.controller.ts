import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Res,
  UseGuards,
} from "@nestjs/common";
import type { ApiSuccess, AuthSession, AuthUser } from "@ami/contracts";
import { Throttle } from "@nestjs/throttler";
import type { FastifyReply } from "fastify";
import {
  ACCESS_COOKIE_NAME,
  ACCESS_TOKEN_TTL_SECONDS,
  REFRESH_COOKIE_NAME,
  REFRESH_TOKEN_TTL_SECONDS,
} from "./auth.constants";
import { AuthConfigService } from "./auth-config.service";
import { AuthService } from "./auth.service";
import { AllowPasswordChangePending } from "./decorators/allow-password-change-pending.decorator";
import { Cookie } from "./decorators/cookies.decorator";
import { CurrentUser } from "./decorators/current-user.decorator";
import { ChangePasswordDto } from "./dto/change-password.dto";
import { LoginDto } from "./dto/login.dto";
import { AccessTokenGuard } from "./guards/access-token.guard";
import type { AuthResult } from "./auth.types";

@Controller("auth")
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly config: AuthConfigService,
  ) {}

  @Post("login")
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async login(
    @Body() credentials: LoginDto,
    @Res({ passthrough: true }) response: FastifyReply,
  ): Promise<ApiSuccess<AuthSession>> {
    const result = await this.authService.login(credentials.username, credentials.password);
    this.writeSessionCookies(response, result);
    return this.success({ user: result.user });
  }

  @Post("refresh")
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Cookie(REFRESH_COOKIE_NAME) refreshToken: string | undefined,
    @Res({ passthrough: true }) response: FastifyReply,
  ): Promise<ApiSuccess<AuthSession>> {
    const result = await this.authService.refresh(refreshToken);
    this.writeSessionCookies(response, result);
    return this.success({ user: result.user });
  }

  @Post("logout")
  @HttpCode(HttpStatus.OK)
  logout(
    @Res({ passthrough: true }) response: FastifyReply,
  ): ApiSuccess<{ loggedOut: true }> {
    response.clearCookie(ACCESS_COOKIE_NAME, { path: "/" });
    response.clearCookie(REFRESH_COOKIE_NAME, { path: "/api/v1/auth" });
    return this.success({ loggedOut: true });
  }

  @Get("me")
  @UseGuards(AccessTokenGuard)
  @AllowPasswordChangePending()
  me(@CurrentUser() user: AuthUser): ApiSuccess<AuthSession> {
    return this.success({ user });
  }

  @Post("change-password")
  @HttpCode(HttpStatus.OK)
  @UseGuards(AccessTokenGuard)
  @AllowPasswordChangePending()
  async changePassword(
    @CurrentUser() user: AuthUser,
    @Body() passwords: ChangePasswordDto,
    @Res({ passthrough: true }) response: FastifyReply,
  ): Promise<ApiSuccess<AuthSession>> {
    const result = await this.authService.changePassword(
      user.id,
      passwords.currentPassword,
      passwords.newPassword,
    );
    this.writeSessionCookies(response, result);
    return this.success({ user: result.user });
  }

  private writeSessionCookies(response: FastifyReply, result: AuthResult): void {
    const commonOptions = {
      httpOnly: true,
      sameSite: "strict" as const,
      secure: this.config.secureCookies,
    };

    response.setCookie(ACCESS_COOKIE_NAME, result.accessToken, {
      ...commonOptions,
      maxAge: ACCESS_TOKEN_TTL_SECONDS,
      path: "/",
    });
    response.setCookie(REFRESH_COOKIE_NAME, result.refreshToken, {
      ...commonOptions,
      maxAge: REFRESH_TOKEN_TTL_SECONDS,
      path: "/api/v1/auth",
    });
  }

  private success<T>(data: T): ApiSuccess<T> {
    return {
      data,
      meta: {
        timestamp: new Date().toISOString(),
      },
    };
  }
}
