import { z } from "zod";

export const forgotPasswordSchema = z
  .object({
    email: z
      .string()
      .trim()
      .min(1, "El correo electrónico es obligatorio y no puede estar vacío")
      .email("El formato del correo electrónico es inválido")
      .toLowerCase(),
  })
  .strict();

export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
