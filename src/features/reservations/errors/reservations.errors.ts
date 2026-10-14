/**
 * Errores de dominio del feature de Reservas (Vice City).
 * Siguen la convención de response envelope: { success, error, message }.
 */

export class ReservationError extends Error {
  readonly code: string;
  readonly statusCode: number;

  constructor(message: string, code: string, statusCode = 400) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.statusCode = statusCode;
  }
}

export class ServiceNotFoundError extends ReservationError {
  constructor(message = "El servicio solicitado no existe") {
    super(message, "SERVICE_NOT_FOUND", 404);
  }
}

export class ServiceInactiveError extends ReservationError {
  constructor(message = "El servicio no se encuentra disponible para reserva") {
    super(message, "SERVICE_INACTIVE", 409);
  }
}

export class OperatingHoursError extends ReservationError {
  constructor(message = "La franja debe estar dentro del horario de operación (8:00 AM – 5:00 PM)") {
    super(message, "OPERATING_HOURS", 400);
  }
}

export class MaintenanceDayClosedError extends ReservationError {
  constructor(message = "El complejo permanece cerrado el día de mantenimiento") {
    super(message, "MAINTENANCE_DAY_CLOSED", 409);
  }
}

export class AdvanceWindowExceededError extends ReservationError {
  constructor(message = "La reserva supera el límite de días de anticipación permitido") {
    super(message, "ADVANCE_WINDOW_EXCEEDED", 400);
  }
}

export class DurationLimitError extends ReservationError {
  constructor(message = "La duración de la reserva debe ser entre 1 y 9 horas (horas enteras)") {
    super(message, "DURATION_LIMIT", 400);
  }
}

export class CapacityExceededError extends ReservationError {
  constructor(message = "No hay cupos disponibles para la cantidad solicitada") {
    super(message, "CAPACITY_EXCEEDED", 409);
  }
}

export class SlotUnavailableError extends ReservationError {
  constructor(message = "La franja solicitada ya no está disponible") {
    super(message, "SLOT_UNAVAILABLE", 409);
  }
}

export class BookingNotFoundError extends ReservationError {
  constructor(message = "La reserva no existe") {
    super(message, "BOOKING_NOT_FOUND", 404);
  }
}