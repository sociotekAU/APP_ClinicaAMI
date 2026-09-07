import { IsString, Matches, MaxLength, MinLength } from "class-validator";

const PASSWORD_POLICY = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).+$/;

export class ChangePasswordDto {
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  currentPassword!: string;

  @IsString()
  @MinLength(12)
  @MaxLength(128)
  @Matches(PASSWORD_POLICY, {
    message: "La nueva contraseña debe incluir mayúscula, minúscula, número y símbolo.",
  })
  newPassword!: string;
}
