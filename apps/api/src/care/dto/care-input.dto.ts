import { Type } from "class-transformer";
import {
  IsBoolean,
  IsDateString,
  IsEmail,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from "class-validator";
import type { AppointmentStatus } from "@ami/contracts";

export class PatientInputDto {
  @IsString({ message: "firstNames debe ser texto." })
  @MinLength(2, { message: "firstNames debe tener al menos 2 caracteres." })
  @MaxLength(150, { message: "firstNames no puede superar 150 caracteres." })
  firstNames!: string;

  @IsString({ message: "lastNames debe ser texto." })
  @MinLength(2, { message: "lastNames debe tener al menos 2 caracteres." })
  @MaxLength(150, { message: "lastNames no puede superar 150 caracteres." })
  lastNames!: string;

  @IsDateString({}, { message: "birthDate debe ser una fecha válida." })
  birthDate!: string;

  @IsOptional()
  @IsIn(["Femenino", "Masculino", "No especificado", "Otro"], {
    message: "gender no corresponde a una opción válida.",
  })
  gender?: string;

  @IsString({ message: "phone debe ser texto." })
  @MinLength(4, { message: "phone debe tener al menos 4 caracteres." })
  @MaxLength(20, { message: "phone no puede superar 20 caracteres." })
  phone!: string;

  @IsOptional()
  @IsEmail({}, { message: "email debe ser una dirección válida." })
  @MaxLength(150, { message: "email no puede superar 150 caracteres." })
  email?: string;

  @IsOptional()
  @IsIn(["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"], {
    message: "bloodType no corresponde a un tipo de sangre válido.",
  })
  bloodType?: string;

  @IsOptional()
  @IsString({ message: "personalHistory debe ser texto." })
  @MaxLength(10_000, { message: "personalHistory no puede superar 10000 caracteres." })
  personalHistory?: string;
}

export class AppointmentInputDto {
  @Type(() => Number)
  @IsInt({ message: "patientId debe ser un número entero." })
  @Min(1, { message: "patientId debe ser mayor que cero." })
  patientId!: number;

  @Type(() => Number)
  @IsInt({ message: "professionalId debe ser un número entero." })
  @Min(1, { message: "professionalId debe ser mayor que cero." })
  professionalId!: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: "clinicId debe ser un número entero." })
  @Min(1, { message: "clinicId debe ser mayor que cero." })
  clinicId?: number | null;

  @IsDateString({}, { message: "scheduledAt debe ser una fecha y hora válida." })
  scheduledAt!: string;

  @IsString({ message: "reason debe ser texto." })
  @MinLength(3, { message: "reason debe tener al menos 3 caracteres." })
  @MaxLength(255, { message: "reason no puede superar 255 caracteres." })
  reason!: string;
}

export class AppointmentStatusInputDto {
  @IsIn(["programada", "completada", "cancelada", "no_asistio"], {
    message: "status no corresponde a un estado de cita válido.",
  })
  status!: AppointmentStatus;
}

export class ClinicInputDto {
  @IsString({ message: "number debe ser texto." })
  @MinLength(1, { message: "number es obligatorio." })
  @MaxLength(30, { message: "number no puede superar 30 caracteres." })
  number!: string;

  @IsString({ message: "room debe ser texto." })
  @MinLength(2, { message: "room debe tener al menos 2 caracteres." })
  @MaxLength(100, { message: "room no puede superar 100 caracteres." })
  room!: string;

  @IsString({ message: "schedule debe ser texto." })
  @MinLength(3, { message: "schedule debe tener al menos 3 caracteres." })
  @MaxLength(2000, { message: "schedule no puede superar 2000 caracteres." })
  schedule!: string;

  @Type(() => Number)
  @IsInt({ message: "professionalId debe ser un número entero." })
  @Min(1, { message: "professionalId debe ser mayor que cero." })
  professionalId!: number;
}

export class ClinicalRecordInputDto {
  @Type(() => Number)
  @IsInt({ message: "appointmentId debe ser un número entero." })
  @Min(1, { message: "appointmentId debe ser mayor que cero." })
  appointmentId!: number;

  @IsString({ message: "consultationReason debe ser texto." })
  @MinLength(3, { message: "consultationReason debe tener al menos 3 caracteres." })
  @MaxLength(10_000, { message: "consultationReason no puede superar 10000 caracteres." })
  consultationReason!: string;

  @IsOptional()
  @IsString({ message: "evolutionNotes debe ser texto." })
  @MaxLength(20_000, { message: "evolutionNotes no puede superar 20000 caracteres." })
  evolutionNotes?: string;

  @IsOptional()
  @IsString({ message: "diagnosisCie10 debe ser texto." })
  @Matches(/^[A-Za-z][0-9]{2}(?:\.[0-9A-Za-z]{1,4})?$/, {
    message: "diagnosisCie10 no tiene un formato CIE-10 válido.",
  })
  @MaxLength(20, { message: "diagnosisCie10 no puede superar 20 caracteres." })
  diagnosisCie10?: string;
}

export class VitalSignsInputDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 }, { message: "weightKg debe ser un número válido." })
  @Min(0.5, { message: "weightKg debe ser al menos 0.5 kg." })
  @Max(500, { message: "weightKg no puede superar 500 kg." })
  weightKg?: number | null;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 }, { message: "heightCm debe ser un número válido." })
  @Min(0.5, { message: "heightCm debe ser al menos 0.5 m o 50 cm." })
  @Max(300, { message: "heightCm no puede superar 300 cm." })
  heightCm?: number | null;

  @IsOptional()
  @IsString({ message: "bloodPressure debe ser texto." })
  @Matches(/^\d{2,3}\/\d{2,3}$/, { message: "bloodPressure debe usar el formato 120/80." })
  @MaxLength(20)
  bloodPressure?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: "heartRate debe ser un número entero." })
  @Min(1, { message: "heartRate debe ser mayor que cero." })
  @Max(300, { message: "heartRate supera el máximo permitido." })
  heartRate?: number | null;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 1 }, { message: "temperature debe ser un número válido." })
  @Min(25, { message: "temperature debe ser al menos 25 °C." })
  @Max(50, { message: "temperature no puede superar 50 °C." })
  temperature?: number | null;
}

export class BooleanStatusInputDto {
  @IsBoolean({ message: "active debe ser verdadero o falso." })
  active!: boolean;
}
