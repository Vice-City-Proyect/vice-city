import { z } from "zod";

/**
 * Esquema de validación estricto para el perfil o payload de Google OAuth (HU05-B)
 * Cumple con las directrices de validación defensiva y rechazo de campos adicionales (.strict()).
 */
export const googleProfileSchema = z
  .object({
    id: z
      .string({
        error: "El identificador único de Google (id o sub) es obligatorio",
      })
      .min(1, "El identificador de Google no puede estar vacío"),
    email: z
      .string({
        error: "El correo electrónico de Google es obligatorio",
      })
      .email("El formato del correo electrónico no es válido"),
    name: z.string().optional().nullable(),
    picture: z
      .string()
      .url("La URL de la imagen de Google debe ser válida")
      .optional()
      .nullable()
      .or(z.literal("")),
    email_verified: z.boolean().optional().default(true),
  })
  .strict();

export type GoogleProfileInput = z.infer<typeof googleProfileSchema>;

