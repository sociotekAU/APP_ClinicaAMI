import type { AuthUser } from "@ami/contracts";
import { describe, expect, it, vi } from "vitest";
import type { CareAccessService } from "../care/care-access.service";
import type { DatabaseService } from "../database/database.service";
import { ClinicalDocumentsService } from "./clinical-documents.service";
import type { PrivateStorageService, StoredPrivateFile } from "./private-storage.service";

const user: AuthUser = { id: 1, username: "admin_ami", name: "Administrador", role: { id: 1, name: "Administrador" }, mustChangePassword: false };
const stored: StoredPrivateFile = { relativePath: "studies/id.pdf", originalName: "estudio.pdf", mimeType: "application/pdf", sizeBytes: 20, sha256: "a".repeat(64) };

function access(): CareAccessService {
  return { professionalScope: vi.fn().mockResolvedValue(null) } as unknown as CareAccessService;
}

describe("ClinicalDocumentsService", () => {
  it("descarta el archivo si la consulta no pertenece al paciente", async () => {
    const discard = vi.fn().mockResolvedValue(undefined);
    const database = { client: { tb_consultas: { findFirst: vi.fn().mockResolvedValue({ tb_citas: { id_paciente: 9, tb_pacientes: { estado: true } } }) }, tb_archivos_estudios: { create: vi.fn() } } } as unknown as DatabaseService;
    const service = new ClinicalDocumentsService(database, access(), { discard } as unknown as PrivateStorageService);

    await expect(service.createStudy({ patientId: 4, consultationId: 7, studyType: "Radiografía" }, stored, user)).rejects.toMatchObject({ code: "RESOURCE_CONFLICT" });
    expect(discard).toHaveBeenCalledWith(stored.relativePath);
  });

  it("impide firmar un consentimiento que no tiene documento íntegramente registrado", async () => {
    const update = vi.fn();
    const database = { client: { tb_consentimientos_informados: { findFirst: vi.fn().mockResolvedValue({ estado_firma: "pendiente", ruta_documento: null, nombre_original: null, tipo_mime: null, tamano_bytes: null, hash_sha256: null }), update } } } as unknown as DatabaseService;
    const service = new ClinicalDocumentsService(database, access(), {} as PrivateStorageService);

    await expect(service.setConsentStatus(3, { status: "firmado", reason: "Firma confirmada" }, user)).rejects.toMatchObject({ code: "RESOURCE_CONFLICT" });
    expect(update).not.toHaveBeenCalled();
  });

  it("descarta un reemplazo cuando el consentimiento ya fue finalizado", async () => {
    const discard = vi.fn().mockResolvedValue(undefined);
    const database = { client: { tb_consentimientos_informados: { findFirst: vi.fn().mockResolvedValue({ estado_firma: "firmado" }) } } } as unknown as DatabaseService;
    const service = new ClinicalDocumentsService(database, access(), { discard } as unknown as PrivateStorageService);

    await expect(service.attachConsentDocument(5, { ...stored, relativePath: "consents/new.pdf" }, user)).rejects.toMatchObject({ code: "RESOURCE_CONFLICT" });
    expect(discard).toHaveBeenCalledWith("consents/new.pdf");
  });
});
