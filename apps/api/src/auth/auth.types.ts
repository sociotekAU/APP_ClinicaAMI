import type { AuthUser } from "@ami/contracts";

export interface AuthTokenPayload {
  sub: number;
  username: string;
  roleId: number;
  tokenType: "access" | "refresh";
  mustChangePassword: boolean;
}

export interface AuthResult {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}

declare module "fastify" {
  interface FastifyRequest {
    authUser?: AuthUser;
  }
}
