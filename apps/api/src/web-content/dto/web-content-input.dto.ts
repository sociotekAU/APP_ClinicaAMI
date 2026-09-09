import { Type } from "class-transformer";
import {
  IsBoolean,
  IsEmail,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
  MinLength,
} from "class-validator";
import type { AnnouncementPosition } from "@ami/contracts";

const MEDIA_URL = /^(\/[^\s]*|https?:\/\/[^\s]+)$/i;
const WEB_URL = /^https?:\/\/[^\s]+$/i;
const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;
const HEX_COLOR = /^#[0-9a-f]{6}$/i;
const POSITIONS: AnnouncementPosition[] = [
  "inferior_derecha",
  "inferior_izquierda",
  "superior_derecha",
  "superior_izquierda",
  "centro",
];

function optionalMedia(property: string) {
  return Matches(MEDIA_URL, { message: `${property} debe ser una ruta local o una dirección http/https válida.` });
}

export class WebContactInputDto {
  @IsString({ message: "companyName debe ser texto." })
  @MinLength(2, { message: "companyName debe tener al menos 2 caracteres." })
  @MaxLength(150, { message: "companyName no puede superar 150 caracteres." })
  companyName!: string;

  @IsOptional() @IsString() @MaxLength(100) shortName?: string;
  @IsString({ message: "phone debe ser texto." }) @MinLength(4) @MaxLength(20) phone!: string;
  @IsOptional() @IsEmail({}, { message: "email debe ser una dirección válida." }) @MaxLength(150) email?: string;
  @IsOptional() @Matches(WEB_URL, { message: "facebook debe ser una dirección http/https válida." }) @MaxLength(255) facebook?: string;
  @IsOptional() @Matches(WEB_URL, { message: "instagram debe ser una dirección http/https válida." }) @MaxLength(255) instagram?: string;
  @IsOptional() @optionalMedia("logoUrl") @MaxLength(255) logoUrl?: string;

  @IsString({ message: "location debe ser texto." })
  @MinLength(3, { message: "location debe tener al menos 3 caracteres." })
  @MaxLength(255, { message: "location no puede superar 255 caracteres." })
  location!: string;

  @IsOptional() @Matches(WEB_URL, { message: "googleMapsUrl debe ser una dirección http/https válida." }) @MaxLength(500) googleMapsUrl?: string;
  @IsOptional() @optionalMedia("homeVideoUrl") @MaxLength(500) homeVideoUrl?: string;
  @IsOptional() @IsString() @MaxLength(255) slogan?: string;
  @IsOptional() @IsString() @MaxLength(500) weekdayHours?: string;
  @IsOptional() @IsString() @MaxLength(500) saturdayHours?: string;
  @IsBoolean({ message: "active debe ser verdadero o falso." }) active!: boolean;
}

export class WebServiceInputDto {
  @IsOptional() @IsString() @MaxLength(2000) description?: string;
  @IsOptional() @optionalMedia("imageUrl") @MaxLength(255) imageUrl?: string;
  @IsBoolean({ message: "visibleOnWeb debe ser verdadero o falso." }) visibleOnWeb!: boolean;
  @Type(() => Number) @IsInt({ message: "webOrder debe ser entero." }) @Min(0) webOrder!: number;
}

export class WebProfessionalInputDto {
  @IsOptional() @IsString() @MaxLength(5000) publicProfile?: string;
  @IsOptional() @optionalMedia("photoUrl") @MaxLength(500) photoUrl?: string;
  @IsBoolean({ message: "visibleOnWeb debe ser verdadero o falso." }) visibleOnWeb!: boolean;
  @Type(() => Number) @IsInt({ message: "webOrder debe ser entero." }) @Min(0) webOrder!: number;
}

export class GalleryInputDto {
  @IsString() @MinLength(2) @MaxLength(150) title!: string;
  @IsOptional() @IsString() @MaxLength(2000) description?: string;
  @optionalMedia("imageUrl") @MaxLength(500) imageUrl!: string;
  @Type(() => Number) @IsInt({ message: "webOrder debe ser entero." }) @Min(0) webOrder!: number;
}

class PublicationInputDto {
  @IsString() @MinLength(2) @MaxLength(150) title!: string;
  @IsOptional() @IsString() @MaxLength(5000) description?: string;
  @Matches(DATE_ONLY, { message: "startDate debe usar el formato YYYY-MM-DD." }) startDate!: string;
  @Matches(DATE_ONLY, { message: "endDate debe usar el formato YYYY-MM-DD." }) endDate!: string;
  @IsOptional() @optionalMedia("imageUrl") @MaxLength(500) imageUrl?: string;
}

export class PromotionInputDto extends PublicationInputDto {}

export class AnnouncementStyleInputDto {
  @IsString() @MinLength(2) @MaxLength(100) name!: string;
  @Matches(HEX_COLOR, { message: "backgroundColor debe usar el formato #RRGGBB." }) backgroundColor!: string;
  @Matches(HEX_COLOR, { message: "textColor debe usar el formato #RRGGBB." }) textColor!: string;
  @IsOptional() @IsString() @MaxLength(100) icon?: string;
  @IsIn(POSITIONS, { message: "position no es una posición admitida." }) position!: AnnouncementPosition;
}

export class AnnouncementInputDto extends PublicationInputDto {
  @Type(() => Number) @IsInt() @Min(1) styleId!: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) promotionId?: number | null;
}

export class WebStatusInputDto {
  @IsBoolean({ message: "active debe ser verdadero o falso." }) active!: boolean;
}
