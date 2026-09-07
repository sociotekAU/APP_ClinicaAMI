import { Injectable, Logger } from "@nestjs/common";
import { randomBytes } from "node:crypto";

@Injectable()
export class AuthConfigService {
  private readonly logger = new Logger(AuthConfigService.name);

  readonly accessSecret = this.readSecret("JWT_ACCESS_SECRET");
  readonly refreshSecret = this.readSecret("JWT_REFRESH_SECRET");
  readonly issuer = process.env.JWT_ISSUER ?? "ami-api";
  readonly audience = process.env.JWT_AUDIENCE ?? "ami-admin";
  readonly secureCookies = process.env.NODE_ENV === "production";

  private readSecret(name: "JWT_ACCESS_SECRET" | "JWT_REFRESH_SECRET"): string {
    const configuredValue = process.env[name];

    if (configuredValue && configuredValue.length >= 32) {
      return configuredValue;
    }

    if (process.env.NODE_ENV === "production") {
      throw new Error(`${name} debe contener al menos 32 caracteres.`);
    }

    this.logger.warn(`${name} no está configurado; se usará un secreto efímero local.`);
    return randomBytes(48).toString("base64url");
  }
}
