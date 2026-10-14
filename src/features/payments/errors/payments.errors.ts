/**
 * Errores de dominio del feature de Pagos (Stripe) - Vice City.
 */

export class PaymentError extends Error {
  readonly code: string;
  readonly statusCode: number;

  constructor(message: string, code: string, statusCode = 400) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.statusCode = statusCode;
  }
}

export class StripeNotConfiguredError extends PaymentError {
  constructor(
    message = "La pasarela de pagos no está configurada (falta STRIPE_SECRET_KEY). Configure las credenciales de Stripe en el archivo .env."
  ) {
    super(message, "STRIPE_NOT_CONFIGURED", 503);
  }
}

export class BookingNotFoundError extends PaymentError {
  constructor(message = "La reserva no existe") {
    super(message, "BOOKING_NOT_FOUND", 404);
  }
}

export class BookingNotPayableError extends PaymentError {
  constructor(message = "La reserva no está en estado pagable (debe estar pendiente y con el HOLD vigente)") {
    super(message, "BOOKING_NOT_PAYABLE", 409);
  }
}

export class ForbiddenBookingAccessError extends PaymentError {
  constructor(message = "No tienes permiso para pagar esta reserva") {
    super(message, "FORBIDDEN_BOOKING_ACCESS", 403);
  }
}

export class InvalidStripeSignatureError extends PaymentError {
  constructor(message = "La firma del webhook de Stripe no es válida") {
    super(message, "INVALID_STRIPE_SIGNATURE", 400);
  }
}

export class StripeOperationError extends PaymentError {
  constructor(message = "No se pudo completar la operación con Stripe") {
    super(message, "STRIPE_OPERATION_FAILED", 502);
  }
}