import { z } from "zod";

export const adminReservationsQuerySchema = z.object({
  page: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 1))
    .pipe(z.number().int().min(1)),
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 10))
    .pipe(z.number().int().min(1).max(100)),
  status: z
    .string()
    .optional()
    .transform((val) => (val ? val.trim().toUpperCase() : undefined))
    .pipe(
      z
        .enum([
          "ALL",
          "PENDING",
          "CONFIRMED",
          "IN_PROGRESS",
          "FINISHED",
          "CANCELLED",
          "EXPIRED",
        ])
        .optional()
    ),
  serviceId: z.string().uuid("serviceId debe ser un UUID válido").optional(),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "El formato de fecha debe ser YYYY-MM-DD")
    .optional(),
  slot: z
    .string()
    .regex(/^\d{2}:\d{2}$/, "El formato de franja debe ser HH:mm")
    .optional(),
  search: z.string().optional(),
});

export type AdminReservationsQueryParams = z.infer<
  typeof adminReservationsQuerySchema
>;

export const adminReservationIdSchema = z.object({
  id: z.string().uuid("El identificador de la reserva debe ser un UUID válido"),
});

export const updateAdminReservationSchema = z
  .object({
    status: z
      .enum(["PENDING", "CONFIRMED", "CANCELLED", "FINISHED", "IN_PROGRESS"])
      .optional(),
    cancellationReason: z.string().max(255).optional(),
    notes: z.string().max(500).optional().nullable(),
    date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "El formato de fecha debe ser YYYY-MM-DD")
      .optional(),
    startTime: z
      .string()
      .regex(/^\d{2}:\d{2}$/, "El formato de hora de inicio debe ser HH:mm")
      .optional(),
    endTime: z
      .string()
      .regex(/^\d{2}:\d{2}$/, "El formato de hora de fin debe ser HH:mm")
      .optional(),
    guests: z.number().int().min(1, "La cantidad de asistentes debe ser al menos 1").optional(),
  })
  .strict()
  .refine(
    (data) => {
      if (data.status === "CANCELLED") {
        return Boolean(data.cancellationReason && data.cancellationReason.trim().length >= 5);
      }
      return true;
    },
    {
      message: "El motivo de cancelación (cancellationReason) es obligatorio y debe tener al menos 5 caracteres al cancelar",
      path: ["cancellationReason"],
    }
  );

export type UpdateAdminReservationInput = z.infer<
  typeof updateAdminReservationSchema
>;
