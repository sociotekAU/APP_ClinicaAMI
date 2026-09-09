import { Type } from "class-transformer";
import {
  IsBoolean,
  IsDateString,
  IsEmail,
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

const PASSWORD_POLICY = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).+$/;
const OPTIONAL_MEDIA_URL = /^(\/[^\s]*|https?:\/\/[^\s]+)$/i;

class NamedDescriptionInputDto {
  @IsString({ message: "name debe ser texto." })
  @MinLength(2, { message: "name debe tener al menos 2 caracteres." })
  @MaxLength(150, { message: "name no puede superar 150 caracteres." })
  name!: string;

  @IsOptional()
  @IsString({ message: "description debe ser texto." })
  @MaxLength(2000, { message: "description no puede superar 2000 caracteres." })
  description?: string;
}

export class SpecialtyInputDto extends NamedDescriptionInputDto {
  @IsOptional()
  @IsBoolean({ message: "psychologicalRecordEligible debe ser verdadero o falso." })
  psychologicalRecordEligible?: boolean;
}

export class ServiceInputDto extends NamedDescriptionInputDto {
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 }, { message: "price debe ser un monto válido." })
  @Min(0, { message: "price no puede ser negativo." })
  @Max(99_999_999.99, { message: "price supera el máximo permitido." })
  price!: number;

  @IsOptional()
  @IsString({ message: "imageUrl debe ser texto." })
  @MaxLength(255, { message: "imageUrl no puede superar 255 caracteres." })
  @Matches(OPTIONAL_MEDIA_URL, {
    message: "imageUrl debe ser una ruta local o una dirección http/https válida.",
  })
  imageUrl?: string;
}

export class ProfessionalInputDto {
  @IsString({ message: "name debe ser texto." })
  @MinLength(2, { message: "name debe tener al menos 2 caracteres." })
  @MaxLength(150, { message: "name no puede superar 150 caracteres." })
  name!: string;

  @IsOptional()
  @Matches(/^\d{13}$/, { message: "dpi debe contener exactamente 13 dígitos." })
  dpi?: string;

  @IsOptional()
  @IsString({ message: "licenseNumber debe ser texto." })
  @MaxLength(50, { message: "licenseNumber no puede superar 50 caracteres." })
  licenseNumber?: string;

  @IsOptional()
  @IsString({ message: "phone debe ser texto." })
  @MaxLength(20, { message: "phone no puede superar 20 caracteres." })
  phone?: string;

  @IsOptional()
  @IsEmail({}, { message: "email debe ser una dirección válida." })
  @MaxLength(150, { message: "email no puede superar 150 caracteres." })
  email?: string;

  @IsOptional()
  @IsDateString({}, { message: "startDate debe ser una fecha válida." })
  startDate?: string;

  @Type(() => Number)
  @IsInt({ message: "specialtyId debe ser un número entero." })
  @Min(1, { message: "specialtyId debe ser mayor que cero." })
  specialtyId!: number;
}

export class UserCreateInputDto {
  @IsString({ message: "username debe ser texto." })
  @Matches(/^[a-zA-Z0-9._-]+$/, {
    message: "username solo admite letras, números, punto, guion y guion bajo.",
  })
  @MinLength(3, { message: "username debe tener al menos 3 caracteres." })
  @MaxLength(80, { message: "username no puede superar 80 caracteres." })
  username!: string;

  @IsString({ message: "name debe ser texto." })
  @MinLength(2, { message: "name debe tener al menos 2 caracteres." })
  @MaxLength(150, { message: "name no puede superar 150 caracteres." })
  name!: string;

  @IsOptional()
  @IsEmail({}, { message: "email debe ser una dirección válida." })
  @MaxLength(150, { message: "email no puede superar 150 caracteres." })
  email?: string;

  @Type(() => Number)
  @IsInt({ message: "roleId debe ser un número entero." })
  @Min(1, { message: "roleId debe ser mayor que cero." })
  roleId!: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: "professionalId debe ser un número entero." })
  @Min(1, { message: "professionalId debe ser mayor que cero." })
  professionalId?: number | null;

  @IsString({ message: "temporaryPassword debe ser texto." })
  @MinLength(12, { message: "temporaryPassword debe tener al menos 12 caracteres." })
  @MaxLength(128, { message: "temporaryPassword no puede superar 128 caracteres." })
  @Matches(PASSWORD_POLICY, {
    message: "temporaryPassword debe incluir mayúscula, minúscula, número y símbolo.",
  })
  temporaryPassword!: string;
}

export class UserUpdateInputDto {
  @IsString({ message: "name debe ser texto." })
  @MinLength(2, { message: "name debe tener al menos 2 caracteres." })
  @MaxLength(150, { message: "name no puede superar 150 caracteres." })
  name!: string;

  @IsOptional()
  @IsEmail({}, { message: "email debe ser una dirección válida." })
  @MaxLength(150, { message: "email no puede superar 150 caracteres." })
  email?: string;

  @Type(() => Number)
  @IsInt({ message: "roleId debe ser un número entero." })
  @Min(1, { message: "roleId debe ser mayor que cero." })
  roleId!: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: "professionalId debe ser un número entero." })
  @Min(1, { message: "professionalId debe ser mayor que cero." })
  professionalId?: number | null;
}

export class StatusInputDto {
  @IsBoolean({ message: "active debe ser verdadero o falso." })
  active!: boolean;
}
