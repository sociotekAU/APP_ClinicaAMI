import { Body, Controller, Get, HttpStatus, Param, ParseIntPipe, Patch, Post, Query, Req, Res, StreamableFile, UseGuards } from "@nestjs/common";
import type { ApiErrorDetail, ApiSuccess, AuthUser, ConsentListItem, ConsentOptions, PaginatedResponse, StudyFileListItem, StudyFileOptions } from "@ami/contracts";
import { plainToInstance } from "class-transformer";
import { validate, type ValidationError } from "class-validator";
import type { FastifyReply, FastifyRequest } from "fastify";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { AccessTokenGuard } from "../auth/guards/access-token.guard";
import { RequirePermission } from "../authorization/decorators/require-permission.decorator";
import { PermissionGuard } from "../authorization/guards/permission.guard";
import { AppException } from "../common/errors/app.exception";
import { ClinicalDocumentsService } from "./clinical-documents.service";
import { ConsentInputDto, ConsentStatusDto, StudyFileMetadataDto, StudyFileStatusDto, StudyFileUploadDto } from "./dto/clinical-documents-input.dto";
import { ListConsentsDto, ListStudyFilesDto } from "./dto/list-clinical-documents.dto";
import { PrivateStorageService, type ResolvedPrivateFile } from "./private-storage.service";

type DtoConstructor<T extends object> = new () => T;

function validationDetails(errors: ValidationError[], prefix = ""): ApiErrorDetail[] {
  return errors.flatMap((error) => {
    const field = prefix ? `${prefix}.${error.property}` : error.property;
    const own = Object.values(error.constraints ?? {}).map((message) => ({ field, message }));
    return [...own, ...validationDetails(error.children ?? [], field)];
  });
}

async function multipartPayload<T extends object>(request: FastifyRequest, type: DtoConstructor<T>): Promise<{ dto: T; buffer: Buffer; filename: string }> {
  let part;
  try { part = await request.file(); }
  catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "FST_REQ_FILE_TOO_LARGE") {
      throw new AppException("FILE_TOO_LARGE", "El archivo supera el máximo permitido de 10 MB.", HttpStatus.PAYLOAD_TOO_LARGE);
    }
    throw error;
  }
  if (!part) throw new AppException("VALIDATION_ERROR", "Seleccione un archivo para continuar.", HttpStatus.BAD_REQUEST, [{ field: "file", message: "El archivo es obligatorio." }]);
  let buffer: Buffer;
  try { buffer = await part.toBuffer(); }
  catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "FST_REQ_FILE_TOO_LARGE") {
      throw new AppException("FILE_TOO_LARGE", "El archivo supera el máximo permitido de 10 MB.", HttpStatus.PAYLOAD_TOO_LARGE);
    }
    throw error;
  }
  const fields = Object.fromEntries(Object.entries(part.fields).flatMap(([key, value]) => {
    const selected = Array.isArray(value) ? value[0] : value;
    return selected?.type === "field" ? [[key, selected.value]] : [];
  }));
  const dto = plainToInstance(type, fields, { enableImplicitConversion: true });
  const errors = await validate(dto, { forbidNonWhitelisted: true, whitelist: true });
  if (errors.length > 0) throw new AppException("VALIDATION_ERROR", "Revise los datos del formulario.", HttpStatus.BAD_REQUEST, validationDetails(errors));
  return { dto, buffer, filename: part.filename };
}

