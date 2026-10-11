import { z } from "zod";

export const resetPasswordSchema = z
  .object({
    token: z
      .string()
      .trim()
      .min(1, "El token de recuperación es obligatorio y no puede estar vacío"),
    newPassword: z
      .string()
      .min(8, "La nueva contraseña debe tener al menos 8 caracteres"),
  })
  .strict();

export const validateResetTokenSchema = z
  .object({
    token: z
      .string()
      .trim()
      .min(1, "El token de recuperación es obligatorio y no puede estar vacío"),
  })
  .strict();

export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type ValidateResetTokenInput = z.infer<typeof validateResetTokenSchema>;
