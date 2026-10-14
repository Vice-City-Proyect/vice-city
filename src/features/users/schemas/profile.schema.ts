import { z } from "zod";

/**
 * Esquema de validación para actualizar la información personal del usuario autenticado (/api/users/me).
 * Soporta 'name' o 'full_name' y teléfono opcional.
 */
export const updateProfileSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, "El nombre debe tener al menos 2 caracteres")
      .max(100, "El nombre no puede exceder 100 caracteres")
      .optional(),
    full_name: z
      .string()
      .trim()
      .min(2, "El nombre debe tener al menos 2 caracteres")
      .max(100, "El nombre no puede exceder 100 caracteres")
      .optional(),
    phone: z
      .string()
      .trim()
      .max(25, "El teléfono no puede exceder 25 caracteres")
      .nullable()
      .optional(),
  })
  .strict();

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