function configureFileReply(reply: FastifyReply, file: ResolvedPrivateFile, disposition: "attachment" | "inline"): void {
  const asciiName = file.originalName.replace(/[^\x20-\x7E]/g, "_").replace(/["\\]/g, "_");
  reply.header("Cache-Control", "private, no-store, max-age=0");
  reply.header("Content-Disposition", `${disposition}; filename="${asciiName}"; filename*=UTF-8''${encodeURIComponent(file.originalName)}`);
  reply.header("Content-Length", String(file.sizeBytes));
  reply.header("Content-Type", file.mimeType);
  reply.header("X-Content-SHA256", file.sha256);
}

@Controller("study-files")
@UseGuards(AccessTokenGuard, PermissionGuard)
export class StudyFilesController {
  constructor(private readonly documents: ClinicalDocumentsService, private readonly storage: PrivateStorageService) {}

  @Get("options") @RequirePermission("archivos_estudios", "read")
  async options(@CurrentUser() user: AuthUser): Promise<ApiSuccess<StudyFileOptions>> { return this.success(await this.documents.studyOptions(user)); }

  @Get() @RequirePermission("archivos_estudios", "read")
  async list(@Query() query: ListStudyFilesDto, @CurrentUser() user: AuthUser): Promise<PaginatedResponse<StudyFileListItem>> { return this.paginated(await this.documents.listStudies(query, user)); }

  @Post() @RequirePermission("archivos_estudios", "write")
  async create(@Req() request: FastifyRequest, @CurrentUser() user: AuthUser): Promise<ApiSuccess<StudyFileListItem>> {
    const upload = await multipartPayload(request, StudyFileUploadDto);
    const stored = await this.storage.save("studies", upload);
    return this.success(await this.documents.createStudy(upload.dto, stored, user));
  }

  @Patch(":id") @RequirePermission("archivos_estudios", "write")
  async update(@Param("id", ParseIntPipe) id: number, @Body() input: StudyFileMetadataDto, @CurrentUser() user: AuthUser): Promise<ApiSuccess<StudyFileListItem>> { return this.success(await this.documents.updateStudy(id, input, user)); }

  @Patch(":id/status") @RequirePermission("archivos_estudios", "write")
  async status(@Param("id", ParseIntPipe) id: number, @Body() input: StudyFileStatusDto, @CurrentUser() user: AuthUser): Promise<ApiSuccess<StudyFileListItem>> { return this.success(await this.documents.setStudyStatus(id, input, user)); }

  @Get(":id/preview") @RequirePermission("archivos_estudios", "read")
  async preview(@Param("id", ParseIntPipe) id: number, @CurrentUser() user: AuthUser, @Res({ passthrough: true }) reply: FastifyReply): Promise<StreamableFile> { const file = await this.documents.readStudy(id, user); configureFileReply(reply, file, "inline"); return new StreamableFile(file.buffer); }

  @Get(":id/download") @RequirePermission("archivos_estudios", "read")
  async download(@Param("id", ParseIntPipe) id: number, @CurrentUser() user: AuthUser, @Res({ passthrough: true }) reply: FastifyReply): Promise<StreamableFile> { const file = await this.documents.readStudy(id, user); configureFileReply(reply, file, "attachment"); return new StreamableFile(file.buffer); }

  private success<T>(data: T): ApiSuccess<T> { return { data, meta: { timestamp: new Date().toISOString() } }; }
  private paginated<T>(result: { items: T[]; pagination: PaginatedResponse<T>["pagination"] }): PaginatedResponse<T> { return { data: result.items, pagination: result.pagination, meta: { timestamp: new Date().toISOString() } }; }
}

@Controller("consents")
@UseGuards(AccessTokenGuard, PermissionGuard)
export class ConsentsController {
  constructor(private readonly documents: ClinicalDocumentsService, private readonly storage: PrivateStorageService) {}

  @Get("options") @RequirePermission("consentimientos", "read")
  async options(@CurrentUser() user: AuthUser): Promise<ApiSuccess<ConsentOptions>> { return this.success(await this.documents.consentOptions(user)); }

  @Get() @RequirePermission("consentimientos", "read")
  async list(@Query() query: ListConsentsDto, @CurrentUser() user: AuthUser): Promise<PaginatedResponse<ConsentListItem>> { return this.paginated(await this.documents.listConsents(query, user)); }

  @Post() @RequirePermission("consentimientos", "write")
  async create(@Body() input: ConsentInputDto, @CurrentUser() user: AuthUser): Promise<ApiSuccess<ConsentListItem>> { return this.success(await this.documents.createConsent(input, user)); }

  @Patch(":id") @RequirePermission("consentimientos", "write")
  async update(@Param("id", ParseIntPipe) id: number, @Body() input: ConsentInputDto, @CurrentUser() user: AuthUser): Promise<ApiSuccess<ConsentListItem>> { return this.success(await this.documents.updateConsent(id, input, user)); }

  @Post(":id/document") @RequirePermission("consentimientos", "write")
  async attach(@Param("id", ParseIntPipe) id: number, @Req() request: FastifyRequest, @CurrentUser() user: AuthUser): Promise<ApiSuccess<ConsentListItem>> {
    const upload = await multipartPayload(request, class EmptyUploadDto {});
    const stored = await this.storage.save("consents", upload);
    return this.success(await this.documents.attachConsentDocument(id, stored, user));
  }

  @Patch(":id/status") @RequirePermission("consentimientos", "write")
  async status(@Param("id", ParseIntPipe) id: number, @Body() input: ConsentStatusDto, @CurrentUser() user: AuthUser): Promise<ApiSuccess<ConsentListItem>> { return this.success(await this.documents.setConsentStatus(id, input, user)); }

  @Get(":id/preview") @RequirePermission("consentimientos", "read")
  async preview(@Param("id", ParseIntPipe) id: number, @CurrentUser() user: AuthUser, @Res({ passthrough: true }) reply: FastifyReply): Promise<StreamableFile> { const file = await this.documents.readConsent(id, user); configureFileReply(reply, file, "inline"); return new StreamableFile(file.buffer); }

  @Get(":id/download") @RequirePermission("consentimientos", "read")
  async download(@Param("id", ParseIntPipe) id: number, @CurrentUser() user: AuthUser, @Res({ passthrough: true }) reply: FastifyReply): Promise<StreamableFile> { const file = await this.documents.readConsent(id, user); configureFileReply(reply, file, "attachment"); return new StreamableFile(file.buffer); }

  private success<T>(data: T): ApiSuccess<T> { return { data, meta: { timestamp: new Date().toISOString() } }; }
  private paginated<T>(result: { items: T[]; pagination: PaginatedResponse<T>["pagination"] }): PaginatedResponse<T> { return { data: result.items, pagination: result.pagination, meta: { timestamp: new Date().toISOString() } }; }
}
