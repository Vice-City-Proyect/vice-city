import { z } from "zod";

export const confirmEmailSchema = z
  .object({
    token: z
      .string()
      .trim()
      .min(1, "El token de confirmación es obligatorio y no puede estar vacío"),
  })
  .strict();

export type ConfirmEmailInputSchema = z.infer<typeof confirmEmailSchema>;
