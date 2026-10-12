/**
 * FT-06 / HU25: Esquema de Validación Zod con .strict() para Venta Presencial en POS
 */

import { z } from "zod";

export const posSaleSchema = z
  .object({
    /** UUID del empleado vendedor (rol TICKET_SELLER o ADMIN) */
    sellerId: z
      .string()
      .min(1, "El sellerId es obligatorio.")
      .uuid("El sellerId debe ser un UUID válido."),
    /** Nombre completo del cliente en taquilla */
    clientName: z
      .string()
      .min(2, "El nombre del cliente debe tener al menos 2 caracteres."),
    /** Cédula o documento de identificación */
    clientId: z
      .string()
      .min(4, "El documento de identificación (cédula) debe tener al menos 4 caracteres."),
    /** UUID del servicio solicitado */
    serviceId: z
      .string()
      .min(1, "El serviceId es obligatorio.")
      .uuid("El serviceId debe ser un UUID válido."),
    /** Fecha y hora de inicio de la franja (ISO 8601) */
    startAt: z
      .string()
      .min(1, "startAt es obligatorio.")
      .refine(
        (val) => !isNaN(Date.parse(val)),
        "startAt debe ser una fecha y hora ISO 8601 válida."
      ),
    /** Fecha y hora de finalización de la franja (ISO 8601) */
    endAt: z
      .string()
      .min(1, "endAt es obligatorio.")
      .refine(
        (val) => !isNaN(Date.parse(val)),
        "endAt debe ser una fecha y hora ISO 8601 válida."
      ),
    /** Cantidad de cupos o entradas (mínimo 1) */
    quantity: z
      .number()
      .int("La cantidad debe ser un número entero.")
      .min(1, "La cantidad mínima a vender es 1."),
    /** Método de pago presencial: efectivo o tarjeta */
    paymentMethod: z.enum(["cash", "card"], {
      message: "El método de pago debe ser 'cash' (efectivo) o 'card' (tarjeta).",
    }),
    /** Teléfono opcional del cliente */
    clientPhone: z.string().optional(),
    /** Correo opcional del cliente */
    clientEmail: z.string().email("El correo electrónico no es válido.").optional().or(z.literal("")),
    /** Notas adicionales de taquilla */
    notes: z.string().optional(),
    /** HU26: Aforo disponible registrado en la previsualización para detectar cambios concurrentes */
    previewAvailableCapacity: z.number().int().nonnegative().optional(),
    /** HU26: Clave de idempotencia para evitar venta duplicada por doble clic */
    idempotencyKey: z.string().optional(),
  })
  .strict();

export type PosSaleInput = z.infer<typeof posSaleSchema>;

