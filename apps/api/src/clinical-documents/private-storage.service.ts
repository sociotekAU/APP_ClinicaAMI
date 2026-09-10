import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, rm } from "node:fs/promises";
import { basename, extname, resolve, sep } from "node:path";
import { HttpStatus, Injectable } from "@nestjs/common";
import { AppException } from "../common/errors/app.exception";

const TEN_MIB = 10 * 1024 * 1024;
const SIGNATURES = [
  { mimeType: "application/pdf", extension: ".pdf", matches: (data: Buffer) => data.subarray(0, 5).toString("ascii") === "%PDF-" },
  { mimeType: "image/png", extension: ".png", matches: (data: Buffer) => data.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) },
  { mimeType: "image/jpeg", extension: ".jpg", matches: (data: Buffer) => data.length >= 3 && data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff },
  { mimeType: "image/webp", extension: ".webp", matches: (data: Buffer) => data.subarray(0, 4).toString("ascii") === "RIFF" && data.subarray(8, 12).toString("ascii") === "WEBP" },
] as const;

export interface StoredPrivateFile {
  relativePath: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  sha256: string;
}

export interface ResolvedPrivateFile extends StoredPrivateFile {
  buffer: Buffer;
}

@Injectable()
export class PrivateStorageService {
  private readonly root = resolve(process.env.PRIVATE_STORAGE_ROOT ?? resolve(process.cwd(), "storage/private"));

  async save(category: "consents" | "studies", input: { buffer: Buffer; filename: string }): Promise<StoredPrivateFile> {
    if (input.buffer.length === 0) throw new AppException("VALIDATION_ERROR", "El archivo está vacío.", HttpStatus.BAD_REQUEST);
    if (input.buffer.length > TEN_MIB) throw new AppException("FILE_TOO_LARGE", "El archivo supera el máximo permitido de 10 MB.", HttpStatus.PAYLOAD_TOO_LARGE);
    const signature = SIGNATURES.find((candidate) => candidate.matches(input.buffer));
    if (!signature) throw new AppException("FILE_TYPE_NOT_ALLOWED", "Solo se permiten documentos PDF e imágenes JPG, PNG o WEBP.", HttpStatus.UNSUPPORTED_MEDIA_TYPE);
    const directory = this.safePath(category);
    await mkdir(directory, { recursive: true });
    const relativePath = `${category}/${randomUUID()}${signature.extension}`;
    const absolutePath = this.safePath(relativePath);
    const { writeFile } = await import("node:fs/promises");
    try { await writeFile(absolutePath, input.buffer, { flag: "wx", mode: 0o600 }); }
    catch { throw new AppException("FILE_STORAGE_ERROR", "No fue posible almacenar el archivo privado.", HttpStatus.INTERNAL_SERVER_ERROR); }
    return {
      relativePath,
      originalName: this.safeOriginalName(input.filename, signature.extension),
      mimeType: signature.mimeType,
      sizeBytes: input.buffer.length,
      sha256: createHash("sha256").update(input.buffer).digest("hex"),
    };
  }

  async resolveForRead(metadata: StoredPrivateFile): Promise<ResolvedPrivateFile> {
    let buffer: Buffer;
    try { buffer = await readFile(this.safePath(metadata.relativePath)); }
    catch { throw new AppException("RESOURCE_NOT_FOUND", "El archivo físico no está disponible en el almacenamiento privado.", HttpStatus.NOT_FOUND); }
    const digest = createHash("sha256").update(buffer).digest("hex");
    if (digest !== metadata.sha256 || buffer.length !== metadata.sizeBytes) {
      throw new AppException("FILE_INTEGRITY_ERROR", "La integridad del archivo no pudo verificarse.", HttpStatus.CONFLICT);
    }
    return { ...metadata, buffer };
  }

  async discard(relativePath: string | null | undefined): Promise<void> {
    if (!relativePath) return;
    try { await rm(this.safePath(relativePath), { force: true }); } catch { /* El registro de BD conserva la trazabilidad. */ }
  }

  private safePath(relativePath: string): string {
    const absolute = resolve(this.root, relativePath);
    if (absolute !== this.root && !absolute.startsWith(`${this.root}${sep}`)) {
      throw new AppException("FILE_STORAGE_ERROR", "La ruta privada solicitada no es válida.", HttpStatus.BAD_REQUEST);
    }
    return absolute;
  }

  private safeOriginalName(filename: string, fallbackExtension: string): string {
    const normalized = basename(filename || `documento${fallbackExtension}`).replace(/[\u0000-\u001f<>:"/\\|?*]/g, "_").trim();
    const extension = extname(normalized) || fallbackExtension;
    const stem = basename(normalized, extname(normalized)).slice(0, Math.max(1, 255 - extension.length));
    return `${stem || "documento"}${extension}`.slice(0, 255);
  }
}
