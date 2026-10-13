/**
 * FT-05 / HU24: Errores de Dominio para el Webhook de Stripe
 */

import { PaymentError } from "./payment.errors";

export class InvalidWebhookSignatureError extends PaymentError {
  constructor(message: string = "La firma del webhook de Stripe no es válida o está ausente.") {
    super(message, "INVALID_WEBHOOK_SIGNATURE", 400);
  }
}

export class WebhookBookingNotFoundError extends PaymentError {
  constructor(message: string = "No se encontró la reserva asociada al evento del webhook.") {
    super(message, "WEBHOOK_BOOKING_NOT_FOUND", 404);
  }
}

export class WebhookProcessingError extends PaymentError {
  constructor(message: string = "Error interno al procesar el evento del webhook de Stripe.") {
    super(message, "WEBHOOK_PROCESSING_ERROR", 500);
  }
}
