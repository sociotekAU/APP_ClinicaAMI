import { Type } from "class-transformer";
import { IsBoolean, IsIn, IsInt, IsOptional, IsString, MaxLength, Min, MinLength } from "class-validator";
import type { ConsentStatus } from "@ami/contracts";

export class StudyFileUploadDto {
  @Type(() => Number) @IsInt() @Min(1)
  patientId!: number;

  @Type(() => Number) @IsInt() @Min(1)
  consultationId!: number;

  @IsString() @MinLength(2) @MaxLength(100)
  studyType!: string;

  @IsOptional() @IsString() @MaxLength(10_000)
  description?: string;
}

export class StudyFileMetadataDto {
  @IsString() @MinLength(2) @MaxLength(100)
  studyType!: string;

  @IsOptional() @IsString() @MaxLength(10_000)
  description?: string;
}

export class StudyFileStatusDto {
  @Type(() => Boolean) @IsBoolean()
  active!: boolean;

  @IsString() @MinLength(5) @MaxLength(2000)
  reason!: string;
}

export class ConsentInputDto {
  @Type(() => Number) @IsInt() @Min(1)
  patientId!: number;

  @Type(() => Number) @IsInt() @Min(1)
  serviceId!: number;

  @IsOptional() @IsString() @MaxLength(10_000)
  observations?: string;
}

export class ConsentStatusDto {
  @IsIn(["firmado", "rechazado", "revocado"])
  status!: Exclude<ConsentStatus, "pendiente">;

  @IsString() @MinLength(5) @MaxLength(2000)
  reason!: string;
}
