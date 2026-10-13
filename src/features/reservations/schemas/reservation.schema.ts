/**
 * Esquemas de Validación Zod para Creación de Reservas y HOLD (HU21 / Web Reservations)
 * Vice City - Features: Reservations
 */

import { z } from "zod";

export const createHoldSchema = z
  .object({
    /** UUID del usuario que reserva */
    userId: z
      .string()
      .min(1, "El userId es obligatorio.")
      .uuid("El userId debe ser un UUID válido."),
    /** UUID del servicio a reservar */
    serviceId: z
      .string()
      .min(1, "El serviceId es obligatorio.")
      .uuid("El serviceId debe ser un UUID válido."),
    /** Fecha y hora de inicio en formato ISO 8601 */
    startAt: z
      .string()
      .min(1, "startAt es obligatorio.")
      .refine(
        (val) => !isNaN(Date.parse(val)),
        "startAt debe ser una fecha y hora ISO válida."
      ),
    /** Fecha y hora de fin en formato ISO 8601 */
    endAt: z
      .string()
      .min(1, "endAt es obligatorio.")
      .refine(
        (val) => !isNaN(Date.parse(val)),
        "endAt debe ser una fecha y hora ISO válida."
      ),
    /** Cantidad de cupos (por defecto 1) */
    quantity: z
      .number()
      .int("quantity debe ser un número entero.")
      .min(1, "La cantidad mínima a reservar es 1.")
      .max(50, "La cantidad máxima permitida por reserva es 50.")
      .optional()
      .default(1),
    /** Notas u observaciones opcionales */
    notes: z.string().max(500, "Las notas no pueden superar 500 caracteres.").optional(),
  })
  .strict();

export type CreateHoldInput = z.infer<typeof createHoldSchema>;

/**
 * Esquema de creación de una reserva web (POST /api/reservations).
 * El aforo y la modalidad se validan en el backend (pricing + availability).
 */
export const createReservationSchema = z.object({
  serviceId: z.string().min(1, "El servicio es obligatorio"),
  startAt: z.coerce.date("La fecha de inicio es obligatoria y debe ser válida"),
  endAt: z.coerce.date("La fecha de fin es obligatoria y debe ser válida"),
  quantity: z.number().int().min(1, "La cantidad debe ser al menos 1").default(1),
  scheduleId: z.string().min(1).nullable().optional(),
  notes: z.string().max(500, "Las notas no pueden exceder 500 caracteres").nullable().optional(),
});

export type CreateReservationInput = z.infer<typeof createReservationSchema>;
