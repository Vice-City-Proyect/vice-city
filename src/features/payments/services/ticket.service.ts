/**
 * Servicio de emisión de tickets digitales.
 * Vice City - Features: Payments
 *
 * Un ticket se emite ÚNICAMENTE cuando el pago fue confirmado.
 * Se ejecuta dentro de la transacción del webhook para garantizar atomicidad.
 */

import crypto from "crypto";

export interface CreateTicketInput {
  bookingId: string;
  holderName?: string | null;
  validFrom?: Date | null;
  validUntil?: Date | null;
  metadata?: Record<string, unknown>;
}

export interface TicketRecord {
  id: string;
  booking_id: string;
  code: string;
  status: string;
  valid_from?: Date | null;
  valid_until?: Date | null;
}

/**
 * Genera un código de ticket seguro (128 bits) y lo persiste.
 * @param tx Cliente de transacción de Prisma (o mock en pruebas)
 */
export async function createTicketForBooking(
  tx: any,
  input: CreateTicketInput
): Promise<TicketRecord> {
  const code = crypto.randomBytes(16).toString("hex");

  return tx.tickets.create({
    data: {
      booking_id: input.bookingId,
      code,
      holder_name: input.holderName ?? null,
      status: "valid",
      valid_from: input.validFrom ?? null,
      valid_until: input.validUntil ?? null,
      metadata: {
        issued_at: new Date().toISOString(),
        ...(input.metadata ?? {}),
      },
    },
  });
}