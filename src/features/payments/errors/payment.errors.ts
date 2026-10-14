/**
 * FT-05 / HU23: Errores de Dominio para Pagos y Stripe
 */

export class PaymentError extends Error {
  public readonly code: string;
  public readonly statusCode: number;

  constructor(message: string, code: string = "PAYMENT_ERROR", statusCode: number = 400) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.statusCode = statusCode;
  }
}

export class HoldExpiredPaymentError extends PaymentError {
  constructor(
    message: string = "La reserva ha expirado y el tiempo de retención (HOLD) de 10 minutos fue liberado. Debe iniciar una nueva reserva."
  ) {
    super(message, "HOLD_EXPIRED_PAYMENT", 410);
  }
}

export class BookingAlreadyPaidError extends PaymentError {
  constructor(message: string = "Esta reserva ya se encuentra confirmada y pagada.") {
    super(message, "BOOKING_ALREADY_PAID", 409);
  }
}

export class BookingNotFoundError extends PaymentError {
  constructor(message: string = "La reserva solicitada no existe.") {
    super(message, "BOOKING_NOT_FOUND", 404);
  }
}

export class BookingCancelledError extends PaymentError {
  constructor(message: string = "La reserva se encuentra cancelada y no puede ser pagada.") {
    super(message, "BOOKING_CANCELLED", 400);
  }
}

export class StripePaymentError extends PaymentError {
  constructor(message: string = "Ocurrió un error al comunicarse con la pasarela de pagos Stripe.") {
    super(message, "STRIPE_GATEWAY_ERROR", 502);
  }
}

