/**
 * Errores de Dominio para Reservas y Retención (HOLD) (HU21)
 * Vice City - Features: Reservations
 */

export class ReservationError extends Error {
  public readonly code: string;
  public readonly statusCode: number;

  constructor(message: string, code = "RESERVATION_ERROR", statusCode = 400) {
    super(message);
    this.name = "ReservationError";
    this.code = code;
    this.statusCode = statusCode;
    Object.setPrototypeOf(this, ReservationError.prototype);
  }
}

/**
 * Error de conflicto de aforo cuando no hay cupos suficientes disponibles (409 Conflict).
 * Criterio de Aceptación:
 * "Caso de error: reservar sin cupo devuelve un conflicto claro."
 */
export class SlotFullConflictError extends ReservationError {
  constructor(
    message = "No hay cupos suficientes disponibles para la franja seleccionada. El aforo está completo o ha sido retenido por otro cliente."
  ) {
    super(message, "SLOT_FULL_CONFLICT", 409);
    this.name = "SlotFullConflictError";
    Object.setPrototypeOf(this, SlotFullConflictError.prototype);
  }
}

/**
 * Error lanzado cuando la retención de 10 minutos ha expirado sin confirmación de pago (RN-011).
 */
export class HoldExpiredError extends ReservationError {
  constructor(
    message = "El tiempo de retención (10 minutos) ha expirado. El cupo ha sido liberado nuevamente."
  ) {
    super(message, "HOLD_EXPIRED", 410); // 410 Gone
    this.name = "HoldExpiredError";
    Object.setPrototypeOf(this, HoldExpiredError.prototype);
  }
}

/**
 * Error lanzado cuando la duración de la reserva es inválida (RN-009: mín 1h, máx 9h continuas).
 */
export class InvalidDurationError extends ReservationError {
  constructor(
    message = "La duración de la reserva debe ser de mínimo 1 hora y máximo 9 horas continuas."
  ) {
    super(message, "INVALID_DURATION", 400);
    this.name = "InvalidDurationError";
    Object.setPrototypeOf(this, InvalidDurationError.prototype);
  }
}

/**
 * Error lanzado cuando no se encuentra la reserva solicitada.
 */
export class BookingNotFoundError extends ReservationError {
  constructor(message = "No se encontró la reserva especificada.") {
    super(message, "BOOKING_NOT_FOUND", 404);
    this.name = "BookingNotFoundError";
    Object.setPrototypeOf(this, BookingNotFoundError.prototype);
  }
}

