import { HttpStatus, Injectable } from "@nestjs/common";
import type {
  AdministrationOptions,
  PaginatedData,
  ProfessionalListItem,
  ServiceListItem,
  SpecialtyListItem,
  UserListItem,
} from "@ami/contracts";
import { hash } from "bcryptjs";
import { AppException } from "../common/errors/app.exception";
import { createPageMeta, paginationOffset } from "../common/pagination/pagination";
import { DatabaseService } from "../database/database.service";
import type {
  ListProfessionalsDto,
  ListServicesDto,
  ListSpecialtiesDto,
  ListUsersDto,
} from "./dto/list-resources.dto";
import type {
  ProfessionalInputDto,
  ServiceInputDto,
  SpecialtyInputDto,
  UserCreateInputDto,
  UserUpdateInputDto,
} from "./dto/resource-input.dto";

function optionalText(value: string | undefined): string | null {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

function statusWhere(status: "all" | "active" | "inactive") {
  return status === "all" ? {} : { estado: status === "active" };
}

@Injectable()
export class AdministrationService {
  constructor(private readonly database: DatabaseService) {}

  async listSpecialties(query: ListSpecialtiesDto): Promise<PaginatedData<SpecialtyListItem>> {
    const search = query.search?.trim();
    const where = {
      ...statusWhere(query.status),
      ...(search ? { nombre: { contains: search, mode: "insensitive" as const } } : {}),
    };
    const orderBy = query.sortBy === "createdAt"
      ? [{ fecha_creacion: query.sortDirection }, { id: "asc" as const }]
      : [{ nombre: query.sortDirection }, { id: "asc" as const }];
    const [rows, totalItems] = await Promise.all([
      this.database.client.tb_especialidades.findMany({
        where,
        include: { _count: { select: { tb_medicos: true } } },
        orderBy,
        skip: paginationOffset(query.page, query.pageSize),
        take: query.pageSize,
      }),
      this.database.client.tb_especialidades.count({ where }),
    ]);

    return {
      items: rows.map((row) => this.toSpecialty(row)),
      pagination: createPageMeta(query.page, query.pageSize, totalItems),
    };
  }

  async createSpecialty(input: SpecialtyInputDto): Promise<SpecialtyListItem> {
    const row = await this.database.client.tb_especialidades.create({
      data: {
        nombre: input.name.trim(),
        descripcion: optionalText(input.description),
        admite_expediente_psicologico: input.psychologicalRecordEligible ?? false,
      },
      include: { _count: { select: { tb_medicos: true } } },
    });
    return this.toSpecialty(row);
  }

  async updateSpecialty(id: number, input: SpecialtyInputDto): Promise<SpecialtyListItem> {
    const row = await this.database.client.tb_especialidades.update({
      where: { id },
      data: {
        nombre: input.name.trim(),
        descripcion: optionalText(input.description),
        ...(input.psychologicalRecordEligible === undefined
          ? {}
          : { admite_expediente_psicologico: input.psychologicalRecordEligible }),
      },
      include: { _count: { select: { tb_medicos: true } } },
    });
    return this.toSpecialty(row);
  }

  async setSpecialtyStatus(id: number, active: boolean): Promise<SpecialtyListItem> {
    const row = await this.database.client.$transaction(async (transaction) => {
      const specialty = await transaction.tb_especialidades.update({
        where: { id },
        data: { estado: active },
        include: { _count: { select: { tb_medicos: true } } },
      });
      if (!active) {
        await transaction.tb_usuarios.updateMany({
          where: { tb_medicos: { is: { especialidad_id: id } } },
          data: { estado: false },
        });
      }
      return specialty;
    });
    return this.toSpecialty(row);
  }

  async listServices(query: ListServicesDto): Promise<PaginatedData<ServiceListItem>> {
    const search = query.search?.trim();
    const where = {
      ...statusWhere(query.status),
      ...(search
        ? {
            OR: [
              { nombre: { contains: search, mode: "insensitive" as const } },
              { descripcion: { contains: search, mode: "insensitive" as const } },
            ],
          }
        : {}),
    };
    const primaryOrder = query.sortBy === "price"
      ? { precio: query.sortDirection }
      : query.sortBy === "createdAt"
        ? { fecha_creacion: query.sortDirection }
        : { nombre: query.sortDirection };
    const [rows, totalItems] = await Promise.all([
      this.database.client.tb_servicios.findMany({
        where,
        orderBy: [primaryOrder, { id: "asc" }],
        skip: paginationOffset(query.page, query.pageSize),
        take: query.pageSize,
      }),
      this.database.client.tb_servicios.count({ where }),
    ]);

    return {
      items: rows.map((row) => this.toService(row)),
      pagination: createPageMeta(query.page, query.pageSize, totalItems),
    };
  }

  async createService(input: ServiceInputDto): Promise<ServiceListItem> {
    const row = await this.database.client.tb_servicios.create({
      data: {
        nombre: input.name.trim(),
        descripcion: optionalText(input.description),
        precio: input.price,
        imagen_url: optionalText(input.imageUrl),
      },
    });
    return this.toService(row);
  }

  async updateService(id: number, input: ServiceInputDto): Promise<ServiceListItem> {
    const row = await this.database.client.tb_servicios.update({
      where: { id },
      data: {
        nombre: input.name.trim(),
        descripcion: optionalText(input.description),
        precio: input.price,
        imagen_url: optionalText(input.imageUrl),
      },
    });
    return this.toService(row);
  }

  async setServiceStatus(id: number, active: boolean): Promise<ServiceListItem> {
    const row = await this.database.client.tb_servicios.update({
      where: { id },
      data: { estado: active },
    });
    return this.toService(row);
  }

  async listProfessionals(query: ListProfessionalsDto): Promise<PaginatedData<ProfessionalListItem>> {
    const search = query.search?.trim();
    const where = {
      ...statusWhere(query.status),
      ...(query.specialtyId ? { especialidad_id: query.specialtyId } : {}),
      ...(search
        ? {
            OR: [
              { nombre: { contains: search, mode: "insensitive" as const } },
              { correo: { contains: search, mode: "insensitive" as const } },
              { colegiado: { contains: search, mode: "insensitive" as const } },
              {
                tb_especialidades: {
                  nombre: { contains: search, mode: "insensitive" as const },
                },
              },
            ],
          }
        : {}),
    };
    const orderBy = query.sortBy === "specialty"
      ? [{ tb_especialidades: { nombre: query.sortDirection } }, { id: "asc" as const }]
      : query.sortBy === "createdAt"
        ? [{ fecha_creacion: query.sortDirection }, { id: "asc" as const }]
        : [{ nombre: query.sortDirection }, { id: "asc" as const }];
    const [rows, totalItems] = await Promise.all([
      this.database.client.tb_medicos.findMany({
        where,
        include: { tb_especialidades: true, tb_usuarios: { select: { id_usuario: true } } },
        orderBy,
        skip: paginationOffset(query.page, query.pageSize),
        take: query.pageSize,
      }),
      this.database.client.tb_medicos.count({ where }),
    ]);

    return {
      items: rows.map((row) => this.toProfessional(row)),
      pagination: createPageMeta(query.page, query.pageSize, totalItems),
    };
  }

  async createProfessional(input: ProfessionalInputDto): Promise<ProfessionalListItem> {
    await this.requireActiveSpecialty(input.specialtyId);
    const row = await this.database.client.tb_medicos.create({
      data: this.professionalData(input),
      include: { tb_especialidades: true, tb_usuarios: { select: { id_usuario: true } } },
    });
    return this.toProfessional(row);
  }

  async updateProfessional(id: number, input: ProfessionalInputDto): Promise<ProfessionalListItem> {
    const current = await this.database.client.tb_medicos.findUnique({ where: { id } });
    if (!current) this.notFound("El profesional solicitado no existe.");
    const specialty = await this.database.client.tb_especialidades.findUnique({
      where: { id: input.specialtyId },
    });
    if (!specialty) this.notFound("La especialidad seleccionada no existe.");
    if (current.estado && !specialty.estado) {
      throw new AppException(
        "RESOURCE_CONFLICT",
        "Un profesional activo debe pertenecer a una especialidad activa.",
        HttpStatus.CONFLICT,
        [{ field: "specialtyId", message: "Seleccione una especialidad activa." }],
      );
    }
    const row = await this.database.client.tb_medicos.update({
      where: { id },
      data: this.professionalData(input),
      include: { tb_especialidades: true, tb_usuarios: { select: { id_usuario: true } } },
    });
    return this.toProfessional(row);
  }

  async setProfessionalStatus(id: number, active: boolean): Promise<ProfessionalListItem> {
    const current = await this.database.client.tb_medicos.findUnique({
      where: { id },
      include: { tb_especialidades: true },
    });
    if (!current) this.notFound("El profesional solicitado no existe.");
    if (active && !current.tb_especialidades.estado) {
      throw new AppException(
        "RESOURCE_CONFLICT",
        "No se puede activar el profesional mientras su especialidad esté inactiva.",
        HttpStatus.CONFLICT,
      );
    }
    if (active) {
      await this.database.client.tb_medicos.update({ where: { id }, data: { estado: true } });
    } else {
      await this.database.client.$transaction([
        this.database.client.tb_medicos.update({ where: { id }, data: { estado: false } }),
        this.database.client.tb_usuarios.updateMany({ where: { id_doctor: id }, data: { estado: false } }),
      ]);
    }
    const row = await this.database.client.tb_medicos.findUniqueOrThrow({
      where: { id },
      include: { tb_especialidades: true, tb_usuarios: { select: { id_usuario: true } } },
    });
    return this.toProfessional(row);
  }

  async listUsers(query: ListUsersDto): Promise<PaginatedData<UserListItem>> {
    const search = query.search?.trim();
    const where = {
      ...statusWhere(query.status),
      ...(query.roleId ? { id_rol: query.roleId } : {}),
      ...(search
        ? {
            OR: [
              { username: { contains: search, mode: "insensitive" as const } },
              { nombre: { contains: search, mode: "insensitive" as const } },
              { correo: { contains: search, mode: "insensitive" as const } },
              { tb_roles: { nombre_rol: { contains: search, mode: "insensitive" as const } } },
            ],
          }
        : {}),
    };
    const orderBy = query.sortBy === "role"
      ? [{ tb_roles: { nombre_rol: query.sortDirection } }, { id_usuario: "asc" as const }]
      : query.sortBy === "name"
        ? [{ nombre: query.sortDirection }, { id_usuario: "asc" as const }]
        : query.sortBy === "lastAccess"
          ? [{ ultimo_acceso: { sort: query.sortDirection, nulls: "last" as const } }, { id_usuario: "asc" as const }]
          : [{ username: query.sortDirection }, { id_usuario: "asc" as const }];
    const [rows, totalItems] = await Promise.all([
      this.database.client.tb_usuarios.findMany({
        where,
        include: { tb_roles: true, tb_medicos: true },
        orderBy,
        skip: paginationOffset(query.page, query.pageSize),
        take: query.pageSize,
      }),
      this.database.client.tb_usuarios.count({ where }),
    ]);

    return {
      items: rows.map((row) => this.toUser(row)),
      pagination: createPageMeta(query.page, query.pageSize, totalItems),
    };
  }

  async createUser(input: UserCreateInputDto): Promise<UserListItem> {
    await this.validateUserRelations(input.roleId, input.professionalId);
    const passwordHash = await hash(input.temporaryPassword, 12);
    const row = await this.database.client.tb_usuarios.create({
      data: {
        username: input.username.trim().toLowerCase(),
        nombre: input.name.trim(),
        correo: optionalText(input.email)?.toLowerCase() ?? null,
        password_hash: passwordHash,
        id_rol: input.roleId,
        id_doctor: input.professionalId ?? null,
        debe_cambiar_password: true,
      },
      include: { tb_roles: true, tb_medicos: true },
    });
    return this.toUser(row);
  }

  async updateUser(id: number, input: UserUpdateInputDto): Promise<UserListItem> {
    await this.validateUserRelations(input.roleId, input.professionalId);
    const row = await this.database.client.tb_usuarios.update({
      where: { id_usuario: id },
      data: {
        nombre: input.name.trim(),
        correo: optionalText(input.email)?.toLowerCase() ?? null,
        id_rol: input.roleId,
        id_doctor: input.professionalId ?? null,
      },
      include: { tb_roles: true, tb_medicos: true },
    });
    return this.toUser(row);
  }

  async setUserStatus(id: number, active: boolean, currentUserId: number): Promise<UserListItem> {
    if (!active && id === currentUserId) {
      throw new AppException(
        "RESOURCE_CONFLICT",
        "No puede desactivar su propia cuenta mientras la está utilizando.",
        HttpStatus.CONFLICT,
      );
    }
    const row = await this.database.client.tb_usuarios.update({
      where: { id_usuario: id },
      data: { estado: active },
      include: { tb_roles: true, tb_medicos: true },
    });
    return this.toUser(row);
  }

  async getOptions(): Promise<AdministrationOptions> {
    const [roles, specialties, professionals] = await Promise.all([
      this.database.client.tb_roles.findMany({ orderBy: { nombre_rol: "asc" } }),
      this.database.client.tb_especialidades.findMany({ orderBy: { nombre: "asc" } }),
      this.database.client.tb_medicos.findMany({
        orderBy: { nombre: "asc" },
        include: { tb_usuarios: { select: { id_usuario: true } } },
      }),
    ]);
    return {
      roles: roles.map((row) => ({ id: row.id_rol, label: row.nombre_rol, active: row.estado })),
      specialties: specialties.map((row) => ({ id: row.id, label: row.nombre, active: row.estado })),
      professionals: professionals.map((row) => ({
        id: row.id,
        label: row.nombre,
        active: row.estado,
        linkedUserId: row.tb_usuarios?.id_usuario ?? null,
      })),
    };
  }

  private professionalData(input: ProfessionalInputDto) {
    return {
      nombre: input.name.trim(),
      dpi: optionalText(input.dpi),
      colegiado: optionalText(input.licenseNumber),
      numero_telefono: optionalText(input.phone),
      correo: optionalText(input.email)?.toLowerCase() ?? null,
      fecha_inicio: input.startDate ? new Date(`${input.startDate}T00:00:00.000Z`) : null,
      especialidad_id: input.specialtyId,
    };
  }

  private async requireActiveSpecialty(id: number): Promise<void> {
    const specialty = await this.database.client.tb_especialidades.findUnique({ where: { id } });
    if (!specialty) this.notFound("La especialidad seleccionada no existe.");
    if (!specialty.estado) {
      throw new AppException(
        "RESOURCE_CONFLICT",
        "Seleccione una especialidad activa para el profesional.",
        HttpStatus.CONFLICT,
        [{ field: "specialtyId", message: "La especialidad seleccionada está inactiva." }],
      );
    }
  }

  private async validateUserRelations(roleId: number, professionalId?: number | null): Promise<void> {
    const [role, professional] = await Promise.all([
      this.database.client.tb_roles.findUnique({ where: { id_rol: roleId } }),
      professionalId
        ? this.database.client.tb_medicos.findUnique({ where: { id: professionalId } })
        : Promise.resolve(null),
    ]);
    if (!role) this.notFound("El rol seleccionado no existe.");
    if (!role.estado) {
      throw new AppException(
        "RESOURCE_CONFLICT",
        "El rol seleccionado está inactivo.",
        HttpStatus.CONFLICT,
        [{ field: "roleId", message: "Seleccione un rol activo." }],
      );
    }
    if (professionalId && !professional) this.notFound("El profesional seleccionado no existe.");
    if (professional && !professional.estado) {
      throw new AppException(
        "RESOURCE_CONFLICT",
        "El profesional seleccionado está inactivo.",
        HttpStatus.CONFLICT,
        [{ field: "professionalId", message: "Seleccione un profesional activo." }],
      );
    }
  }

  private notFound(message: string): never {
    throw new AppException("RESOURCE_NOT_FOUND", message, HttpStatus.NOT_FOUND);
  }

  private toSpecialty(row: {
    id: number;
    nombre: string;
    descripcion: string | null;
    admite_expediente_psicologico: boolean;
    estado: boolean;
    fecha_creacion: Date;
    _count: { tb_medicos: number };
  }): SpecialtyListItem {
    return {
      id: row.id,
      name: row.nombre,
      description: row.descripcion,
      psychologicalRecordEligible: row.admite_expediente_psicologico,
      active: row.estado,
      professionalCount: row._count.tb_medicos,
      createdAt: row.fecha_creacion.toISOString(),
    };
  }

  private toService(row: {
    id: number;
    nombre: string;
    descripcion: string | null;
    precio: { toString(): string };
    imagen_url: string | null;
    estado: boolean;
    fecha_creacion: Date;
  }): ServiceListItem {
    return {
      id: row.id,
      name: row.nombre,
      description: row.descripcion,
      price: Number(row.precio.toString()),
      imageUrl: row.imagen_url,
      active: row.estado,
      createdAt: row.fecha_creacion.toISOString(),
    };
  }

  private toProfessional(row: {
    id: number;
    nombre: string;
    dpi: string | null;
    colegiado: string | null;
    numero_telefono: string | null;
    correo: string | null;
    fecha_inicio: Date | null;
    estado: boolean;
    fecha_creacion: Date;
    tb_especialidades: { id: number; nombre: string };
    tb_usuarios: { id_usuario: number } | null;
  }): ProfessionalListItem {
    return {
      id: row.id,
      name: row.nombre,
      dpi: row.dpi,
      licenseNumber: row.colegiado,
      phone: row.numero_telefono,
      email: row.correo,
      startDate: row.fecha_inicio?.toISOString().slice(0, 10) ?? null,
      active: row.estado,
      specialty: { id: row.tb_especialidades.id, name: row.tb_especialidades.nombre },
      hasUser: row.tb_usuarios !== null,
      createdAt: row.fecha_creacion.toISOString(),
    };
  }

  private toUser(row: {
    id_usuario: number;
    username: string;
    nombre: string;
    correo: string | null;
    estado: boolean;
    debe_cambiar_password: boolean;
    ultimo_acceso: Date | null;
    fecha_creacion: Date;
    tb_roles: { id_rol: number; nombre_rol: string };
    tb_medicos: { id: number; nombre: string } | null;
  }): UserListItem {
    return {
      id: row.id_usuario,
      username: row.username,
      name: row.nombre,
      email: row.correo,
      active: row.estado,
      mustChangePassword: row.debe_cambiar_password,
      lastAccess: row.ultimo_acceso?.toISOString() ?? null,
      createdAt: row.fecha_creacion.toISOString(),
      role: { id: row.tb_roles.id_rol, name: row.tb_roles.nombre_rol },
      professional: row.tb_medicos
        ? { id: row.tb_medicos.id, name: row.tb_medicos.nombre }
        : null,
    };
  }
}
