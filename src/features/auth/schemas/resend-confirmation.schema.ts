import { z } from "zod";

export const resendConfirmationSchema = z
  .object({
    email: z
      .string()
      .trim()
      .min(1, "El correo electrónico es obligatorio y no puede estar vacío")
      .email("El formato del correo electrónico es inválido")
      .toLowerCase(),
  })
  .strict();

export type ResendConfirmationInputSchema = z.infer<typeof resendConfirmationSchema>;
