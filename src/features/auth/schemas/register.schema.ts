import { z } from "zod";

export const registerSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, "El nombre completo debe tener al menos 2 caracteres"),
  email: z
    .string()
    .trim()
    .email("El formato del correo electrónico es inválido")
    .toLowerCase(),
  password: z
    .string()
    .min(8, "La contraseña debe tener al menos 8 caracteres"),
});

export type RegisterSchemaInput = z.infer<typeof registerSchema>;

