import { z } from "zod";

/**
 * Esquema para cambiar la contraseña del usuario autenticado (/api/users/me/password).
 * El máximo de 72 caracteres es el límite real de bcrypt (más allá se ignora).
 */
export const changePasswordSchema = z
  .object({
    current_password: z.string().min(1, "Ingresa tu contraseña actual").max(72),
    new_password: z
      .string()
      .min(8, "La nueva contraseña debe tener al menos 8 caracteres")
      .max(72, "La nueva contraseña no puede exceder 72 caracteres"),
  })
  .strict()
  .refine((data) => data.new_password !== data.current_password, {
    path: ["new_password"],
    message: "La nueva contraseña debe ser distinta a la actual",
  });

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
