import "reflect-metadata";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { describe, expect, it } from "vitest";
import { AppointmentInputDto, ClinicalRecordInputDto, PatientInputDto, VitalSignsInputDto } from "./care-input.dto";
import { ListAppointmentsDto, ListPatientsDto } from "./list-care.dto";

describe("care DTOs", () => {
  it("transforma paginación y filtros de agenda", async () => {
    const query = plainToInstance(ListAppointmentsDto, { page: "2", pageSize: "20", professionalId: "4", status: "programada" });
    expect(await validate(query)).toHaveLength(0);
    expect(query).toMatchObject({ page: 2, pageSize: 20, professionalId: 4, status: "programada" });
  });

  it("rechaza estados y relaciones fuera del contrato", async () => {
    const query = plainToInstance(ListPatientsDto, { status: "deleted", sortBy: "password" });
    const appointment = plainToInstance(AppointmentInputDto, { patientId: 0, professionalId: 0, scheduledAt: "ayer", reason: "x" });
    expect((await validate(query)).map((error) => error.property)).toEqual(expect.arrayContaining(["status", "sortBy"]));
    expect((await validate(appointment)).map((error) => error.property)).toEqual(expect.arrayContaining(["patientId", "professionalId", "scheduledAt", "reason"]));
  });

  it("valida datos clínicos y de paciente", async () => {
    const patient = plainToInstance(PatientInputDto, { firstNames: "A", lastNames: "B", birthDate: "no", phone: "1", email: "incorrecto", bloodType: "X" });
    const record = plainToInstance(ClinicalRecordInputDto, { appointmentId: 0, consultationReason: "x", diagnosisCie10: "incorrecto" });
    const vital = plainToInstance(VitalSignsInputDto, { bloodPressure: "alta", heartRate: 900, temperature: 80 });
    expect((await validate(patient)).map((error) => error.property)).toEqual(expect.arrayContaining(["firstNames", "lastNames", "birthDate", "phone", "email", "bloodType"]));
    expect((await validate(record)).map((error) => error.property)).toEqual(expect.arrayContaining(["appointmentId", "consultationReason", "diagnosisCie10"]));
    expect((await validate(vital)).map((error) => error.property)).toEqual(expect.arrayContaining(["bloodPressure", "heartRate", "temperature"]));
  });
});
