import "reflect-metadata";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { describe, expect, it } from "vitest";
import { ConsentInputDto, ConsentStatusDto, StudyFileStatusDto, StudyFileUploadDto } from "./clinical-documents-input.dto";
import { ListConsentsDto, ListStudyFilesDto } from "./list-clinical-documents.dto";

describe("clinical documents DTOs", () => {
  it("transforma identificadores multipart y acepta filtros válidos", async () => {
    const upload = plainToInstance(StudyFileUploadDto, { patientId: "4", consultationId: "7", studyType: "Radiografía" });
    const studies = plainToInstance(ListStudyFilesDto, { page: "2", pageSize: "20", status: "inactive", sortBy: "patient" });
    const consents = plainToInstance(ListConsentsDto, { status: "revocado", sortBy: "service" });

    expect(await validate(upload)).toHaveLength(0);
    expect(upload).toMatchObject({ patientId: 4, consultationId: 7 });
    expect(await validate(studies)).toHaveLength(0);
    expect(await validate(consents)).toHaveLength(0);
  });

  it("rechaza relaciones inválidas, motivos breves y estados no permitidos", async () => {
    const consent = plainToInstance(ConsentInputDto, { patientId: 0, serviceId: 0 });
    const studyStatus = plainToInstance(StudyFileStatusDto, { active: false, reason: "no" });
    const consentStatus = plainToInstance(ConsentStatusDto, { status: "pendiente", reason: "cambio válido" });

    expect((await validate(consent)).map((error) => error.property)).toEqual(expect.arrayContaining(["patientId", "serviceId"]));
    expect((await validate(studyStatus)).map((error) => error.property)).toContain("reason");
    expect((await validate(consentStatus)).map((error) => error.property)).toContain("status");
  });
});
