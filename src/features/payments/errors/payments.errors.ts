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

  static [Symbol.hasInstance](instance: unknown): boolean {
    return (
      instance !== null &&
      typeof instance === "object" &&
      (instance instanceof Error || "message" in instance) &&
      typeof (instance as any).code === "string" &&
      typeof (instance as any).statusCode === "number"
    );
  }
}

export class StripeNotConfiguredError extends PaymentError {
  constructor(
    message = "La pasarela de pagos no está configurada (falta STRIPE_SECRET_KEY). Configure las credenciales de Stripe en el archivo .env."
  ) {
    super(message, "STRIPE_NOT_CONFIGURED", 503);
  }

  static [Symbol.hasInstance](instance: unknown): boolean {
    return (
      Boolean(instance) &&
      typeof instance === "object" &&
      (instance as any).code === "STRIPE_NOT_CONFIGURED"
    );
  }
}

export class BookingNotFoundError extends PaymentError {
  constructor(message = "La reserva no existe") {
    super(message, "BOOKING_NOT_FOUND", 404);
  }

  static [Symbol.hasInstance](instance: unknown): boolean {
    return (
      Boolean(instance) &&
      typeof instance === "object" &&
      (instance as any).code === "BOOKING_NOT_FOUND"
    );
  }
}

export class BookingNotPayableError extends PaymentError {
  constructor(message = "La reserva no está en estado pagable (debe estar pendiente y con el HOLD vigente)") {
    super(message, "BOOKING_NOT_PAYABLE", 409);
  }

  static [Symbol.hasInstance](instance: unknown): boolean {
    return (
      Boolean(instance) &&
      typeof instance === "object" &&
      (instance as any).code === "BOOKING_NOT_PAYABLE"
    );
  }
}

export class ForbiddenBookingAccessError extends PaymentError {
  constructor(message = "No tienes permiso para pagar esta reserva") {
    super(message, "FORBIDDEN_BOOKING_ACCESS", 403);
  }

  static [Symbol.hasInstance](instance: unknown): boolean {
    return (
      Boolean(instance) &&
      typeof instance === "object" &&
      (instance as any).code === "FORBIDDEN_BOOKING_ACCESS"
    );
  }
}

export class InvalidStripeSignatureError extends PaymentError {
  constructor(message = "La firma del webhook de Stripe no es válida") {
    super(message, "INVALID_STRIPE_SIGNATURE", 400);
  }

  static [Symbol.hasInstance](instance: unknown): boolean {
    return (
      Boolean(instance) &&
      typeof instance === "object" &&
      (instance as any).code === "INVALID_STRIPE_SIGNATURE"
    );
  }
}

export class StripeOperationError extends PaymentError {
  constructor(message = "No se pudo completar la operación con Stripe") {
    super(message, "STRIPE_OPERATION_FAILED", 502);
  }

  static [Symbol.hasInstance](instance: unknown): boolean {
    return (
      Boolean(instance) &&
      typeof instance === "object" &&
      (instance as any).code === "STRIPE_OPERATION_FAILED"
    );
  }
}