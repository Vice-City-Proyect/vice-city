/**
 * FT-05 / HU23: Esquema Zod con .strict() para Creación de Payment Intent de Stripe
 */

import { z } from "zod";

export const createPaymentIntentSchema = z
  .object({
    bookingId: z
      .string()
      .min(1, "El bookingId es obligatorio.")
      .uuid("El bookingId debe ser un UUID válido."),
  })
  .strict();

export type CreatePaymentIntentInput = z.infer<typeof createPaymentIntentSchema>;

