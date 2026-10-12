import { z } from "zod";

export const loginSchema = z
  .object({
    email: z
      .string()
      .trim()
      .min(1, "El correo electrónico es obligatorio y no puede estar vacío")
      .email("El formato del correo electrónico es inválido")
      .toLowerCase(),
    password: z
      .string()
      .trim()
      .min(1, "La contraseña es obligatoria y no puede estar vacía"),
  })
  .strict();

export type LoginInput = z.infer<typeof loginSchema>;
