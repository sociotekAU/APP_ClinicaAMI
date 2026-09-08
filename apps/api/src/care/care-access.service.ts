import { HttpStatus, Injectable } from "@nestjs/common";
import type { AuthUser } from "@ami/contracts";
import { AppException } from "../common/errors/app.exception";
import { DatabaseService } from "../database/database.service";

function normalizeRole(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

@Injectable()
export class CareAccessService {
  constructor(private readonly database: DatabaseService) {}

  async professionalScope(user: AuthUser): Promise<number | null> {
    const account = await this.database.client.tb_usuarios.findUnique({
      where: { id_usuario: user.id },
      select: { id_doctor: true },
    });
    if (!account) {
      throw new AppException("AUTH_SESSION_INVALID", "La cuenta de la sesión ya no existe.", HttpStatus.UNAUTHORIZED);
    }

    if (account.id_doctor) return account.id_doctor;
    const role = normalizeRole(user.role.name);
    if (role.includes("medico") || role.includes("psicolog")) {
      throw new AppException(
        "AUTH_FORBIDDEN",
        "La cuenta clínica debe estar vinculada con un profesional para consultar estos datos.",
        HttpStatus.FORBIDDEN,
      );
    }
    return null;
  }

  ensureScopedProfessional(scope: number | null, professionalId: number): void {
    if (scope !== null && scope !== professionalId) {
      throw new AppException(
        "AUTH_FORBIDDEN",
        "No puede operar información asignada a otro profesional.",
        HttpStatus.FORBIDDEN,
      );
    }
  }
}
