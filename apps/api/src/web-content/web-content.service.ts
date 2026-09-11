import { HttpStatus, Injectable } from "@nestjs/common";
import type {
  AnnouncementPosition,
  PaginatedData,
  PublicWebContent,
  WebAnnouncementItem,
  WebAnnouncementStyleItem,
  WebContact,
  WebContentOptions,
  WebContentPreview,
  WebGalleryItem,
  WebProfessionalListItem,
  WebPromotionItem,
  WebPublicationState,
  WebServiceListItem,
} from "@ami/contracts";
import { AppException } from "../common/errors/app.exception";
import { createPageMeta, paginationOffset } from "../common/pagination/pagination";
import { DatabaseService } from "../database/database.service";
import type {
  ListAnnouncementsDto,
  ListGalleryDto,
  ListPromotionsDto,
  ListStylesDto,
  ListWebProfessionalsDto,
  ListWebServicesDto,
} from "./dto/list-web-content.dto";
import type {
  AnnouncementInputDto,
  AnnouncementStyleInputDto,
  GalleryInputDto,
  PromotionInputDto,
  WebContactInputDto,
  WebProfessionalInputDto,
  WebServiceInputDto,
} from "./dto/web-content-input.dto";

type ContactRow = {
  id: number; nombre_empresa: string; nombre_corto: string | null; telefono: string;
  correo: string | null; facebook: string | null; instagram: string | null;
  logo_url: string | null; ubicacion: string; google_maps_url: string | null;
  video_inicio_url: string | null; slogan: string | null; horario_semana: string | null;
  horario_sabado: string | null; estado: boolean; fecha_creacion: Date;
};
type ServiceRow = {
  id: number; nombre: string; descripcion: string | null; imagen_url: string | null;
  estado: boolean; visible_web: boolean; orden_web: number;
};
type ProfessionalRow = {
  id: number; nombre: string; estado: boolean; visible_web: boolean; foto_url: string | null;
  perfil_publico: string | null; orden_web: number; tb_especialidades: { nombre: string };
};
type GalleryRow = {
  id: number; titulo: string; definicion: string | null; imagen_url: string; estado: boolean;
  orden_web: number; fecha_creacion: Date;
};
type PromotionRow = {
  id: number; titulo: string; descripcion: string | null; fecha_inicio: Date; fecha_fin: Date;
  imagen_url: string | null; estado: boolean; fecha_creacion: Date;
};
type StyleRow = {
  id: number; nombre: string; color_fondo: string; color_texto: string; icono: string | null;
  posicion: string; estado: boolean; fecha_creacion: Date;
};
type AnnouncementRow = {
  id: number; titulo: string; descripcion: string | null; fecha_inicio: Date; fecha_fin: Date;
  imagen_url: string | null; estado: boolean; fecha_creacion: Date;
  tb_estilos: { id: number; nombre: string; color_fondo: string; color_texto: string; icono: string | null; posicion: string; estado: boolean };
  tb_promociones: { id: number; titulo: string; estado: boolean } | null;
};

