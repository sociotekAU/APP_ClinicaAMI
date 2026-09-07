import { z } from "zod";

export const loginSchema = z.object({
  username: z.string().trim().min(1, "Ingrese su usuario.").max(80),
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres.").max(128),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(8, "Ingrese su contraseña actual.").max(128),
    newPassword: z
      .string()
      .min(12, "Use al menos 12 caracteres.")
      .max(128)
      .regex(/[a-z]/, "Incluya una letra minúscula.")
      .regex(/[A-Z]/, "Incluya una letra mayúscula.")
      .regex(/\d/, "Incluya un número.")
      .regex(/[^A-Za-z0-9]/, "Incluya un símbolo."),
    confirmPassword: z.string(),
  })
  .refine((values) => values.newPassword === values.confirmPassword, {
    message: "Las contraseñas no coinciden.",
    path: ["confirmPassword"],
  });

export type LoginValues = z.infer<typeof loginSchema>;
export type ChangePasswordValues = z.infer<typeof changePasswordSchema>;
