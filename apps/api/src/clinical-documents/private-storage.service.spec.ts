import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { PrivateStorageService } from "./private-storage.service";

describe("PrivateStorageService", () => {
  let root: string;
  let service: PrivateStorageService;

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), "ami-private-files-"));
    process.env.PRIVATE_STORAGE_ROOT = root;
    service = new PrivateStorageService();
  });

  afterEach(async () => {
    delete process.env.PRIVATE_STORAGE_ROOT;
    await rm(root, { recursive: true, force: true });
  });

  it("detecta el tipo real, normaliza el nombre y verifica la huella", async () => {
    const buffer = Buffer.from("%PDF-1.7\ncontenido de prueba");
    const stored = await service.save("studies", { buffer, filename: "resultado:final" });
    const resolved = await service.resolveForRead(stored);

    expect(stored.relativePath).toMatch(/^studies\/[\da-f-]+\.pdf$/);
    expect(stored.originalName).toBe("resultado_final.pdf");
    expect(stored.sha256).toHaveLength(64);
    expect(resolved.buffer).toEqual(buffer);
  });

  it("rechaza contenido ejecutable aunque el nombre aparente ser PDF", async () => {
    await expect(service.save("consents", { buffer: Buffer.from("MZ-not-a-pdf"), filename: "consentimiento.pdf" })).rejects.toMatchObject({ code: "FILE_TYPE_NOT_ALLOWED" });
  });

  it("detecta alteraciones físicas antes de entregar un documento", async () => {
    const stored = await service.save("consents", { buffer: Buffer.from("%PDF-1.7\noriginal"), filename: "consentimiento.pdf" });
    await writeFile(join(root, stored.relativePath), Buffer.from("%PDF-1.7\nalterado"));
    await expect(service.resolveForRead(stored)).rejects.toMatchObject({ code: "FILE_INTEGRITY_ERROR" });
  });
});
