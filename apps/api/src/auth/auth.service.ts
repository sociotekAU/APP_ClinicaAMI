import { HttpStatus, Injectable } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import type { AuthUser } from "@ami/contracts";
import { compare, hash, hashSync } from "bcryptjs";
import { randomUUID } from "node:crypto";
import { AppException } from "../common/errors/app.exception";
import { DatabaseService } from "../database/database.service";
import {
  ACCESS_TOKEN_TTL_SECONDS,
  REFRESH_TOKEN_TTL_SECONDS,
} from "./auth.constants";
import { AuthConfigService } from "./auth-config.service";
import type { AuthResult, AuthTokenPayload } from "./auth.types";

const DUMMY_PASSWORD_HASH = hashSync("AMI-dummy-password-never-used", 12);

interface UserWithRole {
  id_usuario: number;
  username: string;
  nombre: string;
  password_hash: string;
  id_rol: number;
  estado: boolean;
  debe_cambiar_password: boolean;
  tb_roles: {
    id_rol: number;
    nombre_rol: string;
    estado: boolean;
  };
}

@Injectable()
export class AuthService {
  constructor(
    private readonly database: DatabaseService,
    private readonly jwt: JwtService,
    private readonly config: AuthConfigService,
  ) {}

  async login(username: string, password: string): Promise<AuthResult> {
    const normalizedUsername = username.trim().toLowerCase();
    const user = await this.database.client.tb_usuarios.findFirst({
      where: {
        username: {
          equals: normalizedUsername,
          mode: "insensitive",
        },
      },
      include: {
        tb_roles: true,
      },
    });

    const passwordMatches = await compare(password, user?.password_hash ?? DUMMY_PASSWORD_HASH);

    if (!user || !passwordMatches || !user.estado || !user.tb_roles.estado) {
      throw new AppException(
        "AUTH_INVALID_CREDENTIALS",
        "Usuario o contraseña incorrectos.",
        HttpStatus.UNAUTHORIZED,
      );
    }

    await this.database.client.tb_usuarios.update({
      where: { id_usuario: user.id_usuario },
      data: { ultimo_acceso: new Date() },
    });

    return this.createAuthResult(user);
  }

  async refresh(refreshToken: string | undefined): Promise<AuthResult> {
    if (!refreshToken) {
      throw new AppException(
        "AUTH_REFRESH_REQUIRED",
        "La sesión ya no puede renovarse. Inicie sesión nuevamente.",
        HttpStatus.UNAUTHORIZED,
      );
    }

    const payload = await this.verifyToken(refreshToken, "refresh");
    const user = await this.findActiveUser(payload.sub);
    return this.createAuthResult(user);
  }

  async authenticateAccessToken(accessToken: string): Promise<AuthUser> {
    const payload = await this.verifyToken(accessToken, "access");
    const user = await this.findActiveUser(payload.sub);
    return this.toAuthUser(user);
  }

  async changePassword(
    userId: number,
    currentPassword: string,
    newPassword: string,
  ): Promise<AuthResult> {
    const user = await this.database.client.tb_usuarios.findUnique({
      where: { id_usuario: userId },
      include: { tb_roles: true },
    });

    if (!user || !user.estado || !user.tb_roles.estado) {
      throw new AppException(
        "AUTH_SESSION_INVALID",
        "La sesión ya no es válida.",
        HttpStatus.UNAUTHORIZED,
      );
    }

    const currentPasswordMatches = await compare(currentPassword, user.password_hash);
    if (!currentPasswordMatches) {
      throw new AppException(
        "AUTH_CURRENT_PASSWORD_INVALID",
        "La contraseña actual no es correcta.",
        HttpStatus.BAD_REQUEST,
      );
    }

    if (await compare(newPassword, user.password_hash)) {
      throw new AppException(
        "AUTH_PASSWORD_REUSE",
        "La nueva contraseña debe ser diferente de la actual.",
        HttpStatus.BAD_REQUEST,
      );
    }

    const passwordHash = await hash(newPassword, 12);
    const updatedUser = await this.database.client.tb_usuarios.update({
      where: { id_usuario: user.id_usuario },
      data: {
        debe_cambiar_password: false,
        password_hash: passwordHash,
      },
      include: { tb_roles: true },
    });

    return this.createAuthResult(updatedUser);
  }

  private async findActiveUser(userId: number): Promise<UserWithRole> {
    const user = await this.database.client.tb_usuarios.findUnique({
      where: { id_usuario: userId },
      include: { tb_roles: true },
    });

    if (!user || !user.estado || !user.tb_roles.estado) {
      throw new AppException(
        "AUTH_SESSION_INVALID",
        "La sesión ya no es válida.",
        HttpStatus.UNAUTHORIZED,
      );
    }

    return user;
  }

  private async createAuthResult(user: UserWithRole): Promise<AuthResult> {
    const basePayload = {
      sub: user.id_usuario,
      username: user.username,
      roleId: user.id_rol,
      mustChangePassword: user.debe_cambiar_password,
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwt.signAsync(
        { ...basePayload, tokenType: "access" } satisfies AuthTokenPayload,
        {
          audience: this.config.audience,
          expiresIn: ACCESS_TOKEN_TTL_SECONDS,
          issuer: this.config.issuer,
          jwtid: randomUUID(),
          secret: this.config.accessSecret,
        },
      ),
      this.jwt.signAsync(
        { ...basePayload, tokenType: "refresh" } satisfies AuthTokenPayload,
        {
          audience: this.config.audience,
          expiresIn: REFRESH_TOKEN_TTL_SECONDS,
          issuer: this.config.issuer,
          jwtid: randomUUID(),
          secret: this.config.refreshSecret,
        },
      ),
    ]);

    return {
      accessToken,
      refreshToken,
      user: this.toAuthUser(user),
    };
  }

  private async verifyToken(
    token: string,
    expectedType: AuthTokenPayload["tokenType"],
  ): Promise<AuthTokenPayload> {
    try {
      const payload = await this.jwt.verifyAsync<AuthTokenPayload>(token, {
        audience: this.config.audience,
        issuer: this.config.issuer,
        secret: expectedType === "access"
          ? this.config.accessSecret
          : this.config.refreshSecret,
      });

      if (payload.tokenType !== expectedType) {
        throw new Error("Tipo de token inválido.");
      }

      return payload;
    } catch {
      throw new AppException(
        "AUTH_SESSION_EXPIRED",
        "La sesión expiró. Inicie sesión nuevamente.",
        HttpStatus.UNAUTHORIZED,
      );
    }
  }

  private toAuthUser(user: UserWithRole): AuthUser {
    return {
      id: user.id_usuario,
      username: user.username,
      name: user.nombre,
      role: {
        id: user.tb_roles.id_rol,
        name: user.tb_roles.nombre_rol,
      },
      mustChangePassword: user.debe_cambiar_password,
    };
  }
}
