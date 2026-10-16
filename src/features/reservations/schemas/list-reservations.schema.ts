import { z } from "zod";
import { adminReservationsQuerySchema } from "./admin-reservations.schema";

const dateOnly = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "El formato de fecha debe ser YYYY-MM-DD");

/**
 * Query de GET /api/reservations (VCP-93).
 * Reutiliza paginación, estado y servicio del listado administrativo y agrega
 * el rango de fechas y el orden por fecha de inicio. No admite `search` ni `slot`.
 */
export const listReservationsQuerySchema = adminReservationsQuerySchema
  .omit({ search: true, slot: true, date: true })
  .extend({
    dateFrom: dateOnly.optional(),
    dateTo: dateOnly.optional(),
    order: z
      .string()
      .optional()
      .transform((val) => (val ? val.trim().toLowerCase() : "desc"))
      .pipe(z.enum(["asc", "desc"])),
  })
  .refine((data) => !data.dateFrom || !data.dateTo || data.dateFrom <= data.dateTo, {
    message: "dateFrom no puede ser posterior a dateTo",
    path: ["dateFrom"],
  });

export type ListReservationsQuery = z.infer<typeof listReservationsQuerySchema>;
