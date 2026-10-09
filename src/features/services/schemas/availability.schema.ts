/**
 * Esquemas de Validación Zod con .strict() (vice-city-api-contracts)
 * Vice City - Features: Services
 */

import { z } from "zod";

/**
 * Esquema de validación para la consulta de disponibilidad de un servicio.
 */
export const availabilityQuerySchema = z
  .object({
    /** ID único del servicio (UUID) */
    serviceId: z
      .string()
      .min(1, "El parámetro serviceId es obligatorio.")
      .uuid("El serviceId debe ser un UUID válido."),
    /** Fecha de la consulta en formato YYYY-MM-DD */
    date: z
      .string()
      .regex(
        /^\d{4}-\d{2}-\d{2}$/,
        "El parámetro date debe tener el formato YYYY-MM-DD."
      ),
  })
  .strict();

export type AvailabilityQueryParams = z.infer<typeof availabilityQuerySchema>;

/**
 * Esquema de validación para la consulta del catálogo público.
 */
export const catalogQuerySchema = z
  .object({
    /** Filtro opcional por categoría (UUID) */
    categoryId: z.string().uuid("El categoryId debe ser un UUID válido.").optional(),
    /** Indicador opcional para incluir servicios inactivos (solo administración) */
    includeInactive: z
      .enum(["true", "false"])
      .optional()
      .transform((val) => val === "true"),
  })
  .strict();

export type CatalogQueryParams = z.infer<typeof catalogQuerySchema>;
