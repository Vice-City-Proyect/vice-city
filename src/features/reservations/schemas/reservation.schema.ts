import { z } from "zod";

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