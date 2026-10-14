/**
 * Esquema de Validación Zod con .strict() para Cálculo de Precios y Descuentos (HU22)
 * Vice City - Features: Pricing
 */

import { z } from "zod";

export const calculatePricingSchema = z
  .object({
    /** UUID del servicio a cotizar */
    serviceId: z
      .string()
      .min(1, "serviceId es obligatorio.")
      .uuid("serviceId debe ser un UUID válido."),
    /** Fecha de la reserva en formato YYYY-MM-DD */
    date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "date debe tener el formato YYYY-MM-DD."),
    /** Fecha y hora de inicio */
    startAt: z
      .string()
      .min(1, "startAt es obligatorio.")
      .refine((val) => !isNaN(Date.parse(val)), "startAt debe ser una fecha/hora válida."),
    /** Fecha y hora de finalización */
    endAt: z
      .string()
      .min(1, "endAt es obligatorio.")
      .refine((val) => !isNaN(Date.parse(val)), "endAt debe ser una fecha/hora válida."),
    /** Cantidad de cupos (por defecto 1) */
    quantity: z
      .number()
      .int("quantity debe ser un número entero.")
      .min(1, "La cantidad mínima es 1.")
      .optional()
      .default(1),
    /** Indicador opcional de reserva completa de piscina */
    isFullPool: z.boolean().optional(),
  })
  .strict();

export type CalculatePricingInput = z.infer<typeof calculatePricingSchema>;