function optionalText(value: string | undefined): string | null {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

function statusWhere(status: "all" | "active" | "inactive") {
  return status === "all" ? {} : { estado: status === "active" };
}

function visibilityWhere(status: "all" | "active" | "inactive") {
  return status === "all" ? {} : { visible_web: status === "active" };
}

function dateOnly(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function inputDate(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

function currentGuatemalaDate(): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Guatemala",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}`;
}

function publicationState(active: boolean, startDate: Date, endDate: Date, today = currentGuatemalaDate()): WebPublicationState {
  if (!active) return "draft";
  if (dateOnly(startDate) > today) return "scheduled";
  if (dateOnly(endDate) < today) return "expired";
  return "active";
}

@Injectable()
export class WebContentService {
  constructor(private readonly database: DatabaseService) {}

  async getContact(): Promise<WebContact | null> {
    const row = await this.database.client.tb_contacto.findFirst({ orderBy: [{ estado: "desc" }, { id: "asc" }] });
    return row ? this.toContact(row) : null;
  }

  async updateContact(id: number, input: WebContactInputDto): Promise<WebContact> {
    const row = await this.database.client.tb_contacto.update({
      where: { id },
      data: {
        nombre_empresa: input.companyName.trim(),
        nombre_corto: optionalText(input.shortName),
        telefono: input.phone.trim(),
        correo: optionalText(input.email)?.toLowerCase() ?? null,
        facebook: optionalText(input.facebook),
        instagram: optionalText(input.instagram),
        logo_url: optionalText(input.logoUrl),
        ubicacion: input.location.trim(),
        google_maps_url: optionalText(input.googleMapsUrl),
        video_inicio_url: optionalText(input.homeVideoUrl),
        slogan: optionalText(input.slogan),
        horario_semana: optionalText(input.weekdayHours),
        horario_sabado: optionalText(input.saturdayHours),
        estado: input.active,
      },
    });
    return this.toContact(row);
  }

  async listServices(query: ListWebServicesDto): Promise<PaginatedData<WebServiceListItem>> {
    const search = query.search?.trim();
    const where = {
      ...visibilityWhere(query.status),
      ...(search ? { OR: [
        { nombre: { contains: search, mode: "insensitive" as const } },
        { descripcion: { contains: search, mode: "insensitive" as const } },
      ] } : {}),
    };
    const primaryOrder = query.sortBy === "name" ? { nombre: query.sortDirection } : { orden_web: query.sortDirection };
    const [rows, totalItems] = await Promise.all([
      this.database.client.tb_servicios.findMany({ where, orderBy: [primaryOrder, { id: "asc" }], skip: paginationOffset(query.page, query.pageSize), take: query.pageSize }),
      this.database.client.tb_servicios.count({ where }),
    ]);
    return { items: rows.map((row) => this.toService(row)), pagination: createPageMeta(query.page, query.pageSize, totalItems) };
  }

  async updateService(id: number, input: WebServiceInputDto): Promise<WebServiceListItem> {
    const row = await this.database.client.tb_servicios.update({
      where: { id },
      data: { descripcion: optionalText(input.description), imagen_url: optionalText(input.imageUrl), visible_web: input.visibleOnWeb, orden_web: input.webOrder },
    });
    return this.toService(row);
  }

  async listProfessionals(query: ListWebProfessionalsDto): Promise<PaginatedData<WebProfessionalListItem>> {
    const search = query.search?.trim();
    const where = {
      ...visibilityWhere(query.status),
      ...(search ? { OR: [
        { nombre: { contains: search, mode: "insensitive" as const } },
        { perfil_publico: { contains: search, mode: "insensitive" as const } },
        { tb_especialidades: { nombre: { contains: search, mode: "insensitive" as const } } },
      ] } : {}),
    };
    const orderBy = query.sortBy === "name"
      ? [{ nombre: query.sortDirection }, { id: "asc" as const }]
      : query.sortBy === "specialty"
        ? [{ tb_especialidades: { nombre: query.sortDirection } }, { id: "asc" as const }]
        : [{ orden_web: query.sortDirection }, { id: "asc" as const }];
    const [rows, totalItems] = await Promise.all([
      this.database.client.tb_medicos.findMany({ where, include: { tb_especialidades: { select: { nombre: true } } }, orderBy, skip: paginationOffset(query.page, query.pageSize), take: query.pageSize }),
      this.database.client.tb_medicos.count({ where }),
    ]);
    return { items: rows.map((row) => this.toProfessional(row)), pagination: createPageMeta(query.page, query.pageSize, totalItems) };
  }

  async updateProfessional(id: number, input: WebProfessionalInputDto): Promise<WebProfessionalListItem> {
    const row = await this.database.client.tb_medicos.update({
      where: { id },
      data: { perfil_publico: optionalText(input.publicProfile), foto_url: optionalText(input.photoUrl), visible_web: input.visibleOnWeb, orden_web: input.webOrder },
      include: { tb_especialidades: { select: { nombre: true } } },
    });
    return this.toProfessional(row);
  }

  async listGallery(query: ListGalleryDto): Promise<PaginatedData<WebGalleryItem>> {
    const search = query.search?.trim();
    const where = { ...statusWhere(query.status), ...(search ? { OR: [
      { titulo: { contains: search, mode: "insensitive" as const } },
      { definicion: { contains: search, mode: "insensitive" as const } },
    ] } : {}) };
    const primaryOrder = query.sortBy === "title" ? { titulo: query.sortDirection }
      : query.sortBy === "createdAt" ? { fecha_creacion: query.sortDirection }
        : { orden_web: query.sortDirection };
    const [rows, totalItems] = await Promise.all([
      this.database.client.tb_galeria.findMany({ where, orderBy: [primaryOrder, { id: "asc" }], skip: paginationOffset(query.page, query.pageSize), take: query.pageSize }),
      this.database.client.tb_galeria.count({ where }),
    ]);
    return { items: rows.map((row) => this.toGallery(row)), pagination: createPageMeta(query.page, query.pageSize, totalItems) };
  }

  async createGallery(input: GalleryInputDto): Promise<WebGalleryItem> {
    const row = await this.database.client.tb_galeria.create({ data: {
      titulo: input.title.trim(), definicion: optionalText(input.description), imagen_url: input.imageUrl.trim(), orden_web: input.webOrder, estado: false,
    } });
    return this.toGallery(row);
  }

  async updateGallery(id: number, input: GalleryInputDto): Promise<WebGalleryItem> {
    const row = await this.database.client.tb_galeria.update({ where: { id }, data: {
      titulo: input.title.trim(), definicion: optionalText(input.description), imagen_url: input.imageUrl.trim(), orden_web: input.webOrder,
    } });
    return this.toGallery(row);
  }

  async setGalleryStatus(id: number, active: boolean): Promise<WebGalleryItem> {
    return this.toGallery(await this.database.client.tb_galeria.update({ where: { id }, data: { estado: active } }));
  }

  async listPromotions(query: ListPromotionsDto): Promise<PaginatedData<WebPromotionItem>> {
    const search = query.search?.trim();
    const where = { ...statusWhere(query.status), ...(search ? { OR: [
      { titulo: { contains: search, mode: "insensitive" as const } },
      { descripcion: { contains: search, mode: "insensitive" as const } },
    ] } : {}) };
    const primaryOrder = query.sortBy === "title" ? { titulo: query.sortDirection }
      : query.sortBy === "endDate" ? { fecha_fin: query.sortDirection }
        : query.sortBy === "createdAt" ? { fecha_creacion: query.sortDirection }
          : { fecha_inicio: query.sortDirection };
    const [rows, totalItems] = await Promise.all([
      this.database.client.tb_promociones.findMany({ where, orderBy: [primaryOrder, { id: "asc" }], skip: paginationOffset(query.page, query.pageSize), take: query.pageSize }),
      this.database.client.tb_promociones.count({ where }),
    ]);
    return { items: rows.map((row) => this.toPromotion(row)), pagination: createPageMeta(query.page, query.pageSize, totalItems) };
  }

  async createPromotion(input: PromotionInputDto): Promise<WebPromotionItem> {
    this.validateDates(input.startDate, input.endDate);
    const row = await this.database.client.tb_promociones.create({ data: this.publicationData(input, false) });
    return this.toPromotion(row);
  }

  async updatePromotion(id: number, input: PromotionInputDto): Promise<WebPromotionItem> {
    this.validateDates(input.startDate, input.endDate);
    const row = await this.database.client.tb_promociones.update({ where: { id }, data: this.publicationData(input) });
    return this.toPromotion(row);
  }

  async setPromotionStatus(id: number, active: boolean): Promise<WebPromotionItem> {
    return this.toPromotion(await this.database.client.tb_promociones.update({ where: { id }, data: { estado: active } }));
  }

  async listStyles(query: ListStylesDto): Promise<PaginatedData<WebAnnouncementStyleItem>> {
    const search = query.search?.trim();
    const where = { ...statusWhere(query.status), ...(search ? { OR: [
      { nombre: { contains: search, mode: "insensitive" as const } },
      { icono: { contains: search, mode: "insensitive" as const } },
    ] } : {}) };
    const primaryOrder = query.sortBy === "position" ? { posicion: query.sortDirection }
      : query.sortBy === "createdAt" ? { fecha_creacion: query.sortDirection }
        : { nombre: query.sortDirection };
    const [rows, totalItems] = await Promise.all([
      this.database.client.tb_estilos.findMany({ where, orderBy: [primaryOrder, { id: "asc" }], skip: paginationOffset(query.page, query.pageSize), take: query.pageSize }),
      this.database.client.tb_estilos.count({ where }),
    ]);
    return { items: rows.map((row) => this.toStyle(row)), pagination: createPageMeta(query.page, query.pageSize, totalItems) };
  }

  async createStyle(input: AnnouncementStyleInputDto): Promise<WebAnnouncementStyleItem> {
    return this.toStyle(await this.database.client.tb_estilos.create({ data: this.styleData(input) }));
  }

  async updateStyle(id: number, input: AnnouncementStyleInputDto): Promise<WebAnnouncementStyleItem> {
    return this.toStyle(await this.database.client.tb_estilos.update({ where: { id }, data: this.styleData(input) }));
  }

  async setStyleStatus(id: number, active: boolean): Promise<WebAnnouncementStyleItem> {
    return this.toStyle(await this.database.client.tb_estilos.update({ where: { id }, data: { estado: active } }));
  }

  async listAnnouncements(query: ListAnnouncementsDto): Promise<PaginatedData<WebAnnouncementItem>> {
    const search = query.search?.trim();
    const where = { ...statusWhere(query.status), ...(search ? { OR: [
      { titulo: { contains: search, mode: "insensitive" as const } },
      { descripcion: { contains: search, mode: "insensitive" as const } },
      { tb_estilos: { nombre: { contains: search, mode: "insensitive" as const } } },
      { tb_promociones: { titulo: { contains: search, mode: "insensitive" as const } } },
    ] } : {}) };
    const primaryOrder = query.sortBy === "title" ? { titulo: query.sortDirection }
      : query.sortBy === "endDate" ? { fecha_fin: query.sortDirection }
        : query.sortBy === "createdAt" ? { fecha_creacion: query.sortDirection }
          : { fecha_inicio: query.sortDirection };
    const include = this.announcementInclude();
    const [rows, totalItems] = await Promise.all([
      this.database.client.tb_anuncios.findMany({ where, include, orderBy: [primaryOrder, { id: "asc" }], skip: paginationOffset(query.page, query.pageSize), take: query.pageSize }),
      this.database.client.tb_anuncios.count({ where }),
    ]);
    return { items: rows.map((row) => this.toAnnouncement(row)), pagination: createPageMeta(query.page, query.pageSize, totalItems) };
  }

  async createAnnouncement(input: AnnouncementInputDto): Promise<WebAnnouncementItem> {
    this.validateDates(input.startDate, input.endDate);
    await this.validateAnnouncementRelations(input.styleId, input.promotionId);
    const row = await this.database.client.tb_anuncios.create({ data: this.announcementData(input, false), include: this.announcementInclude() });
    return this.toAnnouncement(row);
  }

  async updateAnnouncement(id: number, input: AnnouncementInputDto): Promise<WebAnnouncementItem> {
    this.validateDates(input.startDate, input.endDate);
    await this.validateAnnouncementRelations(input.styleId, input.promotionId);
    const row = await this.database.client.tb_anuncios.update({ where: { id }, data: this.announcementData(input), include: this.announcementInclude() });
    return this.toAnnouncement(row);
  }

  async setAnnouncementStatus(id: number, active: boolean): Promise<WebAnnouncementItem> {
    if (active) {
      const current = await this.database.client.tb_anuncios.findUnique({ where: { id }, include: this.announcementInclude() });
      if (!current) this.notFound("El anuncio solicitado no existe.");
      if (!current.tb_estilos.estado || (current.tb_promociones && !current.tb_promociones.estado)) {
        throw new AppException("RESOURCE_CONFLICT", "Active primero el estilo y la promoción vinculada.", HttpStatus.CONFLICT);
      }
    }
    const row = await this.database.client.tb_anuncios.update({ where: { id }, data: { estado: active }, include: this.announcementInclude() });
    return this.toAnnouncement(row);
  }

  async getOptions(): Promise<WebContentOptions> {
    const [styles, promotions] = await Promise.all([
      this.database.client.tb_estilos.findMany({ select: { id: true, nombre: true, estado: true }, orderBy: { nombre: "asc" } }),
      this.database.client.tb_promociones.findMany({ select: { id: true, titulo: true, estado: true }, orderBy: { titulo: "asc" } }),
    ]);
    return {
      styles: styles.map((row) => ({ id: row.id, label: row.nombre, active: row.estado })),
      promotions: promotions.map((row) => ({ id: row.id, label: row.titulo, active: row.estado })),
    };
  }

  async getPreview(): Promise<WebContentPreview> {
    const today = currentGuatemalaDate();
    const date = inputDate(today);
    const include = this.announcementInclude();
    const [contact, services, professionals, gallery, promotions, announcements] = await Promise.all([
      this.database.client.tb_contacto.findFirst({ where: { estado: true }, orderBy: { id: "asc" } }),
      this.database.client.tb_servicios.findMany({ where: { estado: true, visible_web: true }, orderBy: [{ orden_web: "asc" }, { id: "asc" }], take: 100 }),
      this.database.client.tb_medicos.findMany({ where: { estado: true, visible_web: true }, include: { tb_especialidades: { select: { nombre: true } } }, orderBy: [{ orden_web: "asc" }, { id: "asc" }], take: 100 }),
      this.database.client.tb_galeria.findMany({ where: { estado: true }, orderBy: [{ orden_web: "asc" }, { id: "asc" }], take: 100 }),
      this.database.client.tb_promociones.findMany({ where: { estado: true, fecha_inicio: { lte: date }, fecha_fin: { gte: date } }, orderBy: [{ fecha_inicio: "desc" }, { id: "asc" }], take: 100 }),
      this.database.client.tb_anuncios.findMany({ where: { estado: true, fecha_inicio: { lte: date }, fecha_fin: { gte: date }, tb_estilos: { estado: true } }, include, orderBy: [{ fecha_inicio: "desc" }, { id: "asc" }], take: 100 }),
    ]);
    return {
      generatedAt: new Date().toISOString(),
      contact: contact ? this.toContact(contact) : null,
      services: services.map((row) => this.toService(row)),
      professionals: professionals.map((row) => this.toProfessional(row)),
      gallery: gallery.map((row) => this.toGallery(row)),
      promotions: promotions.map((row) => this.toPromotion(row, today)),
      announcements: announcements.filter((row) => !row.tb_promociones || row.tb_promociones.estado).map((row) => this.toAnnouncement(row, today)),
    };
  }

  async getPublicContent(): Promise<PublicWebContent> {
    const preview = await this.getPreview();

    return {
      generatedAt: preview.generatedAt,
      contact: preview.contact ? {
        companyName: preview.contact.companyName,
        shortName: preview.contact.shortName,
        phone: preview.contact.phone,
        email: preview.contact.email,
        facebook: preview.contact.facebook,
        instagram: preview.contact.instagram,
        logoUrl: preview.contact.logoUrl,
        location: preview.contact.location,
        googleMapsUrl: preview.contact.googleMapsUrl,
        homeVideoUrl: preview.contact.homeVideoUrl,
        slogan: preview.contact.slogan,
        weekdayHours: preview.contact.weekdayHours,
        saturdayHours: preview.contact.saturdayHours,
      } : null,
      services: preview.services.map(({ id, name, description, imageUrl }) => ({ id, name, description, imageUrl })),
      professionals: preview.professionals.map(({ id, name, specialty, publicProfile, photoUrl }) => ({ id, name, specialty, publicProfile, photoUrl })),
      gallery: preview.gallery.map(({ id, title, description, imageUrl }) => ({ id, title, description, imageUrl })),
      promotions: preview.promotions.map(({ id, title, description, startDate, endDate, imageUrl }) => ({ id, title, description, startDate, endDate, imageUrl })),
      announcements: preview.announcements.map(({ id, title, description, style, promotion, startDate, endDate, imageUrl }) => ({
        id,
        title,
        description,
        style: {
          name: style.name,
          backgroundColor: style.backgroundColor,
          textColor: style.textColor,
          icon: style.icon,
          position: style.position,
        },
        promotion: promotion ? { id: promotion.id, title: promotion.title } : null,
        startDate,
        endDate,
        imageUrl,
      })),
    };
  }

  private validateDates(startDate: string, endDate: string): void {
    if (endDate < startDate) {
      throw new AppException("VALIDATION_ERROR", "La fecha final no puede ser anterior a la inicial.", HttpStatus.BAD_REQUEST, [
        { field: "endDate", message: "Debe ser igual o posterior a la fecha inicial." },
      ]);
    }
  }

  private async validateAnnouncementRelations(styleId: number, promotionId?: number | null): Promise<void> {
    const [style, promotion] = await Promise.all([
      this.database.client.tb_estilos.findUnique({ where: { id: styleId } }),
      promotionId ? this.database.client.tb_promociones.findUnique({ where: { id: promotionId } }) : Promise.resolve(null),
    ]);
    if (!style) this.notFound("El estilo seleccionado no existe.");
    if (promotionId && !promotion) this.notFound("La promoción seleccionada no existe.");
  }

  private publicationData(input: PromotionInputDto, active?: boolean) {
    return {
      titulo: input.title.trim(), descripcion: optionalText(input.description), fecha_inicio: inputDate(input.startDate),
      fecha_fin: inputDate(input.endDate), imagen_url: optionalText(input.imageUrl), ...(active === undefined ? {} : { estado: active }),
    };
  }

  private styleData(input: AnnouncementStyleInputDto) {
    return { nombre: input.name.trim(), color_fondo: input.backgroundColor.toLowerCase(), color_texto: input.textColor.toLowerCase(), icono: optionalText(input.icon), posicion: input.position };
  }

  private announcementData(input: AnnouncementInputDto, active?: boolean) {
    return {
      titulo: input.title.trim(), descripcion: optionalText(input.description), estilo_id: input.styleId,
      promocion_id: input.promotionId ?? null, fecha_inicio: inputDate(input.startDate), fecha_fin: inputDate(input.endDate),
      imagen_url: optionalText(input.imageUrl), ...(active === undefined ? {} : { estado: active }),
    };
  }

  private announcementInclude() {
    return {
      tb_estilos: { select: { id: true, nombre: true, color_fondo: true, color_texto: true, icono: true, posicion: true, estado: true } },
      tb_promociones: { select: { id: true, titulo: true, estado: true } },
    } as const;
  }

  private toContact(row: ContactRow): WebContact { return {
    id: row.id, companyName: row.nombre_empresa, shortName: row.nombre_corto, phone: row.telefono, email: row.correo,
    facebook: row.facebook, instagram: row.instagram, logoUrl: row.logo_url, location: row.ubicacion,
    googleMapsUrl: row.google_maps_url, homeVideoUrl: row.video_inicio_url, slogan: row.slogan,
    weekdayHours: row.horario_semana, saturdayHours: row.horario_sabado, active: row.estado,
    createdAt: row.fecha_creacion.toISOString(),
  }; }

  private toService(row: ServiceRow): WebServiceListItem { return {
    id: row.id, name: row.nombre, description: row.descripcion, imageUrl: row.imagen_url, clinicalActive: row.estado,
    visibleOnWeb: row.visible_web, webOrder: row.orden_web,
  }; }

  private toProfessional(row: ProfessionalRow): WebProfessionalListItem { return {
    id: row.id, name: row.nombre, specialty: row.tb_especialidades.nombre, publicProfile: row.perfil_publico,
    photoUrl: row.foto_url, clinicalActive: row.estado, visibleOnWeb: row.visible_web, webOrder: row.orden_web,
  }; }

  private toGallery(row: GalleryRow): WebGalleryItem { return {
    id: row.id, title: row.titulo, description: row.definicion, imageUrl: row.imagen_url, active: row.estado,
    webOrder: row.orden_web, createdAt: row.fecha_creacion.toISOString(),
  }; }

  private toPromotion(row: PromotionRow, today?: string): WebPromotionItem { return {
    id: row.id, title: row.titulo, description: row.descripcion, startDate: dateOnly(row.fecha_inicio), endDate: dateOnly(row.fecha_fin),
    imageUrl: row.imagen_url, active: row.estado, publicationState: publicationState(row.estado, row.fecha_inicio, row.fecha_fin, today),
    createdAt: row.fecha_creacion.toISOString(),
  }; }

  private toStyle(row: StyleRow): WebAnnouncementStyleItem { return {
    id: row.id, name: row.nombre, backgroundColor: row.color_fondo, textColor: row.color_texto, icon: row.icono,
    position: row.posicion as AnnouncementPosition, active: row.estado, createdAt: row.fecha_creacion.toISOString(),
  }; }

  private toAnnouncement(row: AnnouncementRow, today?: string): WebAnnouncementItem { return {
    id: row.id, title: row.titulo, description: row.descripcion,
    style: {
      id: row.tb_estilos.id,
      name: row.tb_estilos.nombre,
      backgroundColor: row.tb_estilos.color_fondo,
      textColor: row.tb_estilos.color_texto,
      icon: row.tb_estilos.icono,
      position: row.tb_estilos.posicion as AnnouncementPosition,
      active: row.tb_estilos.estado,
    },
    promotion: row.tb_promociones ? { id: row.tb_promociones.id, title: row.tb_promociones.titulo, active: row.tb_promociones.estado } : null,
    startDate: dateOnly(row.fecha_inicio), endDate: dateOnly(row.fecha_fin), imageUrl: row.imagen_url, active: row.estado,
    publicationState: publicationState(row.estado, row.fecha_inicio, row.fecha_fin, today), createdAt: row.fecha_creacion.toISOString(),
  }; }

  private notFound(message: string): never { throw new AppException("RESOURCE_NOT_FOUND", message, HttpStatus.NOT_FOUND); }
}
